const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');

// Créer le dossier logs s'il n'existe pas
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  constructor(filename = 'app.log') {
    this.filepath = path.join(logsDir, filename);
    this.maxSize = 10 * 1024 * 1024; // 10MB
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  rotateIfNeeded() {
    if (!fs.existsSync(this.filepath)) return;

    const stats = fs.statSync(this.filepath);
    if (stats.size > this.maxSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const rotatedPath = this.filepath.replace('.log', `-${timestamp}.log`);
      fs.renameSync(this.filepath, rotatedPath);
    }
  }

  writeLog(level, action, message, data = {}) {
    this.rotateIfNeeded();

    const logEntry = {
      timestamp: this.getTimestamp(),
      level,
      action,
      message,
      data: Object.keys(data).length > 0 ? data : undefined,
    };

    const logLine = JSON.stringify(logEntry);
    fs.appendFileSync(this.filepath, logLine + '\n');

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        INFO: '\x1b[36m',
        WARN: '\x1b[33m',
        ERROR: '\x1b[31m',
        DEBUG: '\x1b[35m',
        SUCCESS: '\x1b[32m',
        RESET: '\x1b[0m',
      };

      const color = colors[level] || colors.INFO;
      console.log(
        `${color}[${level}]${colors.RESET} ${action}: ${message}`,
        data && Object.keys(data).length > 0 ? data : ''
      );
    }
  }

  info(action, message, data = {}) {
    this.writeLog('INFO', action, message, data);
  }

  warn(action, message, data = {}) {
    this.writeLog('WARN', action, message, data);
  }

  error(action, message, data = {}) {
    this.writeLog('ERROR', action, message, data);
  }

  debug(action, message, data = {}) {
    this.writeLog('DEBUG', action, message, data);
  }

  success(action, message, data = {}) {
    this.writeLog('SUCCESS', action, message, data);
  }

  // Log API requests
  logRequest(method, route, status, duration, userId = null) {
    const data = {
      method,
      route,
      status,
      duration: `${duration}ms`,
      userId,
    };
    this.info('API_REQUEST', `${method} ${route} - ${status}`, data);
  }

  // Log database operations
  logDatabase(operation, entity, entityId, success = true) {
    this.info(
      'DATABASE',
      `${operation} ${entity}${success ? ' - SUCCESS' : ' - FAILED'}`,
      { operation, entity, entityId }
    );
  }

  // Log authentication events
  logAuth(event, email, success = true) {
    this.warn('AUTH', `${event} - ${email} - ${success ? 'SUCCESS' : 'FAILED'}`, { email, event });
  }

  // Log errors with context
  logErrorWithContext(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join(' '),
      ...context,
    };
    this.error('ERROR', error.message, errorData);
  }

  // Get logs for dashboard
  getRecentLogs(limit = 100) {
    if (!fs.existsSync(this.filepath)) return [];

    const content = fs.readFileSync(this.filepath, 'utf-8');
    const logs = content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((log) => log !== null)
      .reverse()
      .slice(0, limit);

    return logs;
  }

  // Get logs by level
  getLogsByLevel(level, limit = 100) {
    return this.getRecentLogs(limit * 2).filter((log) => log.level === level);
  }

  // Get logs by action
  getLogsByAction(action, limit = 100) {
    return this.getRecentLogs(limit * 2).filter((log) => log.action === action);
  }

  // Clear old logs (older than days)
  clearOldLogs(days = 30) {
    const files = fs.readdirSync(logsDir);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filepath = path.join(logsDir, file);
      const stats = fs.statSync(filepath);
      if (stats.mtime.getTime() < cutoff) {
        fs.unlinkSync(filepath);
      }
    });
  }
}

// Créer une instance globale
const logger = new Logger('application.log');
const auditLogger = new Logger('audit.log');
const errorLogger = new Logger('errors.log');

module.exports = { logger, auditLogger, errorLogger };
