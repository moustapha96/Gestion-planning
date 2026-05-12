/**
 * NotificationBell — cloche dans le header.
 * Utilise le store Zustand (pas d'état local dupliqué).
 * Affiche NotificationPanel au clic.
 */
import { Badge, Button, Tooltip } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import useNotificationStore from '../store/notificationStore';
import NotificationPanel from './NotificationPanel';

/**
 * @param {{ tone?: 'default' | 'onDark' }} props
 * `onDark` : barre sombre (ex. Navbar) — icône claire lisible au clic.
 */
export default function NotificationBell({ tone = 'default' }) {
    const { unreadCount, panelOpen, togglePanel, closePanel } = useNotificationStore();
    const onDark = tone === 'onDark';

    return (
        <div style={{ position: 'relative' }}>
            <Tooltip title="Notifications" placement="bottom">
                <Badge
                    count={unreadCount}
                    overflowCount={99}
                    size="small"
                    offset={[-2, 2]}
                    color={onDark ? '#ff4d4f' : undefined}
                >
                    <Button
                        type="text"
                        icon={<BellOutlined style={{ fontSize: 20 }} />}
                        onClick={togglePanel}
                        style={{
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: panelOpen
                                ? (onDark ? '#e6f7ff' : '#1565C0')
                                : (onDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.65)'),
                            background: panelOpen
                                ? (onDark ? 'rgba(255,255,255,0.18)' : '#EFF6FF')
                                : 'transparent',
                            borderRadius: 8,
                        }}
                        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
                    />
                </Badge>
            </Tooltip>

            {panelOpen && <NotificationPanel onClose={closePanel} />}
        </div>
    );
}
