import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ActivateAccount from './pages/ActivateAccount';
import Dashboard from './pages/Dashboard';
import Planning from './pages/Planning';
import Meetings from './pages/Meetings';
import MeetingFormPage from './pages/MeetingFormPage';
import Missions from './pages/Missions';
import MissionCreate from './pages/MissionCreate';
import MissionEdit from './pages/MissionEdit';
import Rooms from './pages/Rooms';
import AdminLayout from './pages/admin/AdminLayout';
import AdminRequireSuper from './pages/admin/AdminRequireSuper';
import {
    UsersTab,
    RoomsTab,
    SecurityTab,
    AppConfigTab,
} from './pages/admin/AdminSections';
import AdminRoleConfigTab from './pages/admin/AdminRoleConfigTab';
import AdminTaxonomyPage from './pages/admin/AdminTaxonomyPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminEventTypesPage from './pages/admin/AdminEventTypesPage';
import DirectionDetailPage from './pages/admin/DirectionDetailPage';
import DirectionEditPage from './pages/admin/DirectionEditPage';
import AdminStatsTab from './pages/AdminStatsTab';
import AdminPlanningsTab from './pages/AdminPlanningsTab';
import AdminAuditTab from './pages/AdminAuditTab';
import AdminNotifTab from './pages/AdminNotifTab';
import AdminSuperBackupsTab from './pages/AdminSuperBackupsTab';
import AdminSuperDocumentsTab from './pages/AdminSuperDocumentsTab';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import MeetingDetail from './pages/MeetingDetail';
import MissionDetail from './pages/MissionDetail';
import PlanningDetail from './pages/PlanningDetail';
import Notifications from './pages/Notifications';
import Discussions from './pages/Discussions';
import EventsUnified from './pages/EventsUnified';
import PendingValidations from './pages/PendingValidations';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectFormPage from './pages/ProjectFormPage';
import Repertoire from './pages/Repertoire';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import MobileInit from './components/MobileInit';
import { isPrivilegedAdmin, canAccessRepertoire, ROLES } from './utils/roles';

function ProtectedRoute() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <Outlet />;
}

function AdminRoute() {
    const { user } = useAuth();
    if (!isPrivilegedAdmin(user?.role)) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}

function RepertoireRoute() {
    const { user } = useAuth();
    if (!canAccessRepertoire(user?.role)) return <Navigate to="/dashboard" replace />;
    return <Repertoire />;
}

export default function App() {
    const { user } = useAuth();
    return (
        <BrowserRouter>
            <MobileInit />
            <PWAInstallPrompt />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/activate-account" element={<ActivateAccount />} />
                <Route path="/" element={<Home />} />
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/planning" element={<Planning />} />
                        <Route path="/planning/:id" element={<PlanningDetail />} />
                        <Route path="/a-valider" element={<PendingValidations />} />
                        <Route path="/plannings/:id" element={<PlanningDetail />} />
                        <Route path="/meetings" element={<Meetings />} />
                        <Route path="/meetings/new" element={<MeetingFormPage />} />
                        <Route path="/meetings/:id/edit" element={<MeetingFormPage />} />
                        <Route path="/meetings/:id" element={<MeetingDetail />} />
                        <Route path="/missions" element={<Missions />} />
                        <Route path="/missions/new" element={<MissionCreate />} />
                        <Route path="/missions/:id/edit" element={<MissionEdit />} />
                        <Route path="/missions/:id" element={<MissionDetail />} />
                        <Route path="/rooms" element={<Rooms />} />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/projects/new" element={<ProjectFormPage />} />
                        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
                        <Route path="/projects/:id" element={<ProjectDetail />} />
                        <Route path="/repertoire" element={<RepertoireRoute />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/discussions" element={<Discussions />} />
                        <Route path="/events" element={<EventsUnified />} />
                        <Route path="/profile" element={<Profile />} />
                        {user?.role === ROLES.DG && (
                            <>
                                <Route path="/admin/directions" element={<AdminTaxonomyPage variant="directions" />} />
                                <Route path="/admin/directions/:id" element={<DirectionDetailPage />} />
                                <Route path="/admin/directions/:id/edit" element={<DirectionEditPage />} />
                            </>
                        )}
                        <Route element={<AdminRoute />}>
                            <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<Navigate to="stats" replace />} />
                                <Route path="stats" element={<AdminStatsTab />} />
                                <Route path="users" element={<UsersTab />} />
                                <Route path="plannings" element={<AdminPlanningsTab />} />
                                <Route path="rooms" element={<RoomsTab />} />
                                <Route path="notifications" element={<AdminNotifTab />} />
                                <Route path="audit" element={<AdminAuditTab />} />
                                <Route path="roles" element={<AdminRoleConfigTab />} />
                                <Route path="security" element={<SecurityTab />} />
                                <Route path="config" element={<AppConfigTab />} />
                                <Route path="directions" element={<AdminTaxonomyPage variant="directions" />} />
                                <Route path="directions/:id" element={<DirectionDetailPage />} />
                                <Route path="directions/:id/edit" element={<DirectionEditPage />} />
                                <Route path="projects" element={<AdminProjectsPage />} />
                                <Route path="projects/new" element={<ProjectFormPage adminContext />} />
                                <Route path="projects/:id/edit" element={<ProjectFormPage adminContext />} />
                                <Route path="event-types" element={<AdminEventTypesPage />} />
                                <Route
                                    path="backups"
                                    element={<AdminSuperBackupsTab />}
                                />
                                <Route
                                    path="documents"
                                    element={(
                                        <AdminRequireSuper>
                                            <AdminSuperDocumentsTab />
                                        </AdminRequireSuper>
                                    )}
                                />
                                <Route path="*" element={<Navigate to="stats" replace />} />
                            </Route>
                            <Route path="/users" element={<Users />} />
                            <Route path="/logs" element={<Logs />} />
                        </Route>
                    </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
