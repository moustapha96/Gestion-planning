import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Badge, Button, Card, Empty, Select, Spin, Tag, Tooltip,
    Typography, Space, Divider, Tabs, App, Switch, Input,
} from 'antd';
import {
    BellOutlined, CheckOutlined, DeleteOutlined,
    CheckCircleOutlined, ReloadOutlined, ArrowRightOutlined,
    FilterOutlined, CalendarOutlined,
} from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import useNotificationStore from '../store/notificationStore';

const { Title, Text } = Typography;

// ── Métadonnées par type ──────────────────────────────────────────
const TYPE_META = {
    PLANNING_SUBMITTED:    { color: 'blue',    label: 'Planning soumis',       border: '#1565C0', bg: '#EFF6FF' },
    PLANNING_CONSOLIDATED: { color: 'purple',  label: 'Planning consolidé',    border: '#722ed1', bg: '#f9f0ff' },
    PLANNING_VALIDATED:    { color: 'green',   label: 'Planning validé',       border: '#52c41a', bg: '#f6ffed' },
    PLANNING_RETURNED:     { color: 'orange',  label: 'Planning retourné',     border: '#fa8c16', bg: '#fff7e6' },
    PLANNING_REMINDER:     { color: 'gold',    label: 'Rappel planning',       border: '#d4b106', bg: '#fffbe6' },
    MEETING_CONVOCATION:   { color: 'blue',    label: 'Convocation réunion',   border: '#1565C0', bg: '#EFF6FF' },
    MEETING_REMINDER:      { color: 'cyan',    label: 'Rappel réunion',        border: '#13c2c2', bg: '#e6fffb' },
    MEETING_CANCELLED:     { color: 'red',     label: 'Réunion annulée',       border: '#ff4d4f', bg: '#fff1f0' },
    MISSION_ASSIGNED:      { color: 'volcano', label: 'Mission assignée',      border: '#fa541c', bg: '#fff2e8' },
    MISSION_CANCELLED:     { color: 'red',     label: 'Mission annulée',       border: '#ff4d4f', bg: '#fff1f0' },
    ROLE_CHANGED:          { color: 'purple',  label: 'Rôle modifié',          border: '#722ed1', bg: '#f9f0ff' },
    ACCOUNT_ACTIVATED:     { color: 'green',   label: 'Compte activé',         border: '#52c41a', bg: '#f6ffed' },
    ACCOUNT_DEACTIVATED:   { color: 'red',     label: 'Compte désactivé',      border: '#ff4d4f', bg: '#fff1f0' },
    ADMIN_BROADCAST:       { color: 'blue',    label: 'Message administrateur',border: '#1565C0', bg: '#EFF6FF' },
};
const DEFAULT_META = { color: 'default', label: 'Notification', border: '#d9d9d9', bg: '#fafafa' };
const getMeta = (type) => TYPE_META[type] || DEFAULT_META;

const TYPE_FILTER_OPTIONS = [
    { value: 'PLANNING_SUBMITTED',    label: 'Planning soumis' },
    { value: 'PLANNING_CONSOLIDATED', label: 'Planning consolidé' },
    { value: 'PLANNING_VALIDATED',    label: 'Planning validé' },
    { value: 'PLANNING_RETURNED',     label: 'Planning retourné' },
    { value: 'MEETING_CONVOCATION',   label: 'Convocation réunion' },
    { value: 'MEETING_REMINDER',      label: 'Rappel réunion' },
    { value: 'MEETING_CANCELLED',     label: 'Réunion annulée' },
    { value: 'MISSION_ASSIGNED',      label: 'Mission assignée' },
    { value: 'ADMIN_BROADCAST',       label: 'Message admin' },
    { value: 'ROLE_CHANGED',          label: 'Rôle modifié' },
];
const PREF_TYPES = ['DEFAULT', 'MEETING_CONVOCATION', 'MEETING_REMINDER', 'MISSION_ASSIGNED', 'PLANNING_REMINDER'];

