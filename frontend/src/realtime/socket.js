import { io } from 'socket.io-client';
import { API_BASE } from '../api/client';

let socketInstance = null;
let socketListenersBound = false;
const statusSubscribers = new Set();
const actionQueue = [];
let isFlushingQueue = false;

/**
 * État temps réel exposé aux composants.
 * `state` : source de vérité pour l’UI (libellés via getSocketStatusLabel).
 * `connected` / `reconnecting` / `connecting` : rétrocompatibilité avec l’existant.
 */
const socketStatus = {
    state: 'disconnected',
    connected: false,
    connecting: false,
    reconnecting: false,
    browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastDisconnectReason: null,
    lastErrorMessage: null,
    handshakeOk: false,
    socketId: null,
    transport: null,
    connectedAt: null,
    serverAt: null,
    reconnectAttempt: 0,
};

let browserListenersBound = false;

function bindBrowserOnline() {
    if (typeof window === 'undefined' || browserListenersBound) return;
    browserListenersBound = true;
    window.addEventListener('online', () => {
        socketStatus.browserOnline = true;
        emitStatus();
        if (socketInstance && !socketInstance.connected && socketInstance.auth?.token) {
            socketInstance.connect();
        }
    });
    window.addEventListener('offline', () => {
        socketStatus.browserOnline = false;
        emitStatus();
    });
}

function deriveFlags() {
    const s = socketStatus.state;
    socketStatus.connected = s === 'connected';
    socketStatus.connecting = s === 'connecting';
    socketStatus.reconnecting = s === 'reconnecting';
}

function socketUrl() {
    return API_BASE || window.location.origin;
}

function emitStatus() {
    deriveFlags();
    const snapshot = { ...socketStatus };
    statusSubscribers.forEach((cb) => {
        try {
            cb(snapshot);
        } catch {
            /* ignore */
        }
    });
}

function isNetworkError(err) {
    return !err?.response;
}

async function flushQueuedActions() {
    if (isFlushingQueue || !socketStatus.connected || actionQueue.length === 0) return;
    isFlushingQueue = true;
    try {
        while (actionQueue.length > 0 && socketStatus.connected) {
            const task = actionQueue[0];
            try {
                await task.run({ fromQueue: true });
                actionQueue.shift();
            } catch (err) {
                if (isNetworkError(err)) break;
                actionQueue.shift();
            }
        }
    } finally {
        isFlushingQueue = false;
    }
}

function setState(next) {
    if (socketStatus.state !== next) {
        socketStatus.state = next;
    }
    deriveFlags();
}

/** Libellé court FR pour le header / sidebar */
export function getSocketStatusLabel(status = socketStatus) {
    if (!status.browserOnline) return 'Navigateur hors ligne';
    switch (status.state) {
        case 'connected':
            return 'Temps réel connecté';
        case 'connecting':
            return 'Connexion au serveur…';
        case 'reconnecting':
            return status.reconnectAttempt > 0
                ? `Reconnexion (${status.reconnectAttempt})…`
                : 'Reconnexion…';
        case 'unauthorized':
            return 'Session invalide — reconnectez-vous';
        case 'failed':
            return 'Temps réel indisponible';
        default:
            return status.lastErrorMessage ? `Hors ligne (${status.lastErrorMessage})` : 'Hors ligne';
    }
}

/** Tooltip détaillé */
export function getSocketStatusDetail(status = socketStatus) {
    const parts = [];
    if (!status.browserOnline) parts.push('Pas de réseau sur cet appareil.');
    if (status.state === 'connected' && status.socketId) {
        parts.push(`Canal WebSocket actif (id: ${status.socketId.slice(0, 8)}…).`);
        if (status.transport) parts.push(`Transport : ${status.transport}.`);
        if (status.connectedAt) {
            parts.push(`Connecté depuis ${new Date(status.connectedAt).toLocaleTimeString('fr-FR')}.`);
        }
    }
    if (status.lastDisconnectReason && status.state !== 'connected') {
        parts.push(`Dernière coupure : ${status.lastDisconnectReason}.`);
    }
    if (status.lastErrorMessage && status.state !== 'connected') {
        parts.push(`Erreur : ${status.lastErrorMessage}`);
    }
    if (status.state === 'unauthorized') {
        parts.push('Le jeton a peut-être expiré.');
    }
    return parts.length ? parts.join(' ') : getSocketStatusLabel(status);
}

