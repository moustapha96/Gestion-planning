import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Layout, Menu, Dropdown, Space, App, Button, Badge,
    Drawer, Grid, Tag, Typography, Input, Popover, Checkbox, Empty, Tooltip,
} from 'antd';
import {
    MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined, CalendarOutlined,
    TeamOutlined, HomeOutlined, SettingOutlined, UserOutlined, LogoutOutlined,
    BellOutlined, FlagOutlined, ScheduleOutlined, MessageOutlined,
    UnorderedListOutlined, ProjectOutlined, SearchOutlined, MoonOutlined, SunOutlined, ApartmentOutlined,
    ContactsOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import UserAvatar from './UserAvatar';
import OfflineBanner from './OfflineBanner';
import useNotificationStore from '../store/notificationStore';
import api, { API_BASE } from '../api/client';
import {
    getSocket, subscribeSocketStatus, getSocketStatusSnapshot, getSocketStatusLabel, getSocketStatusDetail,
} from '../realtime/socket';
import { isPrivilegedAdmin, isSuperAdmin, canAccessRepertoire } from '../utils/roles';
import { getAdminNavForRole } from '../pages/admin/adminNavConfig';
import { useThemeMode } from '../context/ThemeModeContext';
import { resolveAppLogoSrc, DEFAULT_APP_NAME } from '../utils/appBranding';
import usePendingValidations from '../hooks/usePendingValidations';

const { Header, Content, Sider } = Layout;
const { useBreakpoint } = Grid;
const { Text } = Typography;

const ROLE_LABELS = {
    RESPONSABLE:   'Responsable',
    CONSOLIDATEUR: 'Consolidateur',
    COORDINATEUR_PROJET: 'Coord. projet',
    SECRETAIRE_GENERAL: 'Secr. général',
    DG:            'Dir. Général',
    ADMIN:         'Administrateur',
    SUPER_ADMIN:   'Super administrateur',
};
const ROLE_COLORS = {
    RESPONSABLE:   'blue',
    CONSOLIDATEUR: 'purple',
    COORDINATEUR_PROJET: 'geekblue',
    SECRETAIRE_GENERAL: 'cyan',
    DG:            'gold',
    ADMIN:         'red',
    SUPER_ADMIN:   'magenta',
};

export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { modal, notification } = App.useApp();
    const { isDark, toggleMode } = useThemeMode();
    const screens = useBreakpoint();
    const isXs = !screens.sm;
    const isMobile = !screens.md;
    const isTablet = Boolean(screens.md && !screens.lg);
    const showHeaderUserDetails = Boolean(screens.lg);
    const showInlineSearch = Boolean(screens.md);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [directMessagesEnabled, setDirectMessagesEnabled] = useState(true);
    const [appName, setAppName] = useState(DEFAULT_APP_NAME);
    const [footerText, setFooterText] = useState('© 2026 ADM GP - Tous droits réservés');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactAddress, setContactAddress] = useState('');
    const [appLogoUrl, setAppLogoUrl] = useState('');
    const [rtSocket, setRtSocket] = useState(() => getSocketStatusSnapshot());
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; }
    });
    const [globalSearch, setGlobalSearch] = useState('');
    const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
    const [globalSearchResults, setGlobalSearchResults] = useState([]);
    const [globalSearchTypes, setGlobalSearchTypes] = useState(['meetings', 'missions', 'plannings', 'messages']);
    const [globalFromDate, setGlobalFromDate] = useState('');
    const [globalToDate, setGlobalToDate] = useState('');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    /** Sous-menu Administration déplié quand une route /admin/* est active */
    const [menuOpenKeys, setMenuOpenKeys] = useState([]);

    const { startPolling, stopPolling } = useNotificationStore();
    const { canSeeMenu: validationCanSeeMenu, counts: validationCounts } = usePendingValidations(Boolean(user?.id));
    const seenNotifIdsRef = useRef(new Set());
    const seenDmPopupIdsRef = useRef(new Set());
    const seenDirectionPopupIdsRef = useRef(new Set());
    const seenProjectPopupIdsRef = useRef(new Set());

    // ── Démarrer / arrêter le polling des notifications ──────────
    useEffect(() => {
        if (user?.id) {
            startPolling();
        }
        return () => stopPolling();
    }, [user?.id]);

    useEffect(() => {
        const unsub = subscribeSocketStatus((s) => setRtSocket({ ...s }));
        return () => unsub();
    }, []);

    useEffect(() => {
        if (location.pathname.startsWith('/admin')) {
            setMenuOpenKeys((prev) => (prev.includes('submenu-admin') ? prev : [...prev, 'submenu-admin']));
        }
    }, [location.pathname]);

    const socketTagColor = !rtSocket.browserOnline
        ? 'default'
        : rtSocket.state === 'connected'
          ? 'green'
          : rtSocket.state === 'connecting'
            ? 'processing'
            : rtSocket.state === 'reconnecting'
              ? 'orange'
              : rtSocket.state === 'unauthorized'
                ? 'red'
                : 'default';
    const socketShortLabel = !rtSocket.browserOnline
        ? 'Réseau off'
        : rtSocket.state === 'connected'
          ? (isTablet ? 'En ligne' : 'Connecté')
          : rtSocket.state === 'connecting'
            ? (isTablet ? '…' : 'Connexion…')
            : rtSocket.state === 'reconnecting'
              ? (isTablet ? `↻${rtSocket.reconnectAttempt || ''}` : (rtSocket.reconnectAttempt ? `Reconnexion ${rtSocket.reconnectAttempt}…` : 'Reconnexion…'))
              : rtSocket.state === 'unauthorized'
                ? 'Session'
                : 'Hors ligne';

    useEffect(() => {
        let active = true;
        const loadPublicSettings = async () => {
            try {
                const { data } = await api.get('/admin/settings/public');
                if (!active) return;
                setDirectMessagesEnabled(String(data?.direct_messages_enabled ?? 'true') === 'true');
                setAppName(String(data?.app_name || DEFAULT_APP_NAME));
                setFooterText(String(data?.app_footer_text || '© 2026 ADM GP - Tous droits réservés'));
                setContactEmail(String(data?.app_contact_email || ''));
                setContactPhone(String(data?.app_contact_phone || ''));
                setContactAddress(String(data?.app_contact_address || ''));
                setAppLogoUrl(String(data?.app_logo_url || ''));
            } catch {
                if (active) {
                    setDirectMessagesEnabled(true);
                    setAppName(DEFAULT_APP_NAME);
                    setFooterText('© 2026 ADM GP - Tous droits réservés');
                    setContactEmail('');
                    setContactPhone('');
                    setContactAddress('');
                    setAppLogoUrl('');
                }
            }
        };
        if (user?.id) loadPublicSettings();
        return () => { active = false; };
    }, [user?.id]);

    // ── Popup instantané des notifications via WebSocket (+ fallback léger)
    useEffect(() => {
        if (!user?.id) return;
        const token = localStorage.getItem('accessToken');
        const socket = getSocket(token);
        let mounted = true;

        const checkNewNotifications = async () => {
            try {
                const { data } = await api.get('/notifications', { params: { page: 1, limit: 10 } });
                if (!mounted) return;
                const list = data?.notifications || [];

                // Initialisation silencieuse: ne pas popper les anciennes notifs déjà présentes
                if (seenNotifIdsRef.current.size === 0) {
                    list.forEach((n) => seenNotifIdsRef.current.add(n.id));
                    return;
                }

                const freshUnread = list
                    .filter((n) => !n.isRead && !seenNotifIdsRef.current.has(n.id))
                    .reverse(); // du plus ancien au plus récent pour un affichage naturel

                freshUnread.forEach((n) => {
                    notification.open({
                        key: `notif-${n.id}`,
                        message: n.title || 'Nouvelle notification',
                        description: n.body || '',
                        placement: 'topRight',
                        duration: 6,
                        onClick: () => {
                            if (n.link) navigate(n.link);
                        },
                    });
                });

                list.forEach((n) => seenNotifIdsRef.current.add(n.id));
            } catch {
                // silencieux: ne pas spammer l'utilisateur
            }
        };

        checkNewNotifications();
        const timer = setInterval(checkNewNotifications, 30000);
        const onNotification = (n) => {
            if (!mounted || !n?.id) return;
            if (seenNotifIdsRef.current.has(n.id)) return;
            seenNotifIdsRef.current.add(n.id);
            notification.open({
                key: `notif-${n.id}`,
                message: n.title || 'Nouvelle notification',
                description: n.body || '',
                placement: 'topRight',
                duration: 6,
                onClick: () => {
                    if (n.link) navigate(n.link);
                },
            });
        };
        socket?.on('notification:new', onNotification);
        return () => {
            mounted = false;
            clearInterval(timer);
            socket?.off('notification:new', onNotification);
        };
    }, [user?.id, notification, navigate]);

    // ── Popup instantané des messages privés (hors page Discussions)
    useEffect(() => {
        if (!user?.id) return;
        const token = localStorage.getItem('accessToken');
        const socket = getSocket(token);
        const onDirectMessage = (payload) => {
            const msg = payload?.message;
            if (!msg?.id) return;
            if (msg.receiverId !== user.id) return;
            if (seenDmPopupIdsRef.current.has(msg.id)) return;
            if (location.pathname.startsWith('/discussions')) return;

            seenDmPopupIdsRef.current.add(msg.id);
            if (seenDmPopupIdsRef.current.size > 400) {
                seenDmPopupIdsRef.current.clear();
                seenDmPopupIdsRef.current.add(msg.id);
            }

            const senderName = msg.sender?.name || 'Utilisateur';
            const preview = (msg.body || msg.fileName || 'Nouveau message').slice(0, 180);
            notification.open({
                key: `dm-popup-${msg.id}`,
                message: `Nouveau message de ${senderName}`,
                description: preview,
                placement: 'topRight',
                duration: 6,
                onClick: () => navigate('/discussions'),
            });
        };

        socket?.on('direct:message:new', onDirectMessage);
        return () => {
            socket?.off('direct:message:new', onDirectMessage);
        };
    }, [user?.id, location.pathname, notification, navigate]);

    // ── Popup instantané des messages du canal direction (hors page Discussions)
    useEffect(() => {
        if (!user?.id) return;
        const token = localStorage.getItem('accessToken');
        const socket = getSocket(token);
        const onDirectionMessage = (payload) => {
            const msg = payload?.message;
            if (!msg?.id) return;
            if (msg.senderId === user.id) return;
            if (seenDirectionPopupIdsRef.current.has(msg.id)) return;
            if (location.pathname.startsWith('/discussions')) return;

            seenDirectionPopupIdsRef.current.add(msg.id);
            if (seenDirectionPopupIdsRef.current.size > 400) {
                seenDirectionPopupIdsRef.current.clear();
                seenDirectionPopupIdsRef.current.add(msg.id);
            }

            const senderName = msg.sender?.name || 'Utilisateur';
            const preview = (msg.body || msg.fileName || 'Nouveau message').slice(0, 180);
            const directionName = payload?.directionName || 'votre direction';
            notification.open({
                key: `direction-popup-${msg.id}`,
                message: `Nouveau message (${directionName})`,
                description: `${senderName}: ${preview}`,
                placement: 'topRight',
                duration: 6,
                onClick: () => navigate('/discussions?channel=direction'),
            });
        };

        socket?.on('direction:message:new', onDirectionMessage);
        return () => {
            socket?.off('direction:message:new', onDirectionMessage);
        };
    }, [user?.id, location.pathname, notification, navigate]);

    useEffect(() => {
        if (!user?.id) return;
        const token = localStorage.getItem('accessToken');
        const socket = getSocket(token);
        const onProjectMessage = (payload) => {
            const msg = payload?.message;
            if (!msg?.id) return;
            if (msg.senderId === user.id) return;
            if (seenProjectPopupIdsRef.current.has(msg.id)) return;
            if (location.pathname.startsWith('/discussions')) return;

            seenProjectPopupIdsRef.current.add(msg.id);
            if (seenProjectPopupIdsRef.current.size > 400) {
                seenProjectPopupIdsRef.current.clear();
                seenProjectPopupIdsRef.current.add(msg.id);
            }

            const senderName = msg.sender?.name || 'Utilisateur';
            const preview = (msg.body || msg.fileName || 'Nouveau message').slice(0, 180);
            const projectName = payload?.projectName || 'votre projet';
            notification.open({
                key: `project-popup-${msg.id}`,
                message: `Nouveau message (projet ${projectName})`,
                description: `${senderName}: ${preview}`,
                placement: 'topRight',
                duration: 6,
                onClick: () => navigate('/discussions?channel=project'),
            });
        };

        socket?.on('project:message:new', onProjectMessage);
        return () => {
            socket?.off('project:message:new', onProjectMessage);
        };
    }, [user?.id, location.pathname, notification, navigate]);

    // ── Fermer le drawer mobile à chaque changement de route ─────
    useEffect(() => {
        if (!isMobile) return undefined;
        const timer = setTimeout(() => setDrawerOpen(false), 0);
        return () => clearTimeout(timer);
    }, [location.pathname, isMobile]);

    const toggleSidebar = () => {
        if (isMobile) { setDrawerOpen((o) => !o); return; }
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem('sidebarCollapsed', String(next)); } catch { /* ignore */ }
    };

    const goTo = (path) => {
        navigate(path);
        if (isMobile) setDrawerOpen(false);
    };

    const runGlobalSearch = async () => {
        const q = String(globalSearch || '').trim();
        if (!q) {
            setGlobalSearchResults([]);
            return;
        }
        setGlobalSearchLoading(true);
        try {
            const { data } = await api.get('/dashboard/search-global', {
                params: {
                    q,
                    types: globalSearchTypes.join(','),
                    from: globalFromDate || undefined,
                    to: globalToDate || undefined,
                    limit: 20,
                },
            });
            setGlobalSearchResults(Array.isArray(data?.items) ? data.items : []);
        } catch {
            setGlobalSearchResults([]);
        } finally {
            setGlobalSearchLoading(false);
        }
    };

    const searchPanelMaxWidth = { width: 'min(430px, 92vw)' };

    const globalSearchFiltersBody = (
        <>
            <Space wrap size={6} style={{ marginBottom: 8 }}>
                <Checkbox.Group
                    options={[
                        { label: 'Réunions', value: 'meetings' },
                        { label: 'Missions', value: 'missions' },
                        { label: 'Plannings', value: 'plannings' },
                        { label: 'Messages', value: 'messages' },
                    ]}
                    value={globalSearchTypes}
                    onChange={(v) => setGlobalSearchTypes(v)}
                />
            </Space>
            <Space wrap size={6} style={{ marginBottom: 8 }}>
                <input type="date" value={globalFromDate} onChange={(e) => setGlobalFromDate(e.target.value)} />
                <input type="date" value={globalToDate} onChange={(e) => setGlobalToDate(e.target.value)} />
                <Button size="small" onClick={runGlobalSearch} loading={globalSearchLoading}>Filtrer</Button>
            </Space>
            <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
                {globalSearchResults.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun résultat" />
                ) : (
                    globalSearchResults.map((item) => (
                        <div
                            key={`${item.type}-${item.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                goTo(item.link || '/dashboard');
                                setGlobalSearchResults([]);
                                setMobileSearchOpen(false);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && goTo(item.link || '/dashboard')}
                            style={{ padding: '8px 6px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                        >
                            <Text strong>{item.title || 'Sans titre'}</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                {item.subtitle || ''} {item.date ? `• ${new Date(item.date).toLocaleString('fr-FR')}` : ''}
                            </Text>
                        </div>
                    ))
                )}
            </div>
        </>
    );

    const searchPanel = (
        <div style={searchPanelMaxWidth}>
            {globalSearchFiltersBody}
        </div>
    );

    const mobileSearchPanel = (
        <div style={{ ...searchPanelMaxWidth, maxWidth: 'min(400px, 92vw)' }}>
            <Input.Search
                placeholder="Réunions, missions, plannings…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onSearch={runGlobalSearch}
                allowClear
                loading={globalSearchLoading}
                style={{ marginBottom: 10, width: '100%' }}
            />
            {globalSearchFiltersBody}
        </div>
    );

    // ── Éléments du menu sidebar ──────────────────────────────────
    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: 'Tableau de bord',
        },
        {
            key: '/calendar',
            icon: <CalendarOutlined />,
            label: 'Calendrier',
        },
        {
            key: '/events',
            icon: <UnorderedListOutlined />,
            label: 'Evenements',
        },
        {
            key: '/planning',
            icon: <ScheduleOutlined />,
            label: 'Planning',
        },
        ...(validationCanSeeMenu ? [{
            key: '/a-valider',
            icon: (
                <Badge count={validationCounts.total} size="small" offset={[-2, 2]} color="#fa541c">
                    <CheckCircleOutlined />
                </Badge>
            ),
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                    <span>À valider</span>
                    <Badge
                        count={validationCounts.total}
                        size="small"
                        style={{ boxShadow: 'none' }}
                        color="#fa541c"
                    />
                </span>
            ),
        }] : []),
        {
            key: '/meetings',
            icon: <TeamOutlined />,
            label: 'Réunions',
        },
        {
            key: '/missions',
            icon: <FlagOutlined />,
            label: 'Missions',
        },
        {
            key: '/rooms',
            icon: <HomeOutlined />,
            label: 'Salles',
        },
        {
            key: '/projects',
            icon: <ProjectOutlined />,
            label: 'Projets',
        },
        ...(canAccessRepertoire(user?.role) ? [{
            key: '/repertoire',
            icon: <ContactsOutlined />,
            label: 'Répertoire',
        }] : []),
        {
            key: '/notifications',
            icon: <BellOutlined />,
            label: 'Notifications',
        },
        ...(directMessagesEnabled ? [{
            key: '/discussions',
            icon: <MessageOutlined />,
            label: 'Discussions',
        }] : []),
        ...(user?.role === 'DG' ? [{
            key: '/admin/directions',
            icon: <ApartmentOutlined />,
            label: 'Directions',
        }] : []),
        // Section admin — sous-menu (routes /admin/*)
        ...(isPrivilegedAdmin(user?.role) ? [
            { type: 'divider' },
            {
                key: 'submenu-admin',
                icon: <SettingOutlined />,
                label: 'Administration',
                children: getAdminNavForRole(isSuperAdmin(user?.role)).map((item) => ({
                    key: item.path,
                    icon: <item.icon style={{ fontSize: 14 }} />,
                    label: item.label,
                })),
            },
        ] : []),
    ];

    const resolveMenuLabel = (pathname) => {
        for (const m of menuItems) {
            if (m.type === 'divider') continue;
            if (m.key === pathname) return m.label;
            if (m.children) {
                const sub = m.children.find((c) => c.key === pathname);
                if (sub) return sub.label;
            }
        }
        return '';
    };

    // ── Menu utilisateur (dropdown en-tête) ───────────────────────
    const userMenuItems = [
        {
            key: 'user-info',
            disabled: true,
            label: (
                <div style={{ padding: '6px 0', pointerEvents: 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <UserAvatar user={user} size={40} />
                    <div>
                        <Text strong style={{ display: 'block', fontSize: 14 }}>{user?.name}</Text>
                        {user?.jobTitle ? (
                            <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                                {user.jobTitle}
                            </Text>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
                        <div style={{ marginTop: 3 }}>
                            <Tag color={ROLE_COLORS[user?.role]} style={{ fontSize: 11, margin: 0 }}>
                                {ROLE_LABELS[user?.role] || user?.role}
                            </Tag>
                        </div>
                    </div>
                </div>
            ),
        },
        { type: 'divider' },
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Mon profil',
            onClick: () => navigate('/profile'),
        },
        {
            key: 'theme-toggle',
            icon: isDark ? <SunOutlined /> : <MoonOutlined />,
            label: isDark ? 'Passer en mode clair' : 'Passer en mode sombre',
            onClick: toggleMode,
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Se déconnecter',
            danger: true,
            onClick: () => {
                modal.confirm({
                    title: 'Se déconnecter',
                    content: 'Êtes-vous sûr de vouloir vous déconnecter ?',
                    okText: 'Se déconnecter',
                    cancelText: 'Annuler',
                    onOk: () => { logout(); navigate('/login'); },
                });
            },
        },
    ];

    // ── Contenu du menu sidebar (desktop + drawer mobile) ─────────
    // Conteneur flex : le Sider Ant Design enveloppe les enfants dans .ant-layout-sider-children
    // (pas en flex), donc flex:1 sur la zone menu ne fonctionnait pas sans ce wrapper.
    const menuContent = (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            {/* Logo / titre */}
            <div
                style={{
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isMobile || !collapsed ? 'flex-start' : 'center',
                    paddingLeft: isMobile ? 20 : collapsed ? 0 : 20,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                }}
            >
                {(!collapsed || isMobile) ? (
                    <span
                        role="button"
                        tabIndex={0}
                        style={{
                            color: 'white',
                            fontWeight: 700,
                            fontSize: isMobile ? 14 : 15,
                            cursor: 'pointer',
                            letterSpacing: '0.02em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            minWidth: 0,
                            maxWidth: isMobile ? 'calc(100% - 8px)' : 200,
                        }}
                        onClick={() => goTo('/dashboard')}
                        onKeyDown={(e) => e.key === 'Enter' && goTo('/dashboard')}
                    >
                        <img
                            src={resolveAppLogoSrc(appLogoUrl)}
                            alt={appName}
                            style={{
                                width: 'auto',
                                height: 'auto',
                                maxWidth: isMobile ? 100 : 120,
                                maxHeight: 36,
                                objectFit: 'contain',
                                marginRight: 8,
                                flexShrink: 0,
                                display: 'block',
                            }}
                        />
                        <span
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                            }}
                            title={appName}
                        >
                            {appName}
                        </span>
                    </span>
                ) : (
                    <span
                        role="button"
                        tabIndex={0}
                        style={{ fontSize: 20, cursor: 'pointer' }}
                        onClick={() => goTo('/dashboard')}
                        onKeyDown={(e) => e.key === 'Enter' && goTo('/dashboard')}
                    >
                        <img
                            src={resolveAppLogoSrc(appLogoUrl)}
                            alt={appName}
                            style={{ width: 40, height: 40, objectFit: 'contain' }}
                        />
                    </span>
                )}
            </div>

            {/* Menu — zone défilable (minHeight:0 requis pour le scroll en flexbox) */}
            <div
                className="mobile-scroll"
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                }}
            >
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    openKeys={menuOpenKeys}
                    onOpenChange={setMenuOpenKeys}
                    items={menuItems.map((item) => {
                        if (item.type === 'divider') {
                            return { type: 'divider', style: { borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0' } };
                        }
                        if (item.children) {
                            return {
                                ...item,
                                children: item.children.map((child) => ({
                                    ...child,
                                    onClick: () => goTo(child.key),
                                })),
                            };
                        }
                        return { ...item, onClick: () => goTo(item.key) };
                    })}
                    style={{ borderRight: 0, marginTop: 4, background: 'transparent' }}
                    inlineCollapsed={!isMobile && collapsed}
                />
            </div>

            {/* Profil en bas du sidebar */}
            {!collapsed && !isMobile && (
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(255,255,255,0.04)',
                    flexShrink: 0,
                }}>
                    <UserAvatar user={user} size={32} />
                    <div style={{ minWidth: 0 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 500, display: 'block' }}>
                            {user?.name}
                        </Text>
                        <Tag
                            color={ROLE_COLORS[user?.role]}
                            style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', marginTop: 2 }}
                        >
                            {ROLE_LABELS[user?.role] || user?.role}
                        </Tag>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <Layout style={{ minHeight: '100vh', minWidth: 0, width: '100%' }}>
            {/* ── Sidebar desktop ── */}
            {!isMobile && (
                <Sider
                    theme="dark"
                    collapsible
                    collapsed={collapsed}
                    onCollapse={setCollapsed}
                    trigger={null}
                    width={220}
                    collapsedWidth={64}
                    style={{
                        overflow: 'hidden',
                        height: '100vh',
                        position: 'fixed',
                        left: 0, top: 0, bottom: 0,
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(180deg, #1565C0 0%, #0D47A1 100%)',
                    }}
                >
                    {menuContent}
                </Sider>
            )}

            {/* ── Drawer mobile ── */}
            {isMobile && (
                <Drawer
                    title={null}
                    placement="left"
                    onClose={() => setDrawerOpen(false)}
                    open={drawerOpen}
                    styles={{ body: { padding: 0, background: 'linear-gradient(180deg, #1565C0 0%, #0D47A1 100%)', display: 'flex', flexDirection: 'column', height: '100%' } }}
                    width={300}
                    className="app-sidebar-drawer"
                >
                    {menuContent}
                </Drawer>
            )}

            {/* ── Contenu principal ── */}
            <Layout style={{
                marginLeft: isMobile ? 0 : collapsed ? 64 : 220,
                minHeight: '100vh',
                minWidth: 0,
                flex: 1,
                transition: 'margin-left 0.2s',
            }}>
                {/* ── Header ── */}
                <Header
                    className="app-shell-header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        padding: isMobile
                            ? '0 max(8px, env(safe-area-inset-right)) 0 max(4px, env(safe-area-inset-left))'
                            : '0 max(16px, env(safe-area-inset-right)) 0 max(8px, env(safe-area-inset-left))',
                        background: isDark ? '#14171c' : 'linear-gradient(90deg, #1565C0 0%, #0D47A1 100%)',
                        borderBottom: isDark ? '1px solid #2b2f36' : 'none',
                        height: 56,
                        minHeight: 56,
                        gap: isXs ? 4 : 8,
                        position: 'sticky',
                        top: 0,
                        zIndex: 99,
                        overflow: 'hidden',
                    }}
                >
                    {/* Bouton toggle sidebar */}
                    <Button
                        type="text"
                        icon={
                            isMobile
                                ? (drawerOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)
                                : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)
                        }
                        onClick={toggleSidebar}
                        className="touch-target"
                        style={{ fontSize: 18, width: 44, height: 44, flexShrink: 0, color: isDark ? undefined : 'white' }}
                        title={collapsed || !drawerOpen ? 'Ouvrir le menu' : 'Fermer le menu'}
                    />

                    {/* Titre page (petit écran : menu tiroir) */}
                    {isMobile && (
                        <Text
                            strong
                            style={{
                                flex: '1 1 auto',
                                fontSize: isXs ? 13 : 14,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                                paddingRight: 4,
                                color: isDark ? undefined : 'white',
                            }}
                            title={resolveMenuLabel(location.pathname)}
                        >
                            {resolveMenuLabel(location.pathname)}
                        </Text>
                    )}

                    <div style={{ flex: showInlineSearch ? 1 : 'none', minWidth: 0 }} />

                    {showInlineSearch && (
                        <Popover
                            content={searchPanel}
                            title="Recherche globale"
                            trigger="click"
                            placement="bottomRight"
                            overlayStyle={{ maxWidth: '96vw' }}
                        >
                            <Input.Search
                                placeholder={isTablet ? 'Recherche globale…' : 'Réunions, missions, plannings, messages…'}
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                onSearch={runGlobalSearch}
                                allowClear
                                loading={globalSearchLoading}
                                style={{
                                    width: '100%',
                                    maxWidth: isTablet ? 280 : 420,
                                    minWidth: 0,
                                }}
                            />
                        </Popover>
                    )}

                    {!showInlineSearch && (
                        <Popover
                            content={mobileSearchPanel}
                            title="Recherche globale"
                            trigger={['click']}
                            placement="bottomRight"
                            open={mobileSearchOpen}
                            onOpenChange={setMobileSearchOpen}
                            overlayStyle={{ maxWidth: '96vw' }}
                        >
                            <Button
                                type="text"
                                icon={<SearchOutlined />}
                                className="touch-target"
                                aria-label="Recherche globale"
                                style={{ flexShrink: 0, color: isDark ? undefined : 'white' }}
                            />
                        </Popover>
                    )}

                    <Space size={isXs ? 2 : 8} style={{ flexShrink: 0, marginLeft: isXs ? 0 : 4 }}>
                        <Button
                            type="text"
                            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                            onClick={toggleMode}
                            className="touch-target"
                            title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
                            style={{ color: isDark ? undefined : 'white' }}
                        />
                        {showInlineSearch && (
                            <Tooltip title={getSocketStatusDetail(rtSocket)}>
                                <Tag
                                    color={socketTagColor}
                                    style={{
                                        margin: 0,
                                        maxWidth: isTablet ? 120 : 220,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: isXs ? 'none' : 'inline-block',
                                    }}
                                >
                                    {isTablet ? socketShortLabel : getSocketStatusLabel(rtSocket)}
                                </Tag>
                            </Tooltip>
                        )}
                        {!showInlineSearch && (
                            <Tooltip title={getSocketStatusDetail(rtSocket)}>
                                <span
                                    role="status"
                                    aria-label={getSocketStatusLabel(rtSocket)}
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        background:
                                            rtSocket.state === 'connected' && rtSocket.browserOnline ? '#52c41a'
                                            : rtSocket.state === 'connecting' ? '#1565C0'
                                            : (rtSocket.state === 'reconnecting' ? '#fa8c16'
                                                : (rtSocket.state === 'unauthorized' ? '#ff4d4f' : '#bfbfbf')),
                                        boxShadow: rtSocket.state === 'connected' && rtSocket.browserOnline
                                            ? '0 0 0 1px rgba(82,196,26,0.35)' : 'none',
                                    }}
                                />
                            </Tooltip>
                        )}
                        <NotificationBell tone={isDark ? undefined : 'onDark'} />

                        <Dropdown
                            menu={{ items: userMenuItems }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Space
                                style={{
                                    cursor: 'pointer',
                                    padding: isXs ? '4px 6px' : '6px 10px',
                                    borderRadius: 8,
                                    minHeight: 44,
                                    maxWidth: showHeaderUserDetails ? 220 : 52,
                                }}
                            >
                                <UserAvatar user={user} size={isXs ? 26 : 28} />
                                {showHeaderUserDetails && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, lineHeight: 1.2, minWidth: 0, overflow: 'hidden' }}>
                                        <Text style={{ fontSize: 13, fontWeight: 500, color: isDark ? undefined : 'white' }} ellipsis>
                                            {user?.name}
                                        </Text>
                                        <Tag
                                            color={ROLE_COLORS[user?.role]}
                                            style={{ fontSize: 10, padding: '0 4px', lineHeight: '14px', margin: 0, width: 'fit-content', maxWidth: '100%' }}
                                        >
                                            {ROLE_LABELS[user?.role] || user?.role}
                                        </Tag>
                                    </div>
                                )}
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                {/* ── Page ── */}
                <Content
                    style={{
                        padding: isXs ? 8 : isMobile ? 12 : isTablet ? 16 : 24,
                        paddingBottom: `max(${isXs ? 16 : 24}px, env(safe-area-inset-bottom))`,
                        background: isDark ? '#0f1115' : '#f5f5f5',
                        minHeight: 'calc(100vh - 56px)',
                        minWidth: 0,
                        boxSizing: 'border-box',
                    }}
                >
                    <OfflineBanner />
                    <div style={{ maxWidth: '100%', minWidth: 0 }}>
                        <Outlet />
                    </div>
                    <div
                        style={{
                            marginTop: isXs ? 16 : 24,
                            textAlign: 'center',
                            paddingLeft: 8,
                            paddingRight: 8,
                            wordBreak: 'break-word',
                        }}
                    >
                        <Text type="secondary" style={{ fontSize: isXs ? 11 : 12, display: 'block', lineHeight: 1.5 }}>
                            {footerText}
                        </Text>
                        {(contactEmail || contactPhone || contactAddress) && (
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: isXs ? 10 : 11,
                                    display: 'block',
                                    marginTop: 6,
                                    lineHeight: 1.6,
                                }}
                            >
                                {[contactEmail, contactPhone, contactAddress].filter(Boolean).join(
                                    isXs ? ' · ' : ' | ',
                                )}
                            </Text>
                        )}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
