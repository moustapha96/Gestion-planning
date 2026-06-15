import { resolveImageSrc } from './mediaUrl';

export const DEFAULT_APP_NAME = 'ADM GP';

/** Logo public servi par Vite depuis frontend/public/gp-64.png */
export const DEFAULT_APP_LOGO_PATH = '/gp-64.png';

export function hasCustomAppLogo(logoUrl) {
    return Boolean(String(logoUrl || '').trim());
}

/** URL affichable : logo configuré ou logo par défaut public/gp-64.png */
export function resolveAppLogoSrc(logoUrl) {
    const custom = resolveImageSrc(logoUrl);
    if (custom) return custom;
    return DEFAULT_APP_LOGO_PATH;
}
