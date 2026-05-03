import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import NotificationBell from './NotificationBell';
import { isPrivilegedAdmin } from '../utils/roles';
import logo from '../assets/logo-gp.png';

const NAV_BTN =
    'shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap';
const NAV_ACTIVE = 'text-white font-semibold shadow-sm';
const NAV_IDLE = 'text-blue-100 hover:text-white hover:bg-white/10';

function buildLinks(user) {
    const items = [{ path: '/dashboard', label: 'Tableau de bord' }];
    if (user?.role !== 'ADMIN') {
        items.push(
            { path: '/planning', label: 'Planning' },
            { path: '/meetings', label: 'Réunions' },
            { path: '/missions', label: 'Missions' },
        );
    }
    items.push(
        { path: '/rooms', label: 'Salles' },
        { path: '/calendar', label: 'Calendrier' },
        { path: '/events', label: 'Événements' },
        { path: '/projects', label: 'Projets' },
        { path: '/notifications', label: 'Notifications' },
    );
    if (isPrivilegedAdmin(user?.role)) {
        items.push({ path: '/admin/stats', label: 'Administration' });
    }
    return items;
}

export default function Navbar({ user }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const links = useMemo(() => buildLinks(user), [user]);

    useEffect(() => {
        setDrawerOpen(false);
    }, [location.pathname]);

    const isActive = (path) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const go = (path) => {
        navigate(path);
        setDrawerOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setDrawerOpen(false);
        navigate('/login');
    };

    const linkClass = (path) =>
        `${NAV_BTN} ${isActive(path) ? NAV_ACTIVE : NAV_IDLE}`;

    const linkStyle = (path) =>
        isActive(path)
            ? { background: 'rgba(255,255,255,0.18)', borderBottom: '2px solid rgba(255,255,255,0.8)' }
            : {};

    return (
        <nav
            className="sticky top-0 z-[100] text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)' }}
        >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 min-h-[52px]">
                {/* Logo + titre */}
                <button
                    type="button"
                    onClick={() => go('/dashboard')}
                    className="flex items-center gap-2 shrink-0 min-w-0 hover:opacity-90 transition-opacity rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}
                >
                    <img src={logo} alt="ADM GP logo" className="h-10 shrink-0" />
                    <div className="leading-tight text-left hidden sm:block min-w-0 max-w-[140px] md:max-w-none">
                        <div className="text-[15px] font-extrabold text-white leading-tight truncate">
                            ADM
                        </div>
                        <div className="text-[15px] font-extrabold text-[#48BB78] leading-tight truncate">
                            GP
                        </div>
                    </div>
                </button>

                {/* Navigation desktop — défilement horizontal, scrollbar fine visible */}
                <div
                    className="hidden md:flex flex-1 items-center justify-center min-w-0 mx-1 nav-bar-scroll"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(255,255,255,0.45) rgba(255,255,255,0.08)',
                    }}
                >
                    <div className="flex items-center gap-0.5 overflow-x-auto max-w-full py-1 px-1">
                        {links.map(({ path, label }) => (
                            <button
                                key={path}
                                type="button"
                                onClick={() => go(path)}
                                className={linkClass(path)}
                                style={linkStyle(path)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <Drawer
                    title={
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="ADM" style={{ height: 32 }} />
                            <span style={{ color: '#0D47A1', fontWeight: 700, fontSize: 15 }}>ADM · Gestion Planning</span>
                        </div>
                    }
                    placement="left"
                    onClose={() => setDrawerOpen(false)}
                    open={drawerOpen}
                    width={300}
                    rootClassName="navbar-drawer-root"
                    styles={{
                        header: { borderBottom: '2px solid #E3F2FD', background: '#F8FBFF' },
                        body: { padding: 0, display: 'flex', flexDirection: 'column', background: '#F8FBFF' },
                    }}
                    className="navbar-mobile-drawer"
                >
                    <div className="flex flex-col py-2">
                        {links.map(({ path, label }) => (
                            <button
                                key={path}
                                type="button"
                                onClick={() => go(path)}
                                style={isActive(path) ? {
                                    background: '#E3F2FD',
                                    color: '#0D47A1',
                                    fontWeight: 700,
                                    borderLeft: '4px solid #1565C0',
                                    textAlign: 'left',
                                    padding: '14px 16px 14px 12px',
                                    borderBottom: '1px solid #BBDEFB',
                                    fontSize: 15,
                                    cursor: 'pointer',
                                    width: '100%',
                                } : {
                                    textAlign: 'left',
                                    padding: '14px 16px',
                                    borderBottom: '1px solid #E3F2FD',
                                    color: '#1A2B4A',
                                    fontSize: 15,
                                    cursor: 'pointer',
                                    width: '100%',
                                    background: 'transparent',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => go('/profile')}
                            style={{
                                textAlign: 'left',
                                padding: '14px 16px',
                                borderBottom: '1px solid #E3F2FD',
                                color: '#1A2B4A',
                                fontSize: 15,
                                cursor: 'pointer',
                                width: '100%',
                                background: 'transparent',
                            }}
                        >
                            Mon profil
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            style={{
                                textAlign: 'left',
                                padding: '14px 16px',
                                color: '#D32F2F',
                                fontWeight: 600,
                                fontSize: 15,
                                cursor: 'pointer',
                                width: '100%',
                                background: 'transparent',
                            }}
                        >
                            Déconnexion
                        </button>
                    </div>
                </Drawer>

                {/* Droite : menu mobile + notif + profil + déconnexion (desktop) */}
                <div className="flex items-center gap-0.5 sm:gap-2 shrink-0 ml-auto">
                    <Button
                        type="text"
                        icon={<MenuOutlined className="text-lg !text-white" />}
                        onClick={() => setDrawerOpen(true)}
                        className="md:!hidden !w-11 !h-11 !min-w-[44px] flex items-center justify-center hover:!bg-white/15"
                        aria-label="Ouvrir le menu"
                    />

                    <NotificationBell tone="onDark" />

                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-1.5 hover:bg-white/15 px-1.5 sm:px-2 py-1 rounded-md transition-all max-w-[min(160px,32vw)] md:max-w-[min(180px,28vw)]"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Mon profil"
                    >
                        <div
                            className="w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-sm md:text-[13px] shrink-0"
                            style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.45)' }}
                        >
                            {user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-xs text-blue-100 truncate hidden md:inline">
                            {user?.name}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="hidden md:inline-flex text-xs font-medium px-2.5 sm:px-3 py-2 rounded-md transition-all shrink-0 hover:bg-white/20 items-center"
                        style={{
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.30)',
                            color: '#BBDEFB',
                            cursor: 'pointer',
                        }}
                    >
                        Déconnexion
                    </button>
                </div>
            </div>
        </nav>
    );
}
