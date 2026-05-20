/**
 * NotificationPanel — panneau déroulant des notifications.
 * S'affiche sous la cloche (NotificationBell).
 * Design Ant Design, groupement par date, tags colorés par type.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Divider, Empty, Spin, Tag, Tooltip, Typography } from 'antd';
import {
    CheckOutlined, CloseOutlined, DeleteOutlined,
    CheckCircleOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import useNotificationStore from '../store/notificationStore';

const { Text } = Typography;

// ── Métadonnées par type de notification ──────────────────────────
const TYPE_META = {
    DIRECT_MESSAGE:        { color: 'geekblue', label: 'Message',              dot: '#2f54eb' },
    PLANNING_SUBMITTED:    { color: 'blue',    label: 'Planning soumis',      dot: '#1565C0' },
    PLANNING_CONSOLIDATED: { color: 'purple',  label: 'Planning consolidé',   dot: '#722ed1' },
    PLANNING_VALIDATED:    { color: 'green',   label: 'Planning validé',      dot: '#52c41a' },
    PLANNING_RETURNED:     { color: 'orange',  label: 'Planning retourné',    dot: '#fa8c16' },
    PLANNING_REMINDER:     { color: 'gold',    label: 'Rappel planning',      dot: '#d4b106' },
    MEETING_CONVOCATION:   { color: 'blue',    label: 'Convocation',          dot: '#1565C0' },
    MEETING_REMINDER:      { color: 'cyan',    label: 'Rappel réunion',       dot: '#13c2c2' },
    MEETING_CANCELLED:     { color: 'red',     label: 'Réunion annulée',      dot: '#ff4d4f' },
    MISSION_ASSIGNED:      { color: 'volcano', label: 'Mission assignée',     dot: '#fa541c' },
    MISSION_CANCELLED:     { color: 'red',     label: 'Mission annulée',      dot: '#ff4d4f' },
    ROLE_CHANGED:          { color: 'purple',  label: 'Rôle modifié',         dot: '#722ed1' },
    PROJECT_CONSOLIDATOR_ASSIGNED: { color: 'purple', label: 'Consolidateur projet', dot: '#722ed1' },
    ACCOUNT_ACTIVATED:     { color: 'green',   label: 'Compte activé',        dot: '#52c41a' },
    ACCOUNT_DEACTIVATED:   { color: 'red',     label: 'Compte désactivé',     dot: '#ff4d4f' },
    ADMIN_BROADCAST:       { color: 'blue',    label: 'Message admin',        dot: '#1565C0' },
};
const DEFAULT_META = { color: 'default', label: 'Notification', dot: '#8c8c8c' };
const getMeta = (type) => TYPE_META[type] || DEFAULT_META;

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function groupByDate(notifications) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const groups = {};
    notifications.forEach((n) => {
        const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
        let key;
        if (d.getTime() === today.getTime()) key = "Aujourd'hui";
        else if (d.getTime() === yesterday.getTime()) key = 'Hier';
        else key = new Date(n.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (!groups[key]) groups[key] = [];
        groups[key].push(n);
    });
    return groups;
}

function NotifItem({ n, onRead, onDelete, onNavigate }) {
    const meta = getMeta(n.type);
    return (
        <div
            onClick={() => onNavigate(n)}
            role={n.link ? 'button' : undefined}
            tabIndex={n.link ? 0 : undefined}
            style={{
                display: 'flex',
                gap: 10,
                padding: '10px 12px',
                background: n.isRead ? 'transparent' : '#f0f7ff',
                borderLeft: `3px solid ${n.isRead ? 'transparent' : meta.dot}`,
                cursor: n.link ? 'pointer' : 'default',
                transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = n.isRead ? '#fafafa' : '#EFF6FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = n.isRead ? 'transparent' : '#f0f7ff'; }}
        >
            {/* Indicateur non-lu */}
            <div style={{ paddingTop: 6, width: 8, flexShrink: 0 }}>
                {!n.isRead && (
                    <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: meta.dot }} />
                )}
            </div>

            {/* Corps */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <Tag
                        color={meta.color}
                        style={{ fontSize: 10, lineHeight: '16px', padding: '0 5px', margin: 0 }}
                    >
                        {meta.label}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>{timeAgo(n.createdAt)}</Text>
                </div>
                <Text
                    strong={!n.isRead}
                    style={{ fontSize: 13, display: 'block', lineHeight: 1.4, color: n.isRead ? '#595959' : '#141414', marginBottom: 2 }}
                >
                    {n.title}
                </Text>
                <Text
                    type="secondary"
                    style={{
                        fontSize: 12,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {n.body}
                </Text>
                {n.link && (
                    <Text style={{ fontSize: 11, color: '#1565C0', marginTop: 3, display: 'block' }}>
                        Voir les détails <ArrowRightOutlined />
                    </Text>
                )}
            </div>

            {/* Boutons action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                {!n.isRead && (
                    <Tooltip title="Marquer comme lu" placement="left">
                        <Button
                            type="text" size="small"
                            icon={<CheckOutlined style={{ fontSize: 11 }} />}
                            onClick={(e) => { e.stopPropagation(); onRead(n.id); }}
                            style={{ width: 24, height: 24, minWidth: 24, padding: 0, color: '#1565C0' }}
                        />
                    </Tooltip>
                )}
                <Tooltip title="Supprimer" placement="left">
                    <Button
                        type="text" size="small" danger
                        icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                        onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
                        style={{ width: 24, height: 24, minWidth: 24, padding: 0, color: '#bfbfbf' }}
                    />
                </Tooltip>
            </div>
        </div>
    );
}

function NotifList({ items, loading, onRead, onDelete, onNavigate }) {
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Spin />
            </div>
        );
    }
    if (items.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text type="secondary">Aucune notification</Text>}
                style={{ padding: '32px 0' }}
            />
        );
    }
    const groups = groupByDate(items);
    return (
        <>
            {Object.entries(groups).map(([date, notifs]) => (
                <div key={date}>
                    <div style={{
                        padding: '5px 12px 4px',
                        background: '#f9f9f9',
                        borderTop: '1px solid #f0f0f0',
                        borderBottom: '1px solid #f0f0f0',
                    }}>
                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {date}
                        </Text>
                    </div>
                    {notifs.map((n, i) => (
                        <div key={n.id}>
                            <NotifItem n={n} onRead={onRead} onDelete={onDelete} onNavigate={onNavigate} />
                            {i < notifs.length - 1 && <Divider style={{ margin: 0 }} />}
                        </div>
                    ))}
                </div>
            ))}
        </>
    );
}

export default function NotificationPanel({ onClose }) {
    const panelRef = useRef(null);
    const navigate = useNavigate();
    const { notifications, messageNotifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } =
        useNotificationStore();

    useEffect(() => {
        function handleOutside(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [onClose]);

    function handleNavigate(n) {
        if (!n.isRead) markAsRead(n.id);
        if (n.link) { navigate(n.link); onClose(); }
    }

    const merged = [...(messageNotifications || []), ...(notifications || [])]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const unread = merged.filter((n) => !n.isRead);

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                right: 8,
                top: 64,
                width: 400,
                maxWidth: 'calc(100vw - 16px)',
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e8e8e8',
                zIndex: 1080,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* ── En-tête ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong style={{ fontSize: 15 }}>Notifications</Text>
                    {unreadCount > 0 && (
                        <Badge count={unreadCount} style={{ backgroundColor: '#1565C0' }} />
                    )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {unreadCount > 0 && (
                        <Tooltip title="Tout marquer comme lu">
                            <Button
                                type="text" size="small"
                                icon={<CheckCircleOutlined />}
                                onClick={markAllAsRead}
                                style={{ fontSize: 12, color: '#1565C0' }}
                            >
                                Tout lire
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title="Fermer">
                        <Button
                            type="text" size="small"
                            icon={<CloseOutlined />}
                            onClick={onClose}
                            style={{ color: '#8c8c8c' }}
                        />
                    </Tooltip>
                </div>
            </div>

            {/* ── Onglets Non lues / Toutes ── */}
            <div style={{ borderBottom: '1px solid #f0f0f0', padding: '0 16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 0 }}>
                    {[
                        { key: 'unread', label: 'Non lues', count: unread.length, accent: '#ff4d4f' },
                        { key: 'all',    label: 'Toutes',   count: merged.length, accent: null },
                    ].map(({ key, label, count, accent }) => (
                        <button
                            key={key}
                            id={`tab-${key}`}
                            onClick={() => {
                                document.getElementById('notif-list-unread').style.display = key === 'unread' ? 'block' : 'none';
                                document.getElementById('notif-list-all').style.display = key === 'all' ? 'block' : 'none';
                                document.getElementById(`tab-unread`).style.borderBottom = key === 'unread' ? '2px solid #1565C0' : '2px solid transparent';
                                document.getElementById(`tab-all`).style.borderBottom = key === 'all' ? '2px solid #1565C0' : '2px solid transparent';
                                document.getElementById(`tab-unread`).style.color = key === 'unread' ? '#1565C0' : 'rgba(0,0,0,0.45)';
                                document.getElementById(`tab-all`).style.color = key === 'all' ? '#1565C0' : 'rgba(0,0,0,0.45)';
                            }}
                            style={{
                                padding: '8px 12px',
                                border: 'none',
                                borderBottom: key === 'unread' ? '2px solid #1565C0' : '2px solid transparent',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: 13,
                                color: key === 'unread' ? '#1565C0' : 'rgba(0,0,0,0.45)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontWeight: key === 'unread' ? 500 : 400,
                                transition: 'color 0.15s, border-bottom 0.15s',
                            }}
                        >
                            {label}
                            {count > 0 && (
                                <Badge
                                    count={count}
                                    size="small"
                                    style={{ backgroundColor: accent || '#d9d9d9', color: accent ? '#fff' : '#595959' }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Listes ── */}
            <div style={{ maxHeight: 380, overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
                <div id="notif-list-unread">
                    <NotifList
                        items={unread}
                        loading={loading}
                        onRead={markAsRead}
                        onDelete={deleteNotification}
                        onNavigate={handleNavigate}
                    />
                </div>
                <div id="notif-list-all" style={{ display: 'none' }}>
                    <NotifList
                        items={merged}
                        loading={loading}
                        onRead={markAsRead}
                        onDelete={deleteNotification}
                        onNavigate={handleNavigate}
                    />
                </div>
            </div>

            {/* ── Pied ── */}
            <div style={{
                padding: '8px 16px',
                borderTop: '1px solid #f0f0f0',
                background: '#fafafa',
                textAlign: 'center',
                flexShrink: 0,
            }}>
                <Button
                    type="link" size="small"
                    onClick={() => { navigate('/notifications'); onClose(); }}
                    style={{ fontSize: 13 }}
                >
                    Voir toutes les notifications →
                </Button>
            </div>
        </div>
    );
}
