import { create } from 'zustand';
import { notificationsApi } from '../api/notifications';

let _pollingTimer = null;

const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    panelOpen: false,

    // ── Récupère les 50 dernières notifs + compte non-lues
    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const res = await notificationsApi.getAll({ limit: 50 });
            set({
                notifications: res.data.notifications || [],
                // L'API renvoie `unread`, pas `unreadCount`
                unreadCount: res.data.unread ?? 0,
                loading: false,
            });
        } catch {
            set({ loading: false });
        }
    },

    // ── Rafraîchit uniquement le compteur (léger, sans charger toute la liste)
    fetchUnreadCount: async () => {
        try {
            const res = await notificationsApi.getUnreadCount();
            // L'API /unread/count renvoie `{ unread }` (pas `count`)
            set({ unreadCount: res.data.unread ?? res.data.count ?? 0 });
        } catch {
            // silently fail
        }
    },

    markAsRead: async (id) => {
        try {
            await notificationsApi.markAsRead(id);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, isRead: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch {
            // silently fail
        }
    },

    markAllAsRead: async () => {
        try {
            await notificationsApi.markAllAsRead();
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                unreadCount: 0,
            }));
        } catch {
            // silently fail
        }
    },

    deleteNotification: async (id) => {
        const wasUnread = get().notifications.find((n) => n.id === id)?.isRead === false;
        try {
            await notificationsApi.delete(id);
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
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
