/**
 * Utilitaires mot de passe — CDC §3.1.2
 */

/**
 * Valide la complexité du mot de passe.
 * Règles : min 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial.
 * @param {string} password
 * @returns {string|null} Message d'erreur ou null si valide
 */
function validatePasswordStrength(password) {
    if (!password || password.length < 8) {
        return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Le mot de passe doit contenir au moins une lettre majuscule.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Le mot de passe doit contenir au moins un chiffre.';
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*…).';
    }
    return null;
}

module.exports = { validatePasswordStrength };
