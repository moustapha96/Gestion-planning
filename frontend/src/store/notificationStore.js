import { create } from 'zustand';
import { notificationsApi } from '../api/notifications';
import api from '../api/client';

let _pollingTimer = null;

const useNotificationStore = create((set, get) => ({
    notifications: [],
    messageNotifications: [],
    unreadCount: 0,
    unreadSystemCount: 0,
    unreadMessageCount: 0,
    loading: false,
    panelOpen: false,

    // ── Récupère les 50 dernières notifs + compte non-lues
    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const [res, convRes] = await Promise.all([
                notificationsApi.getAll({ limit: 50 }),
                api.get('/direct-messages/conversations').catch(() => ({ data: [] })),
            ]);
            const conversations = Array.isArray(convRes?.data) ? convRes.data : [];
            const messageNotifications = conversations
                .filter((c) => (c?.unreadCount || 0) > 0 && c?.user?.id)
                .map((c) => ({
                    id: `dm-${c.user.id}`,
                    type: 'DIRECT_MESSAGE',
                    title: `Nouveau(x) message(s) de ${c.user.name || 'Utilisateur'}`,
                    body: c.lastMessage || 'Nouveau message',
                    createdAt: c.lastAt || new Date().toISOString(),
                    isRead: false,
                    unreadCount: c.unreadCount || 0,
                    link: `/discussions?user=${encodeURIComponent(c.user.id)}`,
                }));
            const unreadSystem = res.data.unread ?? 0;
            const unreadMessages = messageNotifications.reduce((acc, x) => acc + (x.unreadCount || 0), 0);
            set({
                notifications: res.data.notifications || [],
                messageNotifications,
                unreadSystemCount: unreadSystem,
                unreadMessageCount: unreadMessages,
                unreadCount: unreadSystem + unreadMessages,
                loading: false,
            });
        } catch {
            set({ loading: false });
        }
    },

    // ── Rafraîchit uniquement le compteur (léger, sans charger toute la liste)
    fetchUnreadCount: async () => {
        try {
            const [res, convRes] = await Promise.all([
                notificationsApi.getUnreadCount(),
                api.get('/direct-messages/conversations').catch(() => ({ data: [] })),
            ]);
            const unreadSystem = res.data.unread ?? res.data.count ?? 0;
            const conversations = Array.isArray(convRes?.data) ? convRes.data : [];
            const unreadMessages = conversations.reduce((acc, c) => acc + (c?.unreadCount || 0), 0);
            set({
                unreadSystemCount: unreadSystem,
                unreadMessageCount: unreadMessages,
                unreadCount: unreadSystem + unreadMessages,
            });
        } catch {
            // silently fail
        }
    },

    markAsRead: async (id) => {
        if (String(id || '').startsWith('dm-')) {
            const userId = String(id).slice(3);
            try {
                await api.get(`/direct-messages/${userId}`);
            } catch {
                // silently fail
            }
            await get().fetchNotifications();
            return;
        }
        try {
            await notificationsApi.markAsRead(id);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, isRead: true } : n
                ),
                unreadSystemCount: Math.max(0, state.unreadSystemCount - 1),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch {
            // silently fail
        }
    },

    markAllAsRead: async () => {
        try {
            await notificationsApi.markAllAsRead();
            const convs = await api.get('/direct-messages/conversations').catch(() => ({ data: [] }));
            const rows = Array.isArray(convs?.data) ? convs.data : [];
            await Promise.all(
                rows
                    .filter((c) => (c?.unreadCount || 0) > 0 && c?.user?.id)
                    .map((c) => api.get(`/direct-messages/${c.user.id}`).catch(() => null))
            );
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                messageNotifications: [],
                unreadSystemCount: 0,
                unreadMessageCount: 0,
                unreadCount: 0,
            }));
        } catch {
            // silently fail
        }
    },

    deleteNotification: async (id) => {
        if (String(id || '').startsWith('dm-')) {
            set((state) => {
                const target = state.messageNotifications.find((n) => n.id === id);
                const dec = target?.unreadCount || 0;
                return {
                    messageNotifications: state.messageNotifications.filter((n) => n.id !== id),
                    unreadMessageCount: Math.max(0, state.unreadMessageCount - dec),
                    unreadCount: Math.max(0, state.unreadCount - dec),
                };
            });
            return;
        }
        const wasUnread = get().notifications.find((n) => n.id === id)?.isRead === false;
        try {
            await notificationsApi.delete(id);
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadSystemCount: wasUnread ? Math.max(0, state.unreadSystemCount - 1) : state.unreadSystemCount,
                unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            }));
        } catch {
            // silently fail
        }
    },

    togglePanel: () => {
        const wasOpen = get().panelOpen;
        set({ panelOpen: !wasOpen });
        // Recharge les notifs à chaque ouverture du panel
        if (!wasOpen) get().fetchNotifications();
    },
    openPanel: () => {
        set({ panelOpen: true });
        get().fetchNotifications();
    },
    closePanel: () => set({ panelOpen: false }),

    // ── Polling toutes les 30s (uniquement le compteur pour économiser la bande passante)
    startPolling: () => {
        if (_pollingTimer) return; // déjà démarré
        get().fetchUnreadCount(); // premier appel immédiat
        _pollingTimer = setInterval(() => {
            get().fetchUnreadCount();
        }, 30_000);
    },
    stopPolling: () => {
        if (_pollingTimer) {
            clearInterval(_pollingTimer);
            _pollingTimer = null;
        }
    },
}));

export default useNotificationStore;
