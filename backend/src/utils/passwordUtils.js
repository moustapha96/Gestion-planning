/**
 * Utilitaires mot de passe — CDC §3.1.2
 */

const jwt = require('jsonwebtoken');

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

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

/** Secret JWT lié au hash actuel → lien invalidé après changement de mot de passe. */
function passwordResetJwtSecret(passwordHash) {
    return `${process.env.JWT_SECRET}${String(passwordHash || '').slice(-8)}`;
}

function createPasswordResetToken(user) {
    return jwt.sign(
        { id: user.id, purpose: 'password_reset' },
        passwordResetJwtSecret(user.passwordHash),
        { expiresIn: process.env.JWT_RESET_EXPIRY || '1h' },
    );
}

function buildPasswordResetUrl(token) {
    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Recherche utilisateur par e-mail (insensible à la casse), compte non supprimé.
 * @returns {Promise<import('@prisma/client').User|null>}
 */
async function findUserByEmail(prisma, email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    return prisma.user.findFirst({
        where: {
            email: { equals: normalized, mode: 'insensitive' },
            isDeleted: false,
        },
    });
}

function verifyPasswordResetToken(token, user) {
    return jwt.verify(token, passwordResetJwtSecret(user.passwordHash));
}

module.exports = {
    validatePasswordStrength,
    normalizeEmail,
    passwordResetJwtSecret,
    createPasswordResetToken,
    buildPasswordResetUrl,
    findUserByEmail,
    verifyPasswordResetToken,
};
