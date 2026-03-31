const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let ioInstance = null;
/** Nombre de sockets actifs par utilisateur (plusieurs onglets) */
const socketCountByUser = new Map();

function extractToken(socket) {
    const fromAuth = socket.handshake?.auth?.token;
    if (fromAuth) return String(fromAuth);
    const authHeader = socket.handshake?.headers?.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
    return null;
}

function initRealtime(httpServer, corsOrigin) {
    if (ioInstance) return ioInstance;
    const io = new Server(httpServer, {
        cors: {
            origin: corsOrigin,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        try {
            const token = extractToken(socket);
            if (!token) return next(new Error('UNAUTHORIZED'));
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = { id: payload.id, email: payload.email, role: payload.role };
            return next();
        } catch {
            return next(new Error('UNAUTHORIZED'));
        }
    });

    io.on('connection', (socket) => {
        const uid = socket.user?.id;
        if (!uid) {
            socket.disconnect(true);
            return;
        }
        socket.join(`user:${uid}`);

        const prev = socketCountByUser.get(uid) || 0;
        socketCountByUser.set(uid, prev + 1);
        if (prev === 0) {
            io.emit('presence:online', { userId: uid });
        }
        const onlineIds = [...socketCountByUser.entries()]
            .filter(([, c]) => c > 0)
            .map(([id]) => id);
        socket.emit('presence:sync', { userIds: onlineIds });
        socket.emit('socket:ready', {
            socketId: socket.id,
            serverAt: Date.now(),
            userId: uid,
        });

        socket.on('meeting:join', (meetingId) => {
            if (meetingId) socket.join(`meeting:${meetingId}`);
        });
        socket.on('meeting:leave', (meetingId) => {
            if (meetingId) socket.leave(`meeting:${meetingId}`);
        });

        socket.on('disconnect', () => {
            const n = (socketCountByUser.get(uid) || 1) - 1;
            if (n <= 0) {
                socketCountByUser.delete(uid);
                io.emit('presence:offline', { userId: uid });
            } else {
                socketCountByUser.set(uid, n);
            }
        });
    });

    ioInstance = io;
    return ioInstance;
}

function getIO() {
    return ioInstance;
}

function emitToUser(userId, event, payload) {
    if (!ioInstance || !userId) return;
    ioInstance.to(`user:${userId}`).emit(event, payload);
}

function emitToUsers(userIds, event, payload) {
    if (!ioInstance || !Array.isArray(userIds)) return;
    const unique = [...new Set(userIds.filter(Boolean))];
    unique.forEach((uid) => emitToUser(uid, event, payload));
}

function emitToMeetingRoom(meetingId, event, payload) {
    if (!ioInstance || !meetingId) return;
    ioInstance.to(`meeting:${meetingId}`).emit(event, payload);
}

module.exports = { initRealtime, getIO, emitToUser, emitToUsers, emitToMeetingRoom };
