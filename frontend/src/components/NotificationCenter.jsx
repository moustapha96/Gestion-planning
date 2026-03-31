import { useEffect, useState } from 'react';
import api from '../api/client';

export default function NotificationCenter({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications?limit=10');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      PLANNING_SUBMITTED: '📋',
      PLANNING_VALIDATED: '✅',
      PLANNING_RETURNED: '📌',
      PLANNING_REMINDER: '⏰',
      MEETING_CONVOCATION: '📅',
      MEETING_REMINDER: '🔔',
      MEETING_CANCELLED: '❌',
    };
    return icons[type] || '📬';
  };

  const getNotificationColor = (type) => {
    const colors = {
      PLANNING_SUBMITTED: 'bg-blue-50 border-blue-200',
      PLANNING_VALIDATED: 'bg-green-50 border-green-200',
      PLANNING_RETURNED: 'bg-orange-50 border-orange-200',
      PLANNING_REMINDER: 'bg-yellow-50 border-yellow-200',
      MEETING_CONVOCATION: 'bg-purple-50 border-purple-200',
      MEETING_REMINDER: 'bg-yellow-50 border-yellow-200',
      MEETING_CANCELLED: 'bg-red-50 border-red-200',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-white hover:bg-blue-700 rounded-lg transition"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">Notifications ({unreadCount} non lues)</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="divide-y">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Aucune notification</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getNotificationColor(notification.type)} transition hover:bg-opacity-100 ${
                    !notification.isRead ? 'border-l-blue-500' : 'border-l-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                        <h4 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notification.title}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(notification.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-gray-400 hover:text-blue-600 transition"
                          title="Marquer comme lue"
                        >
                          ●
                        </button>
                      )}
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="text-blue-600 hover:text-blue-800 transition text-sm font-semibold"
                        >
                          Voir
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="text-gray-400 hover:text-red-600 transition"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 rounded-b-lg text-center border-t">
            <a
              href="/notifications"
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
              onClick={() => setShowDropdown(false)}
            >
              Voir toutes les notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