function bindSocketListeners() {
    if (!socketInstance || socketListenersBound) return;
    socketListenersBound = true;

    const mgr = socketInstance.io;

    mgr.on('open', () => {
        if (!socketInstance.connected) {
            setState('connecting');
            emitStatus();
        }
    });

    socketInstance.on('connect', () => {
        socketStatus.lastErrorMessage = null;
        socketStatus.lastDisconnectReason = null;
        socketStatus.reconnectAttempt = 0;
        socketStatus.socketId = socketInstance.id || null;
        socketStatus.transport = socketInstance.io.engine?.transport?.name || 'websocket';
        socketStatus.handshakeOk = true;
        setState('connected');
        socketStatus.connectedAt = Date.now();
        emitStatus();
        flushQueuedActions();
    });

    /** Métadonnées serveur (optionnel, renforce la confiance côté UI) */
    socketInstance.on('socket:ready', (payload) => {
        socketStatus.handshakeOk = true;
        if (payload?.socketId) socketStatus.socketId = payload.socketId;
        if (payload?.serverAt) socketStatus.serverAt = payload.serverAt;
        emitStatus();
    });

    socketInstance.on('connect_error', (err) => {
        socketStatus.connectedAt = null;
        socketStatus.handshakeOk = false;
        socketStatus.socketId = null;
        const msg = err?.message || 'connect_error';
        socketStatus.lastErrorMessage = msg;
        const unauthorized =
            /UNAUTHORIZED|jwt|token|401|forbidden/i.test(String(msg)) ||
            err?.data?.message === 'UNAUTHORIZED';
        if (unauthorized) {
            setState('unauthorized');
        } else {
            setState('reconnecting');
        }
        emitStatus();
    });

    socketInstance.on('disconnect', (reason) => {
        socketStatus.lastDisconnectReason = reason || 'disconnect';
        socketStatus.connectedAt = null;
        socketStatus.handshakeOk = false;
        socketStatus.socketId = null;
        const manual = reason === 'io client disconnect' || reason === 'io server disconnect';
        if (manual) {
            setState('disconnected');
            socketStatus.reconnectAttempt = 0;
        } else {
            setState('reconnecting');
        }
        emitStatus();
    });

    mgr.on('reconnect_attempt', (attempt) => {
        socketStatus.reconnectAttempt = typeof attempt === 'number' ? attempt : (socketStatus.reconnectAttempt || 0) + 1;
        setState('reconnecting');
        emitStatus();
    });

    mgr.on('reconnect', () => {
        socketStatus.reconnectAttempt = 0;
        socketStatus.lastErrorMessage = null;
        setState('connected');
        socketStatus.socketId = socketInstance.id || null;
        socketStatus.transport = socketInstance.io.engine?.transport?.name || null;
        socketStatus.connectedAt = Date.now();
        socketStatus.handshakeOk = true;
        emitStatus();
        flushQueuedActions();
    });

    mgr.on('reconnect_error', (err) => {
        socketStatus.lastErrorMessage = err?.message || 'reconnect_error';
        emitStatus();
    });

    mgr.on('reconnect_failed', () => {
        setState('failed');
        socketStatus.reconnecting = false;
        socketStatus.connected = false;
        socketStatus.lastErrorMessage = 'Échec après plusieurs tentatives de reconnexion';
        emitStatus();
    });

    mgr.on('close', (reason) => {
        if (!socketInstance.connected) {
            socketStatus.lastDisconnectReason = reason || 'close';
        }
        emitStatus();
    });

    if (socketInstance.connected) {
        socketStatus.socketId = socketInstance.id || null;
        socketStatus.transport = socketInstance.io.engine?.transport?.name || null;
        setState('connected');
        socketStatus.connectedAt = socketStatus.connectedAt || Date.now();
        emitStatus();
    }
}

export function getSocket(token) {
    bindBrowserOnline();
    if (!token) return null;

    if (socketInstance) {
        const current = socketInstance.auth?.token;
        if (current !== token) {
            socketInstance.auth = { token };
            if (!socketInstance.connected) {
                setState('connecting');
                emitStatus();
                socketInstance.connect();
            }
        }
        bindSocketListeners();
        return socketInstance;
    }

    setState('connecting');
    emitStatus();

    socketInstance = io(socketUrl(), {
        transports: ['websocket'],
        autoConnect: true,
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
    });
    bindSocketListeners();

    if (socketInstance.connected) {
        socketStatus.socketId = socketInstance.id || null;
        socketStatus.transport = socketInstance.io.engine?.transport?.name || null;
        setState('connected');
        socketStatus.connectedAt = Date.now();
        emitStatus();
    }

    return socketInstance;
}

export function subscribeSocketStatus(callback) {
    if (typeof callback !== 'function') return () => {};
    bindBrowserOnline();
    statusSubscribers.add(callback);
    deriveFlags();
    callback({ ...socketStatus });
    return () => statusSubscribers.delete(callback);
}

export function getSocketStatusSnapshot() {
    deriveFlags();
    return { ...socketStatus };
}

export function isSocketConnected() {
    deriveFlags();
    return Boolean(socketStatus.connected);
}

export function enqueueRealtimeTask(run, meta = {}) {
    if (typeof run !== 'function') return;
    actionQueue.push({ run, meta });
}

export function disconnectSocket() {
    if (!socketInstance) return;
    socketInstance.disconnect();
    socketInstance = null;
    socketListenersBound = false;
    socketStatus.handshakeOk = false;
    socketStatus.socketId = null;
    socketStatus.connectedAt = null;
    socketStatus.serverAt = null;
    socketStatus.reconnectAttempt = 0;
    socketStatus.lastErrorMessage = null;
    setState('disconnected');
    emitStatus();
}
