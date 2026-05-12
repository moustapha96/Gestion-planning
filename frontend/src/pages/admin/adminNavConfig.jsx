import {
    BarChartOutlined,
    UserOutlined,
    CalendarOutlined,
    BankOutlined,
    BellOutlined,
    FileTextOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    DatabaseOutlined,
    FolderOpenOutlined,
    ApartmentOutlined,
    ProjectOutlined,
    TagsOutlined,
} from '@ant-design/icons';

/** Liens de la zone Administration (sidebar + sous-menu principal). */
export const ADMIN_NAV_ITEMS = [
    { path: '/admin/stats', label: 'Statistiques', icon: BarChartOutlined, superOnly: false },
    { path: '/admin/users', label: 'Utilisateurs', icon: UserOutlined, superOnly: false },
    { path: '/admin/plannings', label: 'Plannings', icon: CalendarOutlined, superOnly: false },
    { path: '/admin/rooms', label: 'Salles', icon: BankOutlined, superOnly: false },
    { path: '/admin/notifications', label: 'Notifications', icon: BellOutlined, superOnly: false },
    { path: '/admin/audit', label: 'Journaux d\'audit', icon: FileTextOutlined, superOnly: false },
    { path: '/admin/roles', label: 'Rôles & permissions', icon: SafetyCertificateOutlined, superOnly: false },
    { path: '/admin/security', label: 'Sécurité', icon: SafetyCertificateOutlined, superOnly: false },
    { path: '/admin/config', label: 'Configuration globale', icon: SettingOutlined, superOnly: false },
    { path: '/admin/directions', label: 'Directions', icon: ApartmentOutlined, superOnly: false },
    { path: '/admin/projects', label: 'Projets (taxonomie)', icon: ProjectOutlined, superOnly: false },
    { path: '/admin/event-types', label: 'Types d\'événements', icon: TagsOutlined, superOnly: false },
    { path: '/admin/backups', label: 'Sauvegardes', icon: DatabaseOutlined, superOnly: false },
    { path: '/admin/documents', label: 'Documents (fichiers)', icon: FolderOpenOutlined, superOnly: true },
];

export function getAdminNavForRole(isSuperAdmin) {
    return ADMIN_NAV_ITEMS.filter((i) => !i.superOnly || isSuperAdmin);
}

export function getAdminPageTitle(pathname) {
    const found = ADMIN_NAV_ITEMS.find((i) => i.path === pathname);
    if (!found && pathname.startsWith('/admin/directions/')) return 'Directions';
    if (pathname === '/admin/event-types') return 'Types d\'événements';
    return found?.label || 'Administration';
}
