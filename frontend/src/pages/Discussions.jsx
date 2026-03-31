import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Badge, Button, Empty, Input, Popconfirm, Segmented, Spin, Tooltip, Upload } from 'antd';
import {
    DeleteOutlined, PaperClipOutlined, SendOutlined, CloseOutlined,
    SearchOutlined, ArrowLeftOutlined, CheckOutlined, ClockCircleOutlined,
    WarningOutlined, FileOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import UserAvatar from '../components/UserAvatar';
import { isPrivilegedAdmin, isSuperAdmin } from '../utils/roles';
import {
    getSocket, getSocketStatusSnapshot, subscribeSocketStatus, getSocketStatusLabel, getSocketStatusDetail,
} from '../realtime/socket';

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.locale('fr');

// ── Offline storage ───────────────────────────────────────────────
const OUTBOX_KEY       = 'directMessagesOutboxV1';
const FILE_OUTBOX_DB   = 'directMessagesOfflineDB';
const FILE_OUTBOX_STORE = 'fileOutbox';
const MAX_UPLOAD_BATCH = 5;

function readOutbox() {
    try { const r = localStorage.getItem(OUTBOX_KEY); return Array.isArray(JSON.parse(r)) ? JSON.parse(r) : []; }
    catch { return []; }
}
function writeOutbox(items) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items)); } catch {}
}
function openFileDb() {
    return new Promise((resolve, reject) => {
        const req = window.indexedDB.open(FILE_OUTBOX_DB, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(FILE_OUTBOX_STORE))
                req.result.createObjectStore(FILE_OUTBOX_STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}
async function fileOutboxPut(item) {
    const db = await openFileDb();
    await new Promise((res, rej) => {
        const tx = db.transaction(FILE_OUTBOX_STORE, 'readwrite');
        tx.objectStore(FILE_OUTBOX_STORE).put(item);
        tx.oncomplete = res; tx.onerror = rej;
    });
    db.close();
}
async function fileOutboxDelete(id) {
    const db = await openFileDb();
    await new Promise((res, rej) => {
        const tx = db.transaction(FILE_OUTBOX_STORE, 'readwrite');
        tx.objectStore(FILE_OUTBOX_STORE).delete(id);
        tx.oncomplete = res; tx.onerror = rej;
    });
    db.close();
}
async function fileOutboxGetAll() {
    const db = await openFileDb();
    const items = await new Promise((res, rej) => {
        const tx = db.transaction(FILE_OUTBOX_STORE, 'readonly');
        const r = tx.objectStore(FILE_OUTBOX_STORE).getAll();
        r.onsuccess = () => res(r.result || []); r.onerror = rej;
    });
    db.close();
    return items;
}

// ── Helpers visuels ───────────────────────────────────────────────
function dateSeparatorLabel(dateStr) {
    const d = dayjs(dateStr);
    if (d.isToday())     return "Aujourd'hui";
    if (d.isYesterday()) return 'Hier';
    return d.format('dddd D MMMM YYYY');
}

function MessageTicks({ m, ui }) {
    if (m._failed)    return <WarningOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />;
    if (m._queued || m._optimistic) return <ClockCircleOutlined style={{ color: ui.textMuted, fontSize: 11 }} />;
    if (m.isRead)     return <span style={{ color: '#53bdeb', fontSize: 12, fontWeight: 700, letterSpacing: -2 }}>✓✓</span>;
    return <span style={{ color: ui.textMuted, fontSize: 12, letterSpacing: -2 }}>✓</span>;
}

function getFileExt(fileName = '') {
    const idx = String(fileName).lastIndexOf('.');
    return idx >= 0 ? String(fileName).slice(idx + 1).toLowerCase() : '';
}

function isImageAttachment(m) {
    const mt = String(m?.mimeType || '').toLowerCase();
    const ext = getFileExt(m?.fileName || '');
    return mt.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
}

function isPdfAttachment(m) {
    const mt = String(m?.mimeType || '').toLowerCase();
    const ext = getFileExt(m?.fileName || '');
    return mt === 'application/pdf' || ext === 'pdf';
}

function isWordAttachment(m) {
    const mt = String(m?.mimeType || '').toLowerCase();
    const ext = getFileExt(m?.fileName || '');
    return mt.includes('msword')
        || mt.includes('officedocument.wordprocessingml.document')
        || ['doc', 'docx'].includes(ext);
}

function MessageBubble({ m, mine, onReply, onDelete, onRetry, canModerate, hideReply, ui }) {
    const fileHref = m.fileUrl ? `${API_BASE}${m.fileUrl}` : null;
    const imageFile = isImageAttachment(m);
    const pdfFile = isPdfAttachment(m);
    const wordFile = isWordAttachment(m);

    return (
        <div style={{
            display: 'flex',
            justifyContent: mine ? 'flex-end' : 'flex-start',
            marginBottom: 2,
            paddingLeft: mine ? '15%' : 0,
            paddingRight: mine ? 0 : '15%',
        }}>
            {/* Avatar (theirs only) */}
            {!mine && (
                <div style={{ alignSelf: 'flex-end', marginRight: 6, flexShrink: 0 }}>
                    <UserAvatar user={m.sender} size={28} />
                </div>
            )}

            {/* Bubble */}
            <div
                style={{
                    background: mine ? ui.bubbleMineBg : ui.bubbleOtherBg,
                    borderRadius: mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '6px 10px 4px',
                    maxWidth: '100%',
                    boxShadow: ui.bubbleShadow,
                    position: 'relative',
                    opacity: m._optimistic || m._queued ? 0.75 : 1,
                }}
            >
                {/* Sender name (theirs) */}
                {!mine && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: ui.accent, marginBottom: 2 }}>
                        {m.sender?.name || 'Utilisateur'}
                    </div>
                )}

                {/* Reply quote */}
                {m.parent && (
                    <div style={{
                        background: mine ? ui.quoteMineBg : ui.quoteOtherBg,
                        borderLeft: `3px solid ${ui.accent}`,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginBottom: 4,
                        fontSize: 12,
                    }}>
                        <div style={{ fontWeight: 600, color: ui.accent, fontSize: 11 }}>
                            {m.parent.sender?.name || 'Message'}
                        </div>
                        <div style={{ color: ui.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.parent.body || m.parent.fileName || 'Fichier'}
                        </div>
                    </div>
                )}

                {/* Body */}
                {m.body && (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.4 }}>
                        {m.body}
                    </div>
                )}

                {/* File attachment */}
                {(m.fileName || fileHref) && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, flexDirection: 'column',
                        background: mine ? ui.quoteMineBg : ui.quoteOtherBg,
                        borderRadius: 6, padding: '6px 8px', marginTop: m.body ? 4 : 0, width: '100%',
                    }}>
                        {imageFile && fileHref && (
                            <a href={fileHref} target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
                                <img
                                    src={fileHref}
                                    alt={m.fileName || 'Image jointe'}
                                    style={{
                                        width: '100%',
                                        maxWidth: 280,
                                        maxHeight: 240,
                                        objectFit: 'cover',
                                        borderRadius: 8,
                                        display: 'block',
                                        margin: '0 auto',
                                    }}
                                />
                            </a>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                            <FileOutlined style={{ fontSize: 18, color: ui.fileColor, flexShrink: 0 }} />
                            {fileHref ? (
                                <a href={fileHref} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 13, color: ui.fileColor, textDecoration: 'underline', flex: 1, minWidth: 0 }}>
                                    {m.fileName || 'Fichier joint'}
                                </a>
                            ) : (
                                <span style={{ fontSize: 13, color: ui.textSecondary, flex: 1 }}>{m.fileName || 'Fichier (envoi en cours…)'}</span>
                            )}
                        </div>

                        {(pdfFile || wordFile) && fileHref && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <Button size="small" onClick={() => window.open(fileHref, '_blank', 'noopener,noreferrer')}>
                                    Afficher
                                </Button>
                                <a href={fileHref} target="_blank" rel="noopener noreferrer" download={m.fileName || true}>
                                    <Button size="small" type="link">Télécharger</Button>
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Retry failed */}
                {m._failed && (
                    <div style={{ marginTop: 4 }}>
                        <button
                            onClick={() => onRetry(m)}
                            style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 12, padding: 0 }}
                        >
                            Échec — Réessayer
                        </button>
                    </div>
                )}

                {/* Meta: time + ticks */}
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                    gap: 3, marginTop: 2, marginBottom: -1,
                }}>
                    <span style={{ fontSize: 11, color: ui.textMuted, whiteSpace: 'nowrap' }}>
                        {dayjs(m.createdAt).format('HH:mm')}
                    </span>
                    {mine && <MessageTicks m={m} ui={ui} />}
                </div>
            </div>

            {/* Actions (hover reveal via group) */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 2,
                marginLeft: mine ? 0 : 4, marginRight: mine ? 4 : 0,
                alignSelf: 'flex-end',
                flexDirection: mine ? 'row-reverse' : 'row',
            }}>
                <Tooltip title={hideReply ? '' : 'Répondre'}>
                    <button
                        onClick={() => !hideReply && onReply(m)}
                        style={{
                            background: ui.actionBtnBg, border: 'none', borderRadius: '50%',
                            width: 26, height: 26, cursor: hideReply ? 'default' : 'pointer', display: hideReply ? 'none' : 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 11, color: ui.textSecondary,
                        }}
                    >
                        ↩
                    </button>
                </Tooltip>
                {(mine || canModerate) && (
                    <Popconfirm
                        title="Supprimer ?" okText="Oui" cancelText="Non"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(m.id)}
                    >
                        <button style={{
                            background: ui.actionBtnBg, border: 'none', borderRadius: '50%',
                            width: 26, height: 26, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#ff4d4f',
                        }}>
                            <DeleteOutlined style={{ fontSize: 11 }} />
                        </button>
                    </Popconfirm>
                )}
            </div>
        </div>
    );
}

