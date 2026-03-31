const { logger } = require('../utils/logger');

const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    const logData = {
      method: req.method,
      path: req.path,
      status,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'anonymous',
    };

    if (status >= 500) {
      logger.error('HTTP_REQUEST', `${req.method} ${req.path} - ${status}`, logData);
    } else if (status >= 400) {
      logger.warn('HTTP_REQUEST', `${req.method} ${req.path} - ${status}`, logData);
    } else {
      logger.info('HTTP_REQUEST', `${req.method} ${req.path} - ${status}`, logData);
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
};

const errorLoggingMiddleware = (err, req, res, next) => {
  const errorData = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    message: err.message,
    stack: err.stack?.split('\n').slice(0, 3).join(' '),
  };

  logger.error('UNHANDLED_ERROR', err.message, errorData);

  res.status(err.status || 500).json({
    error: err.message,
    status: err.status || 500,
  });
};

module.exports = { requestLoggingMiddleware, errorLoggingMiddleware };
