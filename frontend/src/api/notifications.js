import api from './client';

export const notificationsApi = {
    getAll: (params = {}) =>
        api.get('/notifications', { params }),

    getUnreadCount: () =>
        api.get('/notifications/unread/count'),

    markAsRead: (id) =>
        api.put(`/notifications/${id}/read`),

    markAllAsRead: () =>
        api.put('/notifications/read-all'),

    delete: (id) =>
        api.delete(`/notifications/${id}`),
};
