import { API_BASE } from '../api/client';

/**
 * URL affichable pour une image (logo, avatar uploadé, etc.).
 * Les fichiers sous /uploads/ sont servis par le backend ; en dev, Vite proxy /uploads.
 */
export function resolveImageSrc(url) {
    const u = String(url || '').trim();
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/uploads/')) {
        return API_BASE ? `${API_BASE}${u}` : u;
    }
    return u;
}
