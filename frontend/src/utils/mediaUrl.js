import { API_BASE } from '../api/client';

/** Logo par défaut des projets (frontend/public/logo-gp.png). */
export const DEFAULT_PROJECT_LOGO = '/logo-gp.png';

const FRONTEND_STATIC_PREFIXES = [
    '/logo-gp.png',
    '/adm_logo.png',
    '/gp-',
    '/logo.',
    '/favicon',
    '/icons/',
];

function normalizeMediaPath(url) {
    let u = String(url || '').trim();
    if (!u) return '';
    if (u.startsWith('uploads/')) u = `/${u}`;
    return u;
}

function isFrontendStaticPath(path) {
    return FRONTEND_STATIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function resolveUploadSrc(path) {
    const base = String(API_BASE || '').replace(/\/$/, '');
    if (!base) return path;
    if (base && path.startsWith(base)) return path;
    return `${base}${path}`;
}

/**
 * URL affichable pour une image (logo, avatar uploadé, etc.).
 * - /uploads/… → backend (API_BASE en prod / mobile, proxy Vite en dev web)
 * - /logo-gp.png, /gp-64.png… → assets statiques du frontend
 */
export function resolveImageSrc(url) {
    const u = normalizeMediaPath(url);
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/uploads/')) return resolveUploadSrc(u);
    if (u.startsWith('/')) return u;
    return `/${u}`;
}

/** Logo projet avec repli sur le logo par défaut si l’URL est vide. */
export function resolveProjectLogoSrc(logoUrl) {
    const u = normalizeMediaPath(logoUrl);
    if (!u) return DEFAULT_PROJECT_LOGO;
    return resolveImageSrc(u) || DEFAULT_PROJECT_LOGO;
}

/** Photo de profil utilisateur (uploads/avatars ou URL externe). */
export function resolveAvatarSrc(avatarUrl, cacheKey) {
    const resolved = resolveImageSrc(avatarUrl);
    if (!resolved) return null;
    const key = cacheKey === undefined || cacheKey === null ? '' : String(cacheKey).trim();
    // Ne jamais utiliser un chemin complet comme clé de cache (?v=/uploads/...)
    if (!key || key.includes('/')) return resolved;
    const separator = resolved.includes('?') ? '&' : '?';
    return `${resolved}${separator}v=${encodeURIComponent(key)}`;
}

export function isDefaultProjectLogo(logoUrl) {
    const u = normalizeMediaPath(logoUrl);
    return !u || u === DEFAULT_PROJECT_LOGO;
}
