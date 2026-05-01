import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import NotificationBell from './NotificationBell';
import { isPrivilegedAdmin } from '../utils/roles';
import logo from '../assets/logo-gp.png';

const NAV_BTN =
    'shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 hover:bg-white/15 whitespace-nowrap';
const NAV_ACTIVE = 'bg-white/25 text-white shadow-sm';
const NAV_IDLE = 'text-blue-100';

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

    return (
        <nav
            className="sticky top-0 z-[100] text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0B2F6E 0%, #1565C0 100%)' }}
        >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 min-h-[52px]">
                {/* Logo + titre */}
                <button
                    type="button"
                    onClick={() => go('/dashboard')}
                    className="flex items-center gap-2 shrink-0 min-w-0 hover:opacity-90 transition-opacity rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}
                >
                    <img src={logo} alt="Gestion Planning logo" className="h-10 shrink-0" />
                    <div className="leading-tight text-left hidden sm:block min-w-0 max-w-[140px] md:max-w-none">
                        <div className="text-[15px] font-extrabold text-white leading-tight truncate">
                            Gestion
                        </div>
                        <div className="text-[15px] font-extrabold text-[#48BB78] leading-tight truncate">
                            Planning
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
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <Drawer
                    title={<span className="text-gray-900 font-semibold">Navigation</span>}
                    placement="left"
                    onClose={() => setDrawerOpen(false)}
                    open={drawerOpen}
                    width={320}
                    rootClassName="navbar-drawer-root"
                    styles={{
                        body: { padding: 0, display: 'flex', flexDirection: 'column' },
                    }}
                    className="navbar-mobile-drawer"
                >
                    <div className="flex flex-col py-2">
                        {links.map(({ path, label }) => (
                            <button
                                key={path}
                                type="button"
                                onClick={() => go(path)}
                                className={`text-left px-4 py-3.5 text-base border-b border-gray-100 transition-colors ${
                                    isActive(path)
                                        ? 'bg-blue-50 text-blue-800 font-semibold border-l-4 border-l-blue-600'
                                        : 'text-gray-800 hover:bg-gray-50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => go('/profile')}
                            className="text-left px-4 py-3.5 text-base border-b border-gray-100 text-gray-800 hover:bg-gray-50"
                        >
                            Mon profil
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="text-left px-4 py-3.5 text-base text-red-600 font-medium hover:bg-red-50"
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
                            className="w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-sm md:text-[13px] text-[#0D2F63] shrink-0"
                            style={{ background: '#48BB78' }}
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
                            background: 'rgba(255,255,255,0.14)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: 'white',
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
