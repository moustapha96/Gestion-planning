/**
 * Origine publique du backend (sans slash final, sans suffixe /api).
 * BACKEND_URL peut être "http://host:3001" ou "http://host/api" (prod derrière nginx).
 */
function backendOrigin() {
    const raw = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    let base = String(raw).trim().replace(/\/+$/, '');
    if (base.endsWith('/api')) {
        base = base.slice(0, -4);
    }
    return base;
}

/** Base des routes Express montées sous /api (ex. http://host/api). */
function apiBaseUrl() {
    return `${backendOrigin()}/api`;
}

/**
 * URL absolue pour une route publique (montée sous /api/public).
 * @param {string} path - ex. "/public/meeting-invitations/respond"
 * @param {Record<string, string>} [query]
 */
function buildPublicApiUrl(path, query = {}) {
    const pathname = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${apiBaseUrl()}${pathname}`);
    for (const [key, value] of Object.entries(query)) {
        if (value != null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}

module.exports = {
    backendOrigin,
    apiBaseUrl,
    buildPublicApiUrl,
};