function formatDate(dateStr) {
    if (!dateStr) return 'Date inconnue';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Date inconnue';
    return d.toLocaleString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function groupByDay(notifications) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const groups = new Map(); // préserve l'ordre d'insertion
    notifications.forEach((n) => {
        const rawDate = n?.createdAt ? new Date(n.createdAt) : null;
        if (!rawDate || Number.isNaN(rawDate.getTime())) {
            const k = 'no-date';
            if (!groups.has(k)) groups.set(k, { key: k, relative: 'Sans date', weekday: '', day: '', monthYear: '', items: [] });
            groups.get(k).items.push(n);
            return;
        }
        const d = new Date(rawDate); d.setHours(0, 0, 0, 0);
        const k = d.toISOString().slice(0, 10); // clé stable YYYY-MM-DD

        let relative = '';
        if (d.getTime() === today.getTime()) relative = "aujourd\'hui.";
        else if (d.getTime() === yesterday.getTime()) relative = 'Hier';

        const weekday = capitalize(rawDate.toLocaleDateString('fr-FR', { weekday: 'long' }));
        const day = rawDate.toLocaleDateString('fr-FR', { day: 'numeric' });
        const monthYear = capitalize(rawDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

        if (!groups.has(k)) {
            groups.set(k, {
                key: k,
                relative,
                weekday,
                day,
                monthYear,
                items: [],
            });
        }
        groups.get(k).items.push(n);
    });
    return Array.from(groups.values());
}

function normalizeNotification(n) {
    return {
        id: n?.id || `notif-${Math.random().toString(36).slice(2, 10)}`,
        type: n?.type || 'UNKNOWN',
        title: n?.title || 'Notification',
        body: n?.body || '',
        link: n?.link || null,
        isRead: Boolean(n?.isRead),
        createdAt: n?.createdAt || null,
    };
}

// ── Carte de notification ─────────────────────────────────────────
function NotifCard({ item, onRead, onDelete, onNavigate }) {
    const meta = getMeta(item?.type);
    return (
        <div
            style={{
                display: 'flex',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                background: item.isRead ? '#fff' : meta.bg,
                border: `1px solid ${item.isRead ? '#f0f0f0' : meta.border}`,
                borderLeft: `4px solid ${item.isRead ? '#d9d9d9' : meta.border}`,
                marginBottom: 10,
                transition: 'box-shadow 0.15s',
                cursor: item.link ? 'pointer' : 'default',
            }}
            onClick={() => onNavigate(item)}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
            {/* Indicateur non-lu */}
            <div style={{ paddingTop: 4, width: 10, flexShrink: 0 }}>
                {!item.isRead && (
                    <span style={{
                        display: 'block', width: 10, height: 10,
                        borderRadius: '50%', background: meta.border,
                    }} />
                )}
            </div>

            {/* Corps */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <Tag
                        color={meta.color}
                        style={{ margin: 0, fontSize: 11, padding: '0 6px' }}
                    >
                        {meta.label}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(item.createdAt)}
                    </Text>
                    {!item.isRead && (
                        <Badge status="processing" text={<Text style={{ fontSize: 11, color: '#1565C0' }}>Nouveau</Text>} />
                    )}
                </div>
                <Text
                    strong={!item.isRead}
                    style={{ fontSize: 14, display: 'block', color: item.isRead ? '#595959' : '#141414', marginBottom: 4 }}
                >
                    {item.title || 'Notification'}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {item.body || '—'}
                </Text>
                {item.link && (
                    <div style={{ marginTop: 6 }}>
                        <Text
                            style={{ fontSize: 12, color: '#1565C0' }}
                            onClick={(e) => { e.stopPropagation(); onNavigate(item); }}
                        >
                            Voir les détails <ArrowRightOutlined />
                        </Text>
                    </div>
                )}
            </div>

            {/* Actions */}
            <Space direction="vertical" size={4} style={{ flexShrink: 0 }}>
                {!item.isRead && (
                    <Tooltip title="Marquer comme lu">
                        <Button
                            type="text" size="small"
                            icon={<CheckOutlined />}
                            onClick={(e) => { e.stopPropagation(); onRead(item.id); }}
                            style={{ color: '#1565C0' }}
                        />
                    </Tooltip>
                )}
                <Tooltip title="Supprimer">
                    <Button
                        type="text" size="small" danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    />
                </Tooltip>
            </Space>
        </div>
    );
}

// ── Liste groupée par date ────────────────────────────────────────
function NotifGroupedList({ items, loading, onRead, onDelete, navigate, markAsRead }) {
    if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
    if (items.length === 0) return (
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Aucune notification"
            style={{ padding: '48px 0' }}
        />
    );
    const groups = groupByDay(items);

    function handleNavigate(item) {
        if (!item.isRead) markAsRead(item.id);
        if (item.link) navigate(item.link);
    }

    return (
        <>
            {groups.map((g) => {
                const isToday = g.relative === "aujourd\'hui.";
                const isYesterday = g.relative === 'Hier';
                const accent = isToday ? '#1565C0' : isYesterday ? '#722ed1' : '#8c8c8c';
                const accentBg = isToday ? '#EFF6FF' : isYesterday ? '#f9f0ff' : '#fafafa';
                return (
                    <div key={g.key} style={{ marginBottom: 16 }}>
                        {/* En-tête horizontal : pastille jour · weekday · jour mois année · barre · compteur */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 10,
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* Pastille relative (aujourd\'hui. / Hier / Date) */}
                            {g.relative ? (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        background: accentBg,
                                        border: `1px solid ${accent}33`,
                                        color: accent,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <CalendarOutlined style={{ fontSize: 12 }} />
                                    {g.relative}
                                </span>
                            ) : null}

                            {/* Détail horizontal de la date : Vendredi · 8 · Mai 2026 */}
                            {g.weekday && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: 600, color: '#262626' }}>
                                        {g.weekday}
                                    </Text>
                                    <span style={{
                                        display: 'inline-block',
                                        width: 4, height: 4, borderRadius: '50%',
                                        background: '#d9d9d9',
                                    }} />
                                    <Text style={{ fontSize: 13, color: '#595959' }}>
                                        {g.day}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#595959' }}>
                                        {g.monthYear}
                                    </Text>
                                </span>
                            )}

                            <Divider style={{ margin: 0, flex: 1, minWidth: 24 }} />

                            <Tag
                                color={isToday ? 'blue' : isYesterday ? 'purple' : 'default'}
                                style={{
                                    margin: 0,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '0 8px',
                                    borderRadius: 999,
                                }}
                            >
                                {g.items.length} {g.items.length > 1 ? 'notifications' : 'notification'}
                            </Tag>
                        </div>

                        {g.items.map((item) => (
                            <NotifCard
                                key={item.id}
                                item={item}
                                onRead={onRead}
                                onDelete={onDelete}
                                onNavigate={handleNavigate}
                            />
                        ))}
                    </div>
                );
            })}
        </>
    );
}

