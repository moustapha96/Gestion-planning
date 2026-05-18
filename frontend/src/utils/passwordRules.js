/** Règles alignées sur backend/src/utils/passwordUtils.js (CDC §3.1.2) */

export const PASSWORD_FORM_RULES = [
    { required: true, message: 'Mot de passe requis' },
    {
        validator: (_, value) => {
            const s = String(value || '');
            if (s.length < 8) return Promise.reject(new Error('Au moins 8 caractères'));
            if (!/[A-Z]/.test(s)) return Promise.reject(new Error('Au moins une majuscule'));
            if (!/[0-9]/.test(s)) return Promise.reject(new Error('Au moins un chiffre'));
            if (!/[^A-Za-z0-9]/.test(s)) {
                return Promise.reject(new Error('Au moins un caractère spécial (!@#$%^&*…)'));
            }
            return Promise.resolve();
        },
    },
];

export const PASSWORD_HINT =
    '8 caractères minimum, une majuscule, un chiffre et un caractère spécial.';
