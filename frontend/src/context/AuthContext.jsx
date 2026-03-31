import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

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
        localStorage.setItem('user', JSON.stringify(u));
        setUser(u);
        return { user: u };
    };

    /** Finalise la connexion après validation du code TOTP */
    const loginWith2FA = async (tempToken, code) => {
        const res = await api.post('/auth/2fa-login', { tempToken, code });
        const { accessToken, refreshToken, user: u } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(u));
        setUser(u);
        return u;
    };

    const logout = () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateUser = (u) => {
        localStorage.setItem('user', JSON.stringify(u));
        setUser(u);
    };

    return (
        <AuthContext.Provider value={{ user, login, loginWith2FA, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