// ── Page principale ───────────────────────────────────────────────
export default function Notifications() {
    const { message } = App.useApp();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { fetchNotifications: storeRefresh } = useNotificationStore();

    const [notifications, setNotifications] = useState([]);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState(undefined);
    const [prefLoading, setPrefLoading] = useState(false);
    const [prefSaving, setPrefSaving] = useState(false);
    const [prefChannels, setPrefChannels] = useState({ DEFAULT: { inApp: true, email: true } });
    const [quietHours, setQuietHours] = useState({ enabled: false, start: '22:00', end: '07:00' });
    const [dailyDigest, setDailyDigest] = useState({ enabled: false, time: '08:00' });
    const LIMIT = 50;

    const loadPreferences = useCallback(async () => {
        setPrefLoading(true);
        try {
            const { data } = await api.get('/notifications/preferences');
            setPrefChannels(data?.channels || { DEFAULT: { inApp: true, email: true } });
            setQuietHours(data?.quietHours || { enabled: false, start: '22:00', end: '07:00' });
            setDailyDigest(data?.dailyDigest || { enabled: false, time: '08:00' });
        } catch {
            message.error('Impossible de charger les préférences notifications');
        } finally {
            setPrefLoading(false);
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT };
            if (typeFilter) params.type = typeFilter;
            const res = await api.get('/notifications', { params });
            setNotifications((res.data.notifications || []).map(normalizeNotification));
            setTotal(res.data.total || 0);
            setUnreadCount(res.data.unread ?? 0);
        } catch {
            message.error('Impossible de charger les notifications');
        } finally {
            setLoading(false);
        }
    }, [page, typeFilter]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
    useEffect(() => { loadPreferences(); }, [loadPreferences]);

    const savePreferences = async () => {
        setPrefSaving(true);
        try {
            await api.put('/notifications/preferences', {
                channels: prefChannels,
                quietHours,
                dailyDigest,
            });
            message.success('Préférences notifications enregistrées');
        } catch {
            message.error('Erreur enregistrement préférences');
        } finally {
            setPrefSaving(false);
        }
    };

    const handleRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount((c) => Math.max(0, c - 1));
            storeRefresh();
        } catch { message.error('Erreur'); }
    };

    const handleMarkAll = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
            storeRefresh();
            message.success('Toutes marquées comme lues');
        } catch { message.error('Erreur'); }
    };

    const handleDelete = async (id) => {
        const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
            storeRefresh();
        } catch { message.error('Erreur'); }
    };

    if (!user?.id) return null;

    const unread = notifications.filter((n) => !n.isRead);
    const read   = notifications.filter((n) => n.isRead);

    const tabItems = [
        {
            key: 'all',
            label: <span>Toutes <Tag style={{ marginLeft: 4 }}>{notifications.length}</Tag></span>,
            children: (
                <NotifGroupedList
                    items={notifications}
                    loading={loading}
                    onRead={handleRead}
                    onDelete={handleDelete}
                    navigate={navigate}
                    markAsRead={handleRead}
                />
            ),
        },
        {
            key: 'unread',
            label: (
                <span>
                    Non lues&nbsp;
                    {unreadCount > 0 && <Badge count={unreadCount} style={{ backgroundColor: '#ff4d4f' }} />}
                </span>
            ),
            children: (
                <NotifGroupedList
                    items={unread}
                    loading={loading}
                    onRead={handleRead}
                    onDelete={handleDelete}
                    navigate={navigate}
                    markAsRead={handleRead}
                />
            ),
        },
        {
            key: 'read',
            label: <span>Lues <Tag style={{ marginLeft: 4 }}>{read.length}</Tag></span>,
            children: (
                <NotifGroupedList
                    items={read}
                    loading={loading}
                    onRead={handleRead}
                    onDelete={handleDelete}
                    navigate={navigate}
                    markAsRead={handleRead}
                />
            ),
        },
    ];

    return (
        <div>
            {/* ── En-tête ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Title level={3} style={{ margin: 0 }}>
                        <BellOutlined /> Notifications
                    </Title>
                    {unreadCount > 0 && (
                        <Badge count={unreadCount} style={{ backgroundColor: '#ff4d4f' }} />
                    )}
                </div>
                <Space wrap>
                    <Select
                        allowClear
                        placeholder={<><FilterOutlined /> Type</>}
                        style={{ width: 220 }}
                        options={TYPE_FILTER_OPTIONS}
                        value={typeFilter}
                        onChange={(v) => { setTypeFilter(v); setPage(1); }}
                    />
                    <Tooltip title="Actualiser">
                        <Button icon={<ReloadOutlined />} onClick={fetchNotifications} loading={loading} />
                    </Tooltip>
                    {unreadCount > 0 && (
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={handleMarkAll}
                        >
                            Tout marquer lu
                        </Button>
                    )}
                </Space>
            </div>

            {/* ── Tabs ── */}
            <Card style={{ marginBottom: 16 }} loading={prefLoading} title="Préférences intelligentes notifications">
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text strong>Canaux par type</Text>
                    {PREF_TYPES.map((t) => {
                        const c = prefChannels[t] || prefChannels.DEFAULT || { inApp: true, email: true };
                        return (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <Text style={{ minWidth: 160 }}>{t}</Text>
                                <Space>
                                    <Text type="secondary">In-app</Text>
                                    <Switch
                                        checked={c.inApp !== false}
                                        onChange={(checked) => setPrefChannels((prev) => ({
                                            ...prev,
                                            [t]: { ...(prev[t] || {}), inApp: checked },
                                        }))}
                                    />
                                    <Text type="secondary">Email</Text>
                                    <Switch
                                        checked={c.email !== false}
                                        onChange={(checked) => setPrefChannels((prev) => ({
                                            ...prev,
                                            [t]: { ...(prev[t] || {}), email: checked },
                                        }))}
                                    />
                                </Space>
                            </div>
                        );
                    })}
                    <Divider style={{ margin: '8px 0' }} />
                    <Text strong>Mode silencieux horaire</Text>
                    <Space>
                        <Switch checked={Boolean(quietHours.enabled)} onChange={(checked) => setQuietHours((p) => ({ ...p, enabled: checked }))} />
                        <Input type="time" value={quietHours.start || '22:00'} onChange={(e) => setQuietHours((p) => ({ ...p, start: e.target.value }))} style={{ width: 120 }} />
                        <Text>à</Text>
                        <Input type="time" value={quietHours.end || '07:00'} onChange={(e) => setQuietHours((p) => ({ ...p, end: e.target.value }))} style={{ width: 120 }} />
                    </Space>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text strong>Digest quotidien</Text>
                    <Space>
                        <Switch checked={Boolean(dailyDigest.enabled)} onChange={(checked) => setDailyDigest((p) => ({ ...p, enabled: checked }))} />
                        <Text>Heure d'envoi</Text>
                        <Input type="time" value={dailyDigest.time || '08:00'} onChange={(e) => setDailyDigest((p) => ({ ...p, time: e.target.value }))} style={{ width: 120 }} />
                    </Space>
                    <div>
                        <Button type="primary" loading={prefSaving} onClick={savePreferences}>
                            Enregistrer les préférences
                        </Button>
                    </div>
                </Space>
            </Card>
            <Card bodyStyle={{ padding: '0 24px 24px' }}>
                <Tabs items={tabItems} defaultActiveKey="all" />
            </Card>

            {/* ── Pagination simple ── */}
            {total > LIMIT && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        ← Précédent
                    </Button>
                    <Text style={{ lineHeight: '32px', color: '#595959' }}>
                        Page {page} / {Math.ceil(total / LIMIT)}
                    </Text>
                    <Button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / LIMIT)}>
                        Suivant →
                    </Button>
                </div>
            )}
        </div>
    );
}
