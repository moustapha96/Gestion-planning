/**
 * Formate une erreur API e-mail déjà utilisé (code EMAIL_ALREADY_USED).
 * @returns {{ message: string, existingUser: object|null, canHardDelete: boolean }}
 */
export function parseEmailConflictError(err) {
    const data = err?.response?.data || {};
    const existingUser = data.existingUser || null;
    const base = data.error || err?.message || 'Cet e-mail est déjà utilisé';
    const message = existingUser
        ? `${base} — compte trouvé : ${existingUser.name} (${existingUser.email}), rôle ${existingUser.role}${existingUser.isActive ? '' : ', inactif'}.`
        : base;
    return {
        message,
        existingUser,
        canHardDelete: Boolean(data.canHardDelete && existingUser?.id),
        code: data.code || null,
    };
}
