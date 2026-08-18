import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
const AUTH_USER_EVENT = 'auth-session-updated';

function persistUser(u) {
    if (!u) {
        localStorage.removeItem('user');
        return;
    }
    localStorage.setItem('user', JSON.stringify(u));
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const s = localStorage.getItem('user');
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    });

    /**
     * login : retourne { user } si succès direct
     *         retourne { twoFactorRequired: true, tempToken } si 2FA requise
     */
    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });

        // Challenge 2FA : le backend demande un code TOTP
        if (res.data.twoFactorRequired) {
            return { twoFactorRequired: true, tempToken: res.data.tempToken };
        }

        const { accessToken, refreshToken, user: u } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        persistUser(u);
        setUser(u);
        return { user: u };
    };

    /** Finalise la connexion après validation du code TOTP */
    const loginWith2FA = async (tempToken, code) => {
        const res = await api.post('/auth/2fa-login', { tempToken, code });
        const { accessToken, refreshToken, user: u } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        persistUser(u);
        setUser(u);
        return u;
    };

    const logout = () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        persistUser(null);
        setUser(null);
    };

    const updateUser = (u) => {
        persistUser(u);
        setUser(u);
    };

    const refreshSessionUser = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return null;
        const { data } = await api.get('/auth/me');
        persistUser(data);
        setUser(data);
        return data;
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!localStorage.getItem('accessToken')) return;
                const { data } = await api.get('/auth/me');
                if (!cancelled && data?.id) {
                    persistUser(data);
                    setUser(data);
                }
            } catch {
                /* 401 géré par l'intercepteur axios */
            }
        })();

        const onSessionUpdated = (event) => {
            const next = event?.detail?.user;
            if (next?.id) {
                persistUser(next);
                setUser(next);
            }
        };
        window.addEventListener(AUTH_USER_EVENT, onSessionUpdated);
        return () => {
            cancelled = true;
            window.removeEventListener(AUTH_USER_EVENT, onSessionUpdated);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, loginWith2FA, logout, updateUser, refreshSessionUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

export { AUTH_USER_EVENT };
