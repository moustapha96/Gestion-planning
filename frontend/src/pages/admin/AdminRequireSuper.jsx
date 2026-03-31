import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../utils/roles';

/** Restreint une route au rôle SUPER_ADMIN. */
export default function AdminRequireSuper({ children }) {
    const { user } = useAuth();
    if (!isSuperAdmin(user?.role)) {
        return <Navigate to="/admin/stats" replace />;
    }
    return children;
}
