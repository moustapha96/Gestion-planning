import axios from 'axios';

// En dev (npm run dev) : on utilise toujours le proxy Vite (/api → backend) pour éviter CORS et ERR_CONNECTION_REFUSED
// En prod / mobile : VITE_API_URL = URL du backend (ex: https://api.example.com)
const envApiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const isLocalhost = envApiUrl && (envApiUrl.includes('localhost') || envApiUrl.includes('127.0.0.1'));
const isDevProxy = isDev && (!envApiUrl || isLocalhost);
const BASE = isDevProxy ? '' : (envApiUrl || '').replace(/\/api\/?$/, '');
const API_URL = isDevProxy ? '/api' : (BASE ? BASE + '/api' : '/api');
export const API_BASE = BASE || '';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests; leave Content-Type unset for FormData so axios sets multipart boundary
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data && config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config;
});

// Single refresh in flight: avoid multiple refresh calls when several requests get 401
let refreshPromise = null;

function clearSessionAndRedirect() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    refreshPromise = null;
    window.location.href = '/login';
}

// Handle token expiration: one refresh at a time, then retry or redirect
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const url = originalRequest?.url || '';
        const isPublicAuth = /\/auth\/(forgot-password|reset-password|login|activate|refresh)(\?|$)/.test(url);
        if (error.response?.status !== 401 || originalRequest._retry || isPublicAuth) {
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            clearSessionAndRedirect();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            }
            const response = await refreshPromise;

            const newToken = response.data?.accessToken;
            if (newToken) {
                localStorage.setItem('accessToken', newToken);
                api.defaults.headers.Authorization = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                const nextUser = response.data?.user;
                if (nextUser?.id) {
                    localStorage.setItem('user', JSON.stringify(nextUser));
                    window.dispatchEvent(new CustomEvent('auth-session-updated', { detail: { user: nextUser } }));
                }
                refreshPromise = null;
                return api(originalRequest);
            }
        } catch (refreshError) {
            refreshPromise = null;
            clearSessionAndRedirect();
            return Promise.reject(refreshError);
        }

        refreshPromise = null;
        return Promise.reject(error);
    }
);

export default api;