// ── Composant principal ───────────────────────────────────────────
export default function Discussions() {
    const { user }    = useAuth();
    const { isDark } = useThemeMode();
    const { message, notification } = App.useApp();

    const [enabled,         setEnabled]         = useState(true);
    const [loading,         setLoading]         = useState(true);
    const [users,           setUsers]           = useState([]);
    const [conversations,   setConversations]   = useState([]);
    const [selectedUserId,  setSelectedUserId]  = useState(null);
    const [messages,        setMessages]        = useState([]);
    const [sending,         setSending]         = useState(false);
    const [text,            setText]            = useState('');
    const [search,          setSearch]          = useState('');
    const [uploading,       setUploading]       = useState(false);
    const [replyingTo,      setReplyingTo]      = useState(null);
    const [retryFileTarget, setRetryFileTarget] = useState(null);
    const [socketStatus, setSocketStatus] = useState(() => getSocketStatusSnapshot());
    const [onlineUserIds,   setOnlineUserIds]   = useState(() => new Set());
    const [isDesktopLayout, setIsDesktopLayout] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
    );
    const [mobileChat,      setMobileChat]      = useState(false); // vue mobile
    /** Super admin : bascule liste personnelle / audit de toutes les conversations */
    const [dmMode, setDmMode] = useState('mine');
    const [auditConversations, setAuditConversations] = useState([]);
    const [auditSelection, setAuditSelection] = useState(null);
    const [auditListLoading, setAuditListLoading] = useState(false);

    const listRef                 = useRef(null);
    const inputRef                = useRef(null);
    const isFlushingOutboxRef     = useRef(false);
    const isFlushingFileOutboxRef = useRef(false);
    /** Évite les doublons popup (socket + polling) */
    const incomingPopupShownRef   = useRef(new Set());
    /** Messages déjà connus pour la conversation courante (pas de popup sur l’historique) */
    const seenDmMessageIdsRef     = useRef(new Set());
    const selectedUserIdRef       = useRef(selectedUserId);
    const userIdRef               = useRef(user?.id);
    const usersRef                = useRef(users);

    useEffect(() => { selectedUserIdRef.current = selectedUserId; }, [selectedUserId]);
    useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
    useEffect(() => { usersRef.current = users; }, [users]);

    // ── Message helpers ───────────────────────────────────────────
    const upsertMessages = (incoming) => {
        if (!incoming?.length) return;
        setMessages((prev) => {
            const byId = new Map(prev.map((m) => [m.id, m]));
            incoming.forEach((m) => { if (m?.id) byId.set(m.id, { ...(byId.get(m.id) || {}), ...m }); });
            return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
    };
    const removeMessageById = (id)    => setMessages((p) => p.filter((m) => m.id !== id));
    const patchMessageById  = (id, patch) => setMessages((p) => p.map((m) => m.id === id ? { ...m, ...patch } : m));
    const isFailedFileMsg   = (m)     => Boolean(m?._failed && m?.fileName && !m?.fileUrl);

    const notifyIncomingDirectMessage = (msg, peerName) => {
        if (!msg?.id || msg.senderId === user?.id) return;
        if (document.visibilityState !== 'visible') return;
        if (incomingPopupShownRef.current.has(msg.id)) return;
        incomingPopupShownRef.current.add(msg.id);
        if (incomingPopupShownRef.current.size > 300) incomingPopupShownRef.current.clear();

        const preview = (msg.body || msg.fileName || 'Nouveau message').slice(0, 160);
        notification.open({
            key: `dm-in-${msg.id}`,
            message: peerName ? `Message de ${peerName}` : 'Nouveau message',
            description: preview,
            placement: 'topRight',
            duration: 5,
        });
    };

    // ── Flush offline outbox ──────────────────────────────────────
    const flushOutbox = async () => {
        if (isFlushingOutboxRef.current) return;
        const outbox = readOutbox();
        if (!outbox.length) return;
        isFlushingOutboxRef.current = true;
        try {
            let remaining = [...outbox];
            let sentCount = 0;
            while (remaining.length > 0) {
                const item = remaining[0];
                try {
                    const { data: created } = await api.post(`/direct-messages/${item.targetUserId}`, { body: item.body, parentId: item.parentId || null });
                    removeMessageById(item.tempId);
                    upsertMessages([created]);
                    remaining.shift(); writeOutbox(remaining);
                    sentCount += 1;
                } catch (err) {
                    if (!err?.response) break;
                    patchMessageById(item.tempId, { _optimistic: false, _queued: false, _failed: true });
                    remaining.shift(); writeOutbox(remaining);
                }
            }
            if (sentCount > 0 && document.visibilityState === 'visible') {
                message.success(sentCount > 1 ? `${sentCount} messages envoyés.` : 'Message envoyé.');
            }
            api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
        } finally { isFlushingOutboxRef.current = false; }
    };

    const flushFileOutbox = async () => {
        if (isFlushingFileOutboxRef.current) return;
        isFlushingFileOutboxRef.current = true;
        try {
            const queued = await fileOutboxGetAll();
            if (!queued.length) return;
            let fileSent = 0;
            for (const item of [...queued].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))) {
                try {
                    const fd = new FormData();
                    fd.append('file', new File([item.blob], item.fileName || 'fichier', { type: item.mimeType || 'application/octet-stream' }));
                    if (item.body)     fd.append('body', item.body);
                    if (item.parentId) fd.append('parentId', item.parentId);
                    const { data: created } = await api.post(`/direct-messages/${item.targetUserId}/file`, fd);
                    removeMessageById(item.tempId); upsertMessages([created]); await fileOutboxDelete(item.id);
                    fileSent += 1;
                } catch (err) {
                    if (!err?.response) break;
                    patchMessageById(item.tempId, { _optimistic: false, _queued: false, _failed: true });
                    await fileOutboxDelete(item.id);
                }
            }
            if (fileSent > 0 && document.visibilityState === 'visible') {
                message.success(fileSent > 1 ? `${fileSent} fichiers envoyés.` : 'Fichier envoyé.');
            }
            api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
        } finally { isFlushingFileOutboxRef.current = false; }
    };

    // ── Dérivés ───────────────────────────────────────────────────
    const convMap = useMemo(() => {
        const m = new Map(); conversations.forEach((c) => m.set(c.user?.id, c)); return m;
    }, [conversations]);

    const selectedUser   = useMemo(() => users.find((u) => u.id === selectedUserId) || null, [users, selectedUserId]);
    const filteredUsers  = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? users.filter((u) => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) : users;
    }, [users, search]);

    // ── Effects socket / init ─────────────────────────────────────
    useEffect(() => {
        const unsub = subscribeSocketStatus((s) => setSocketStatus({ ...s }));
        return unsub;
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const apply = () => setIsDesktopLayout(mq.matches);
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        if (!enabled || !user?.id) return undefined;
        const token = localStorage.getItem('accessToken');
        const socket = getSocket(token);
        const onOnline = ({ userId }) => {
            if (!userId) return;
            setOnlineUserIds((prev) => new Set(prev).add(userId));
        };
        const onOffline = ({ userId }) => {
            if (!userId) return;
            setOnlineUserIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        };
        const onSync = ({ userIds }) => {
            if (Array.isArray(userIds)) setOnlineUserIds(new Set(userIds));
        };
        socket?.on('presence:online', onOnline);
        socket?.on('presence:offline', onOffline);
        socket?.on('presence:sync', onSync);
        return () => {
            socket?.off('presence:online', onOnline);
            socket?.off('presence:offline', onOffline);
            socket?.off('presence:sync', onSync);
        };
    }, [enabled, user?.id]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [{ data: pub }, { data: usrs }, { data: convs }] = await Promise.all([
                    api.get('/admin/settings/public'),
                    api.get('/direct-messages/users'),
                    api.get('/direct-messages/conversations'),
                ]);
                if (!active) return;
                setEnabled(String(pub?.direct_messages_enabled ?? 'true') === 'true');
                setUsers(usrs || []);
                setConversations(convs || []);
                if ((usrs || []).length > 0) {
                    const preferred = (convs || [])[0]?.user?.id || usrs[0].id;
                    setSelectedUserId(preferred);
                }
            } catch (err) {
                if (err?.response?.data?.error?.includes('désactivée')) setEnabled(false);
                else message.error('Impossible de charger la messagerie.');
            } finally { if (active) setLoading(false); }
        })();
        return () => { active = false; };
    }, []); // eslint-disable-line

    const fetchConv = async (uid) => {
        if (!enabled || !uid) return;
        try {
            const [{ data }, { data: convs }] = await Promise.all([
                api.get(`/direct-messages/${uid}`),
                api.get('/direct-messages/conversations'),
            ]);
            const msgs = data?.messages || [];
            const peerName = users.find((u) => u.id === uid)?.name || '';

            setMessages(() => {
                if (seenDmMessageIdsRef.current.size === 0) {
                    msgs.forEach((m) => { if (m?.id) seenDmMessageIdsRef.current.add(m.id); });
                    return msgs;
                }
                for (const m of msgs) {
                    if (!m?.id) continue;
                    if (!seenDmMessageIdsRef.current.has(m.id) && m.senderId && m.senderId !== user?.id) {
                        notifyIncomingDirectMessage(m, peerName);
                    }
                    seenDmMessageIdsRef.current.add(m.id);
                }
                return msgs;
            });
            setConversations(convs || []);
        } catch (err) {
            if (err?.response?.data?.error?.includes('désactivée')) { setEnabled(false); return; }
            message.error('Erreur chargement messages');
        }
    };

    useEffect(() => {
        seenDmMessageIdsRef.current = new Set();
        incomingPopupShownRef.current = new Set();
    }, [selectedUserId]);

    useEffect(() => { fetchConv(selectedUserId); }, [enabled, selectedUserId]); // eslint-disable-line

    useEffect(() => {
        if (!enabled || !user?.id) return undefined;
        const token = localStorage.getItem('accessToken');
        const socket = getSocket(token);
        if (!socket) return undefined;

        const onNew = (payload) => {
            const msg = payload?.message;
            if (!msg?.id) {
                api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
                return;
            }
            const sel = selectedUserIdRef.current;
            const me = userIdRef.current;
            const inOpenThread = Boolean(sel && me)
                && [msg.senderId, msg.receiverId].includes(sel)
                && [msg.senderId, msg.receiverId].includes(me);
            if (inOpenThread) {
                seenDmMessageIdsRef.current.add(msg.id);
                upsertMessages([msg]);
                if (msg.senderId && msg.senderId !== me) {
                    const peerName = usersRef.current.find((u) => u.id === sel)?.name || '';
                    notifyIncomingDirectMessage(msg, peerName);
                }
            }
            api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
        };

        const onRead = (payload) => {
            const ids = Array.isArray(payload?.messageIds) ? payload.messageIds : [];
            if (ids.length) setMessages((p) => p.map((m) => ids.includes(m.id) ? { ...m, isRead: true } : m));
            api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
        };

        /** Après reconnexion WS : rattraper les messages manqués pendant la coupure */
        const onReconnect = () => {
            const sel = selectedUserIdRef.current;
            if (sel) fetchConv(sel);
            else api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
        };

        socket.on('direct:message:new', onNew);
        socket.on('direct:messages:read', onRead);
        socket.on('connect', onReconnect);

        const pollMs = 25000;
        const t = setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            const sel = selectedUserIdRef.current;
            if (sel) fetchConv(sel);
        }, pollMs);

        return () => {
            socket.off('direct:message:new', onNew);
            socket.off('direct:messages:read', onRead);
            socket.off('connect', onReconnect);
            clearInterval(t);
        };
    }, [enabled, user?.id]); // écouteurs stables : selectedUserId via ref

    useEffect(() => {
        if (!enabled) return;
        const outbox = readOutbox();
        if (outbox.length) {
            upsertMessages(outbox.map((x) => ({
                id: x.tempId, senderId: user?.id, receiverId: x.targetUserId, body: x.body,
                createdAt: x.createdAt || new Date().toISOString(), isRead: false,
                sender: { id: user?.id, name: user?.name || 'Vous', email: user?.email || '', avatarUrl: user?.avatarUrl || null },
                _optimistic: false, _queued: true, _failed: false, _retry: { body: x.body, parentId: x.parentId || null },
            })));
        }
        fileOutboxGetAll().then((q) => {
            if (!q.length) return;
            upsertMessages(q.map((x) => ({
                id: x.tempId, senderId: user?.id, receiverId: x.targetUserId,
                body: x.body || null, fileName: x.fileName || 'Fichier joint', fileUrl: null,
                createdAt: x.createdAt || new Date().toISOString(), isRead: false,
                sender: { id: user?.id, name: user?.name || 'Vous', email: user?.email || '', avatarUrl: user?.avatarUrl || null },
                _optimistic: false, _queued: true, _failed: false,
            })));
        }).catch(() => {});
        const onOnline = () => { flushOutbox(); flushFileOutbox(); };
        window.addEventListener('online', onOnline);
        if (socketStatus.connected || navigator.onLine) { flushOutbox(); flushFileOutbox(); }
        return () => window.removeEventListener('online', onOnline);
    }, [enabled, socketStatus.connected, user?.id]); // eslint-disable-line

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, selectedUserId]);

    // ── Envoi message (HTTP : indépendant du WebSocket ; destinataire hors ligne = OK côté serveur) ──
    const sendMessage = async () => {
        const body = text.trim();
        if (!body || !selectedUserId) return;
        const targetUserId = selectedUserId;
        const parentId     = replyingTo?.id || null;
        const tempId       = `tmp-dm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempMsg = {
            id: tempId, senderId: user?.id, receiverId: targetUserId, body,
            createdAt: new Date().toISOString(), isRead: false,
            sender: { id: user?.id, name: user?.name || 'Vous', email: user?.email || '', avatarUrl: user?.avatarUrl || null },
            receiver: selectedUser || null, parent: replyingTo || null,
            _optimistic: true, _queued: false, _failed: false, _retry: { body, parentId },
        };
        upsertMessages([tempMsg]);
        setText(''); setReplyingTo(null); setSending(true);
        inputRef.current?.focus();

        const runSend = async ({ fromQueue = false } = {}) => {
            try {
                const { data: created } = await api.post(`/direct-messages/${targetUserId}`, { body, parentId });
                removeMessageById(tempId);
                upsertMessages([created]);
                const ob = readOutbox().filter((x) => x.tempId !== tempId);
                writeOutbox(ob);
                api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
            } catch (err) {
                if (!err?.response) {
                    patchMessageById(tempId, { _optimistic: false, _queued: true, _failed: false });
                    const outbox = readOutbox();
                    if (!outbox.some((x) => x.tempId === tempId)) {
                        outbox.push({ tempId, targetUserId, body, parentId, createdAt: tempMsg.createdAt });
                        writeOutbox(outbox);
                    }
                    if (!fromQueue) message.info('Sans réseau : message en attente — envoi automatique à la reconnexion.');
                    return;
                }
                patchMessageById(tempId, { _optimistic: false, _queued: false, _failed: true });
                if (!fromQueue) message.error(err.response?.data?.error || 'Erreur envoi message');
            }
        };

        try {
            await runSend();
        } finally {
            setSending(false);
        }
    };

    const retryMessage = async (m) => {
        if (!m?._retry) return;
        if (isFailedFileMsg(m)) { setRetryFileTarget(m); return; }
        const tid = m.receiverId || selectedUserId;
        if (!tid) return;
        patchMessageById(m.id, { _optimistic: true, _queued: false, _failed: false });
        const run = async ({ fromQueue = false } = {}) => {
            try {
                const { data: created } = await api.post(`/direct-messages/${tid}`, m._retry);
                removeMessageById(m.id);
                upsertMessages([created]);
                const ob = readOutbox().filter((x) => x.tempId !== m.id);
                writeOutbox(ob);
                api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
            } catch (err) {
                if (!err?.response) {
                    patchMessageById(m.id, { _optimistic: false, _queued: true, _failed: false });
                    const outbox = readOutbox();
                    if (!outbox.some((x) => x.tempId === m.id)) {
                        outbox.push({
                            tempId: m.id,
                            targetUserId: tid,
                            body: m._retry.body || '',
                            parentId: m._retry.parentId || null,
                            createdAt: m.createdAt || new Date().toISOString(),
                        });
                        writeOutbox(outbox);
                    }
                    if (!fromQueue) message.info('Sans réseau : message en attente.');
                    return;
                }
                patchMessageById(m.id, { _optimistic: false, _queued: false, _failed: true });
                if (!fromQueue) message.error(err.response?.data?.error || 'Erreur renvoi');
            }
        };
        await run();
    };

    const deleteMessage = async (id) => {
        try {
            await api.delete(`/direct-messages/message/${id}`);
            if (auditSelection?.userA?.id && auditSelection?.userB?.id) {
                const { data } = await api.get(
                    `/direct-messages/audit/thread/${auditSelection.userA.id}/${auditSelection.userB.id}`,
                );
                setMessages(Array.isArray(data?.messages) ? data.messages : []);
            } else {
                await fetchConv(selectedUserId);
            }
        } catch (err) { message.error(err.response?.data?.error || 'Erreur suppression'); }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const handleDmMode = (val) => {
        setDmMode(val);
        setAuditSelection(null);
        setMessages([]);
        if (val === 'audit') {
            setSelectedUserId(null);
        }
    };

    const openAuditThread = async (row) => {
        const a = row.userA?.id;
        const b = row.userB?.id;
        if (!a || !b) return;
        setAuditListLoading(true);
        try {
            const { data } = await api.get(`/direct-messages/audit/thread/${a}/${b}`);
            setAuditSelection({ userA: row.userA, userB: row.userB });
            setMessages(Array.isArray(data?.messages) ? data.messages : []);
            setSelectedUserId(null);
            setMobileChat(true);
            setReplyingTo(null);
            setRetryFileTarget(null);
            seenDmMessageIdsRef.current = new Set((data?.messages || []).map((m) => m.id).filter(Boolean));
        } catch (e) {
            message.error(e.response?.data?.error || 'Chargement impossible');
        } finally {
            setAuditListLoading(false);
        }
    };

    useEffect(() => {
        if (!isSuperAdmin(user?.role) || dmMode !== 'audit') return undefined;
        let active = true;
        setAuditListLoading(true);
        api.get('/direct-messages/audit/conversations')
            .then(({ data }) => {
                if (active) setAuditConversations(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (active) message.error('Impossible de charger l\'audit des conversations');
            })
            .finally(() => {
                if (active) setAuditListLoading(false);
            });
        return () => { active = false; };
    }, [dmMode, user?.role]);

    const selectUser = (uid) => {
        setDmMode('mine');
        setAuditSelection(null);
        setSelectedUserId(uid);
        setMobileChat(true);
        setReplyingTo(null);
        setRetryFileTarget(null);
    };

    // ── Groupes de messages par date ──────────────────────────────
    const messageGroups = useMemo(() => {
        const groups = [];
        let lastDate = null;
        for (const m of messages) {
            const d = dayjs(m.createdAt).format('YYYY-MM-DD');
            if (d !== lastDate) { groups.push({ type: 'separator', date: d, id: `sep-${d}` }); lastDate = d; }
            groups.push({ type: 'message', data: m, id: m.id });
        }
        return groups;
    }, [messages]);

    // ── Chargement ────────────────────────────────────────────────
    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

    if (!enabled) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <Empty description="Le module de discussion privée est désactivé par l'administrateur." />
        </div>
    );

    // ── Render ────────────────────────────────────────────────────
    const ui = {
        pageBorder: isDark ? '#2b2f36' : '#dfe5e7',
        pageShadow: isDark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.08)',
        sidebarBg: isDark ? '#14171c' : '#fff',
        sidebarHeaderBg: isDark ? '#0f2239' : '#1A365D',
        sidebarSearchBg: isDark ? '#1b2027' : '#f0f2f5',
        sidebarSearchBorder: isDark ? '#2b3139' : '#e9edef',
        searchInputBg: isDark ? '#232a33' : '#fff',
        rowSelectedBg: isDark ? '#27303a' : '#f0f2f5',
        rowHoverBg: isDark ? '#212832' : '#f9f9f9',
        rowBorder: isDark ? '#2b3139' : '#f5f5f5',
        textPrimary: isDark ? '#e6e8eb' : '#111b21',
        textSecondary: isDark ? '#b9c0c8' : '#555',
        textMuted: isDark ? '#9aa4af' : '#8696a0',
        chatBg: isDark ? '#0f1115' : '#efeae2',
        chatHeaderBg: isDark ? '#0f2239' : '#1A365D',
        separatorBg: isDark ? 'rgba(35,42,51,0.92)' : 'rgba(255,255,255,0.85)',
        separatorColor: isDark ? '#c5ccd4' : '#54656f',
        toolbarBg: isDark ? '#1b2027' : '#f0f2f5',
        toolbarBorder: isDark ? '#2b3139' : '#e9edef',
        quotePanelBg: isDark ? '#232a33' : '#fff',
        accent: '#128c7e',
        attachColor: isDark ? '#9aa4af' : '#8696a0',
        attachColorDisabled: isDark ? '#5d6670' : '#bbb',
        textInputBg: isDark ? '#232a33' : '#fff',
        sendDisabled: isDark ? '#5f6b77' : '#8696a0',
        bubbleMineBg: isDark ? '#1f5e52' : '#d9fdd3',
        bubbleOtherBg: isDark ? '#232a33' : '#fff',
        bubbleShadow: isDark ? '0 1px 2px rgba(0,0,0,0.35)' : '0 1px 2px rgba(11,20,26,.13)',
        quoteMineBg: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.06)',
        quoteOtherBg: isDark ? '#2b3139' : '#f0f0f0',
        actionBtnBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        fileColor: isDark ? '#8fb7ff' : '#1A365D',
    };
    const chatBg = ui.chatBg;
    const showChat = mobileChat || isDesktopLayout;

    return (
        <div style={{
            display: 'flex',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            height: 'calc(100svh - var(--header-height, 56px) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)',
            minHeight: 400,
            border: `1px solid ${ui.pageBorder}`,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: ui.pageShadow,
            boxSizing: 'border-box',
        }}>

            {/* ══ SIDEBAR contacts ════════════════════════════════════ */}
            <div
                className={`wa-sidebar${mobileChat ? ' wa-hidden-mobile' : ''}`}
                style={{
                    width: 'min(100%, 340px)',
                    minWidth: 0,
                    maxWidth: 340,
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    borderRight: `1px solid ${ui.pageBorder}`,
                    background: ui.sidebarBg,
                }}
            >
                {/* Header sidebar */}
                <div style={{
                    background: ui.sidebarHeaderBg, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserAvatar user={user} size={38} />
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Discussions</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                            title={getSocketStatusDetail(socketStatus)}
                            style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background:
                                    socketStatus.state === 'connected' && socketStatus.browserOnline ? '#25d366'
                                    : socketStatus.state === 'connecting' ? '#3b82f6'
                                    : (socketStatus.state === 'reconnecting' ? '#f59e0b'
                                        : (socketStatus.state === 'unauthorized' ? '#f87171' : '#94a3b8')),
                            }}
                        />
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                            {getSocketStatusLabel(socketStatus)}
                        </span>
                    </div>
                </div>

                {/* Recherche */}
                <div style={{ padding: '8px 12px', background: ui.sidebarSearchBg, borderBottom: `1px solid ${ui.sidebarSearchBorder}` }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: ui.textMuted }} />}
                        placeholder="Rechercher ou commencer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                        style={{ borderRadius: 8, background: ui.searchInputBg, border: 'none' }}
                    />
                </div>

                {isSuperAdmin(user?.role) && (
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${ui.sidebarSearchBorder}`, background: ui.sidebarBg }}>
                        <Segmented
                            block
                            value={dmMode}
                            onChange={handleDmMode}
                            options={[
                                { label: 'Mes conversations', value: 'mine' },
                                { label: 'Audit (toutes)', value: 'audit' },
                            ]}
                        />
                    </div>
                )}

                {/* Liste contacts */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {dmMode === 'audit' && isSuperAdmin(user?.role) ? (
                        auditListLoading ? (
                            <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
                        ) : auditConversations.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: ui.textMuted }}>Aucune conversation</div>
                        ) : (
                            auditConversations.map((row, idx) => {
                                const sel = auditSelection;
                                const selected = sel && row.userA && row.userB && (
                                    (sel.userA.id === row.userA.id && sel.userB.id === row.userB.id) ||
                                    (sel.userA.id === row.userB.id && sel.userB.id === row.userA.id)
                                );
                                const key = `audit-${row.userA?.id}-${row.userB?.id}-${idx}`;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => openAuditThread(row)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 16px',
                                            cursor: 'pointer',
                                            background: selected ? ui.rowSelectedBg : 'transparent',
                                            borderBottom: `1px solid ${ui.rowBorder}`,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: ui.textPrimary }}>
                                                {row.userA?.name || '?'} ↔ {row.userB?.name || '?'}
                                            </div>
                                            <div style={{ fontSize: 12, color: ui.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {row.lastMessage || '—'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )
                    ) : (
                        <>
                    {filteredUsers.length === 0 && (
                        <div style={{ padding: 24, textAlign: 'center', color: ui.textMuted }}>Aucun membre</div>
                    )}
                    {filteredUsers.map((u) => {
                        const conv     = convMap.get(u.id);
                        const selected = u.id === selectedUserId;
                        const unread   = conv?.unreadCount || 0;
                        const lastTime = conv?.lastAt ? dayjs(conv.lastAt).format(dayjs(conv.lastAt).isToday() ? 'HH:mm' : 'DD/MM') : '';
                        return (
                            <div
                                key={u.id}
                                onClick={() => selectUser(u.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    background: selected ? ui.rowSelectedBg : 'transparent',
                                    borderBottom: `1px solid ${ui.rowBorder}`,
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = ui.rowHoverBg; }}
                                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <UserAvatar user={u} size={46} />
                                    {onlineUserIds.has(u.id) && (
                                        <span
                                            title="En ligne"
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                background: '#25d366',
                                                border: '2px solid #fff',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: 14, color: ui.textPrimary }}>{u.name}</span>
                                        <span style={{ fontSize: 11, color: unread ? '#25d366' : ui.textMuted, flexShrink: 0 }}>{lastTime}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 1 }}>
                                        <span style={{
                                            fontSize: 13, color: ui.textMuted,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            maxWidth: 'calc(100% - 28px)',
                                        }}>
                                            {conv?.lastMessage || u.email}
                                        </span>
                                        {unread > 0 && (
                                            <span style={{
                                                background: '#25d366', color: '#fff', borderRadius: 12,
                                                fontSize: 11, fontWeight: 700,
                                                minWidth: 20, height: 20, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                padding: '0 5px', flexShrink: 0,
                                            }}>
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                        </>
                    )}
                </div>
            </div>

            {/* ══ CHAT area ════════════════════════════════════════════ */}
            <div
                className={`wa-chat${!mobileChat ? ' wa-hidden-mobile' : ''}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', background: chatBg, minWidth: 0 }}
            >
                {!selectedUser && !auditSelection ? (
                    /* Placeholder vide */
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 12,
                        color: ui.textMuted,
                    }}>
                        <div style={{ fontSize: 48 }}>💬</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: ui.textPrimary }}>Gestion Planning — Messagerie</div>
                        <div style={{ fontSize: 14 }}>Sélectionnez une conversation pour commencer</div>
                    </div>
                ) : (
                    <>
                        {/* ── Header chat ── */}
                        <div style={{
                            background: ui.chatHeaderBg, padding: '10px 16px',
                            display: 'flex', alignItems: 'center', gap: 12,
                            flexShrink: 0, zIndex: 2,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}>
                            {/* Bouton retour mobile */}
                            <button
                                onClick={() => setMobileChat(false)}
                                style={{
                                    background: 'none', border: 'none', color: '#fff',
                                    cursor: 'pointer', padding: 0, display: 'flex',
                                    alignItems: 'center',
                                }}
                                className="wa-back-btn"
                            >
                                <ArrowLeftOutlined style={{ fontSize: 18 }} />
                            </button>
                            <UserAvatar user={auditSelection ? auditSelection.userA : selectedUser} size={38} />
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                                    {auditSelection
                                        ? `${auditSelection.userA?.name || '?'} ↔ ${auditSelection.userB?.name || '?'}`
                                        : selectedUser.name}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                                    {auditSelection
                                        ? 'Audit — lecture et modération'
                                        : (onlineUserIds.has(selectedUser.id) ? 'En ligne' : 'Hors ligne')}
                                </div>
                            </div>
                        </div>

                        {/* ── Zone messages ── */}
                        <div
                            ref={listRef}
                            style={{
                                flex: 1, overflowY: 'auto',
                                padding: '12px 16px',
                                display: 'flex', flexDirection: 'column', gap: 1,
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23efeae2'/%3E%3C/svg%3E")`,
                            }}
                        >
                            {messages.length === 0 ? (
                                <div style={{ textAlign: 'center', margin: 'auto', color: '#8696a0' }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                                    <div>Aucun message. Commencez la conversation !</div>
                                </div>
                            ) : (
                                messageGroups.map((item) => {
                                    if (item.type === 'separator') {
                                        return (
                                            <div key={item.id} style={{ textAlign: 'center', margin: '8px 0' }}>
                                                <span style={{
                                                    background: ui.separatorBg,
                                                    borderRadius: 8, padding: '3px 12px',
                                                    fontSize: 12, color: ui.separatorColor,
                                                    boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                                                }}>
                                                    {dateSeparatorLabel(item.date)}
                                                </span>
                                            </div>
                                        );
                                    }
                                    const m    = item.data;
                                    const mine = m.senderId === user?.id;
                                    return (
                                        <MessageBubble
                                            key={m.id}
                                            m={m}
                                            mine={mine}
                                            onReply={setReplyingTo}
                                            onDelete={deleteMessage}
                                            onRetry={retryMessage}
                                            canModerate={isPrivilegedAdmin(user?.role)}
                                            hideReply={Boolean(auditSelection)}
                                            ui={ui}
                                        />
                                    );
                                })
                            )}
                        </div>

                        {!auditSelection && (
                        <>
                        {/* ── Barre réponse ── */}
                        {(replyingTo || retryFileTarget) && (
                            <div style={{
                                background: ui.toolbarBg, borderTop: `1px solid ${ui.toolbarBorder}`,
                                padding: '8px 16px',
                                display: 'flex', alignItems: 'center', gap: 8,
                                flexShrink: 0,
                            }}>
                                <div style={{
                                    flex: 1,
                                    borderLeft: '4px solid #128c7e',
                                    padding: '6px 10px 6px 12px',
                                    background: ui.quotePanelBg,
                                    borderRadius: 6,
                                }}>
                                    {replyingTo && (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#128c7e' }}>
                                                {replyingTo.sender?.name || 'Message'}
                                            </div>
                                            <div style={{ fontSize: 13, color: ui.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {replyingTo.body || replyingTo.fileName || 'Fichier'}
                                            </div>
                                        </>
                                    )}
                                    {retryFileTarget && (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#d48806' }}>Renvoi de fichier</div>
                                            <div style={{ fontSize: 13, color: ui.textSecondary }}>
                                                {retryFileTarget.fileName || 'Fichier'} — cliquez sur 📎 pour sélectionner
                                            </div>
                                        </>
                                    )}
                                </div>
                                <Button
                                    type="text" size="small" icon={<CloseOutlined />}
                                    onClick={() => { setReplyingTo(null); setRetryFileTarget(null); }}
                                />
                            </div>
                        )}

                        {/* ── Barre de saisie ── */}
                        <div style={{
                            background: ui.toolbarBg,
                            borderTop: `1px solid ${ui.toolbarBorder}`,
                            padding: '10px 16px',
                            display: 'flex', alignItems: 'flex-end', gap: 8,
                            flexShrink: 0,
                            paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
                        }}>
                            {/* Pièce jointe */}
                            <Upload
                                showUploadList={false}
                                multiple={!retryFileTarget}
                                accept=".doc,.docx,.pdf,.png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/png"
                                beforeUpload={(_, fileList) => {
                                    if (!retryFileTarget && Array.isArray(fileList) && fileList.length > MAX_UPLOAD_BATCH) {
                                        message.warning(`Vous pouvez envoyer au maximum ${MAX_UPLOAD_BATCH} éléments à la fois.`);
                                        return Upload.LIST_IGNORE;
                                    }
                                    return true;
                                }}
                                customRequest={async ({ file, onSuccess, onError }) => {
                                    const effectiveTarget = retryFileTarget?.receiverId || selectedUserId;
                                    if (!effectiveTarget) { onError?.(new Error('no user')); return; }
                                    setUploading(true);
                                    const targetUserId = effectiveTarget;
                                    const body     = retryFileTarget ? String(retryFileTarget?._retry?.body || '').trim() : text.trim();
                                    const parentId = retryFileTarget ? (retryFileTarget?._retry?.parentId || null) : (replyingTo?.id || null);
                                    const tempId   = `tmp-dm-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                                    const tempMsg  = {
                                        id: tempId, senderId: user?.id, receiverId: targetUserId,
                                        body: body || null, fileName: file?.name || 'fichier', fileUrl: null,
                                        createdAt: new Date().toISOString(), isRead: false,
                                        sender: { id: user?.id, name: user?.name || 'Vous', email: user?.email || '', avatarUrl: user?.avatarUrl || null },
                                        receiver: selectedUser || null, parent: replyingTo || null,
                                        _optimistic: true, _queued: false, _failed: false, _retry: { body, parentId },
                                    };
                                    upsertMessages([tempMsg]);
                                    try {
                                        const fd = new FormData();
                                        fd.append('file', file);
                                        if (body)     fd.append('body', body);
                                        if (parentId) fd.append('parentId', parentId);
                                        const { data: created } = await api.post(`/direct-messages/${targetUserId}/file`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                        removeMessageById(tempId); upsertMessages([created]);
                                        setText(''); setReplyingTo(null); onSuccess?.('ok');
                                        api.get('/direct-messages/conversations').then((r) => setConversations(r.data || [])).catch(() => {});
                                        if (retryFileTarget?.id) removeMessageById(retryFileTarget.id);
                                        setRetryFileTarget(null);
                                    } catch (err) {
                                        if (!err?.response) {
                                            try {
                                                await fileOutboxPut({ id: tempId, tempId, targetUserId, body, parentId, fileName: file?.name || 'fichier', mimeType: file?.type || 'application/octet-stream', blob: file, createdAt: tempMsg.createdAt });
                                                patchMessageById(tempId, { _optimistic: false, _queued: true, _failed: false });
                                                setText(''); setReplyingTo(null);
                                                message.info('Hors ligne : fichier mis en attente.');
                                                onSuccess?.('queued');
                                                if (retryFileTarget?.id) removeMessageById(retryFileTarget.id);
                                                setRetryFileTarget(null);
                                            } catch {
                                                patchMessageById(tempId, { _optimistic: false, _queued: false, _failed: true });
                                                message.error('Impossible de stocker le fichier hors ligne.');
                                                onError?.(new Error('store failed'));
                                            }
                                        } else {
                                            patchMessageById(tempId, { _optimistic: false, _queued: false, _failed: true });
                                            message.error(err.response?.data?.error || 'Erreur envoi fichier');
                                            onError?.(err);
                                        }
                                    } finally { setUploading(false); }
                                }}
                            >
                                <button style={{
                                    background: 'none', border: 'none', cursor: uploading ? 'wait' : 'pointer',
                                    color: uploading ? ui.attachColorDisabled : ui.attachColor, fontSize: 22,
                                    display: 'flex', alignItems: 'center', padding: 4,
                                }}>
                                    <PaperClipOutlined />
                                </button>
                            </Upload>

                            {/* Champ texte */}
                            <Input.TextArea
                                ref={inputRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Message..."
                                autoSize={{ minRows: 1, maxRows: 6 }}
                                maxLength={3000}
                                style={{
                                    flex: 1, borderRadius: 20,
                                    resize: 'none', background: ui.textInputBg,
                                    border: 'none', boxShadow: 'none',
                                    padding: '8px 14px', fontSize: 14,
                                }}
                            />

                            {/* Bouton envoi */}
                            <button
                                onClick={sendMessage}
                                disabled={sending || !text.trim()}
                                style={{
                                    background: text.trim() ? '#128c7e' : ui.sendDisabled,
                                    border: 'none', borderRadius: '50%',
                                    width: 42, height: 42, flexShrink: 0,
                                    cursor: text.trim() ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'background 0.2s',
                                    color: '#fff', fontSize: 16,
                                }}
                            >
                                <SendOutlined />
                            </button>
                        </div>
                        </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
