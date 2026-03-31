import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/client';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const limit = 15;
      const skip = (page - 1) * limit;

      let url = `/notifications?page=${page}&limit=${limit}`;
      if (filter !== 'ALL') {
        url += `&type=${filter}`;
      }

      const response = await api.get(url);
      setNotifications(response.data.notifications);
      setTotal(response.data.total);
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

  const getNotificationBgColor = (type) => {
    const colors = {
      PLANNING_SUBMITTED: 'bg-blue-50',
      PLANNING_VALIDATED: 'bg-green-50',
      PLANNING_RETURNED: 'bg-orange-50',
      PLANNING_REMINDER: 'bg-yellow-50',
      MEETING_CONVOCATION: 'bg-purple-50',
      MEETING_REMINDER: 'bg-yellow-50',
      MEETING_CANCELLED: 'bg-red-50',
    };
    return colors[type] || 'bg-gray-50';
  };

  const filters = [
    'ALL',
    'PLANNING_SUBMITTED',
    'PLANNING_VALIDATED',
    'PLANNING_RETURNED',
    'PLANNING_REMINDER',
    'MEETING_CONVOCATION',
    'MEETING_REMINDER',
  ];

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">Gérez vos notifications et restez à jour</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center">
          <button
            onClick={handleMarkAllAsRead}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
          >
            Tout marquer comme lu
          </button>
          <span className="text-gray-600 text-sm">
            Total: <strong>{total}</strong> notifications
          </span>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'ALL' ? 'Toutes' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow text-gray-500">
              Aucune notification
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`${getNotificationBgColor(notification.type)} border-l-4 border-blue-500 rounded-lg shadow p-4 hover:shadow-md transition`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-2"></span>
                      )}
                    </div>
                    <p className="text-gray-600 ml-10 mb-2">{notification.body}</p>
                    <p className="text-xs text-gray-400 ml-10">
                      {new Date(notification.createdAt).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(notification.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                        title="Marquer comme lue"
                      >
                        Lire
                      </button>
                    )}
                    {notification.link && (
                      <a
                        href={notification.link}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
                      >
                        Voir
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
