const { ROLES, normalizeStoredRole } = require('../config/roles');

const APP_SETTING_ADMIN_DIRECTION = 'role_config.admin_direction_id';
const APP_SETTING_ADMIN_JOB_PATTERNS = 'role_config.admin_job_patterns';
const APP_SETTING_FUNCTIONAL_ELEVATIONS = 'role_config.functional_elevations';

const ELEVATION_TYPES = {
    ADMIN: 'ADMIN',
    CONSOLIDATOR: 'CONSOLIDATOR',
    PROJECT_COORDINATOR: 'PROJECT_COORDINATOR',
    SERVICE_DIRECTOR: 'SERVICE_DIRECTOR',
};

const DEFAULT_ELEVATION_PATTERNS = {
    [ELEVATION_TYPES.ADMIN]: ['SG', 'DG', 'Secrétaire', 'Directeur', 'Direction générale'],
    [ELEVATION_TYPES.CONSOLIDATOR]: ['Consolidateur', 'consolidation', 'Chargé de consolidation'],
    [ELEVATION_TYPES.PROJECT_COORDINATOR]: ['Coordinateur', 'Coordination', 'coordinateur de projet'],
    [ELEVATION_TYPES.SERVICE_DIRECTOR]: ['Directeur de service', 'Chef de service', 'Directeur'],
};

const ASSIGNABLE_ROLES = [
    ROLES.RESPONSABLE,
    ROLES.COORDINATEUR,
    ROLES.CONSOLIDATEUR,
    ROLES.DG,
    ROLES.ASSISTANT,
    ROLES.ADMIN,
];

function emptyElevation() {
    return { directionId: null, jobTitlePatterns: [] };
}

function parsePatternsFromSetting(value, fallback) {
    if (!value) return [...fallback];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length) {
            return parsed.map((x) => String(x).trim()).filter(Boolean);
        }
    } catch {
        const split = String(value).split(',').map((x) => x.trim()).filter(Boolean);
        if (split.length) return split;
    }
    return [...fallback];
}

function normalizeElevationEntry(raw, type) {
    const defaults = DEFAULT_ELEVATION_PATTERNS[type] || [];
    const patterns = Array.isArray(raw?.jobTitlePatterns)
        ? raw.jobTitlePatterns.map((x) => String(x).trim()).filter(Boolean)
        : defaults;
    return {
        directionId: raw?.directionId?.trim() || null,
        jobTitlePatterns: patterns.length ? patterns : [...defaults],
    };
}

async function readFunctionalElevationsJson(prisma) {
    const row = await prisma.appSetting.findUnique({
        where: { key: APP_SETTING_FUNCTIONAL_ELEVATIONS },
    });
    if (!row?.value) return null;
    try {
        const parsed = JSON.parse(row.value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

async function getLegacyAdminElevation(prisma) {
    const [dirRow, patternsRow] = await Promise.all([
        prisma.appSetting.findUnique({ where: { key: APP_SETTING_ADMIN_DIRECTION } }),
        prisma.appSetting.findUnique({ where: { key: APP_SETTING_ADMIN_JOB_PATTERNS } }),
    ]);
    if (!dirRow?.value?.trim() && !patternsRow?.value) return null;
    return {
        directionId: dirRow?.value?.trim() || null,
        jobTitlePatterns: parsePatternsFromSetting(
            patternsRow?.value,
            DEFAULT_ELEVATION_PATTERNS[ELEVATION_TYPES.ADMIN],
        ),
    };
}

async function getFunctionalElevationsConfig(prisma) {
    const stored = await readFunctionalElevationsJson(prisma);
    const legacyAdmin = !stored?.[ELEVATION_TYPES.ADMIN]
        ? await getLegacyAdminElevation(prisma)
        : null;

    const result = {};
    for (const type of Object.values(ELEVATION_TYPES)) {
        const raw = stored?.[type] || (type === ELEVATION_TYPES.ADMIN ? legacyAdmin : null);
        result[type] = normalizeElevationEntry(raw || {}, type);
    }
    return result;
}

async function setFunctionalElevationsConfig(prisma, elevationsByType) {
    const current = await getFunctionalElevationsConfig(prisma);
    const merged = { ...current };
    for (const type of Object.values(ELEVATION_TYPES)) {
        if (elevationsByType?.[type] !== undefined) {
            merged[type] = normalizeElevationEntry(elevationsByType[type], type);
        }
    }
    await prisma.appSetting.upsert({
        where: { key: APP_SETTING_FUNCTIONAL_ELEVATIONS },
        create: { key: APP_SETTING_FUNCTIONAL_ELEVATIONS, value: JSON.stringify(merged) },
        update: { value: JSON.stringify(merged) },
    });
    if (merged[ELEVATION_TYPES.ADMIN]) {
        await setAdminElevationConfig(prisma, merged[ELEVATION_TYPES.ADMIN]);
    }
    return merged;
}

async function getAdminElevationConfig(prisma) {
    const all = await getFunctionalElevationsConfig(prisma);
    return all[ELEVATION_TYPES.ADMIN];
}

async function setAdminElevationConfig(prisma, { directionId, jobTitlePatterns }) {
    const elevations = await getFunctionalElevationsConfig(prisma);
    elevations[ELEVATION_TYPES.ADMIN] = normalizeElevationEntry(
        { directionId, jobTitlePatterns },
        ELEVATION_TYPES.ADMIN,
    );
    const patterns = elevations[ELEVATION_TYPES.ADMIN].jobTitlePatterns;
    await prisma.$transaction([
        prisma.appSetting.upsert({
            where: { key: APP_SETTING_FUNCTIONAL_ELEVATIONS },
            create: { key: APP_SETTING_FUNCTIONAL_ELEVATIONS, value: JSON.stringify(elevations) },
            update: { value: JSON.stringify(elevations) },
        }),
        prisma.appSetting.upsert({
            where: { key: APP_SETTING_ADMIN_DIRECTION },
            create: { key: APP_SETTING_ADMIN_DIRECTION, value: directionId || '' },
            update: { value: directionId || '' },
        }),
        prisma.appSetting.upsert({
            where: { key: APP_SETTING_ADMIN_JOB_PATTERNS },
            create: { key: APP_SETTING_ADMIN_JOB_PATTERNS, value: JSON.stringify(patterns) },
            update: { value: JSON.stringify(patterns) },
        }),
    ]);
    return elevations[ELEVATION_TYPES.ADMIN];
}

function jobTitleMatchesPatterns(jobTitle, patterns) {
    const jt = String(jobTitle || '').trim().toLowerCase();
    if (!jt) return false;
    return (patterns || []).some((p) => {
        const needle = String(p || '').trim().toLowerCase();
        return needle.length > 0 && jt.includes(needle);
    });
}

function qualifiesForElevation(user, elevationConfig) {
    if (!user?.directionId || !elevationConfig?.directionId) return false;
    if (user.directionId !== elevationConfig.directionId) return false;
    return jobTitleMatchesPatterns(user.jobTitle, elevationConfig.jobTitlePatterns);
}

async function resolveUserFunctionalCapabilities(prisma, user) {
    const elevations = await getFunctionalElevationsConfig(prisma);
    const stored = normalizeStoredRole(user?.role);
    const mayConsolidate = stored === ROLES.CONSOLIDATEUR
        || qualifiesForElevation(user, elevations[ELEVATION_TYPES.CONSOLIDATOR]);
    const mayCoordinateProject = stored === ROLES.COORDINATEUR
        || qualifiesForElevation(user, elevations[ELEVATION_TYPES.PROJECT_COORDINATOR]);
    const mayActAsServiceDirector = qualifiesForElevation(user, elevations[ELEVATION_TYPES.SERVICE_DIRECTOR]);
    const elevatedAdmin = stored === ROLES.ADMIN
        || stored === ROLES.SUPER_ADMIN
        || qualifiesForElevation(user, elevations[ELEVATION_TYPES.ADMIN]);

    return {
        elevatedAdmin,
        mayConsolidate,
        mayCoordinateProject,
        mayActAsServiceDirector,
    };
}

function userMayConsolidate(user) {
    if (!user) return false;
    const stored = normalizeStoredRole(user.storedRole || user.role);
    if (stored === ROLES.CONSOLIDATEUR) return true;
    return Boolean(user.functionalCapabilities?.mayConsolidate);
}

function userMayCoordinateProject(user) {
    return Boolean(user?.functionalCapabilities?.mayCoordinateProject);
}

function userMayActAsServiceDirector(user) {
    return Boolean(user?.functionalCapabilities?.mayActAsServiceDirector);
}

/**
 * Rôles attribués explicitement : jamais écrasés par l'élévation "intitulé de poste".
 * L'élévation ADMIN ne s'applique qu'au rôle RESPONSABLE (ex. SG de la Direction générale).
 */
const EXPLICIT_ROLES = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.DG,
    ROLES.ASSISTANT,
    ROLES.COORDINATEUR,
    ROLES.CONSOLIDATEUR,
];

/**
 * Rôle effectif à partir du rôle stocké + capacité d'élévation ADMIN.
 */
function computeEffectiveRole(storedRole, elevatedAdmin = false) {
    const stored = normalizeStoredRole(storedRole);
    if (stored === ROLES.SUPER_ADMIN) return ROLES.SUPER_ADMIN;
    if (EXPLICIT_ROLES.includes(stored)) return stored;
    if (elevatedAdmin) return ROLES.ADMIN;
    return stored;
}

/**
 * Rôle effectif pour les contrôles d'accès (élévation SG/DG de la Direction générale).
 */
async function resolveEffectiveRole(prisma, user) {
    const stored = normalizeStoredRole(user?.role);
    if (stored === ROLES.SUPER_ADMIN || EXPLICIT_ROLES.includes(stored)) {
        return computeEffectiveRole(stored, false);
    }
    const caps = await resolveUserFunctionalCapabilities(prisma, user);
    return computeEffectiveRole(stored, caps.elevatedAdmin);
}

async function enrichReqUser(prisma, jwtPayload) {
    if (!jwtPayload?.id) return jwtPayload;
    const dbUser = await prisma.user.findUnique({
        where: { id: jwtPayload.id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            directionId: true,
            jobTitle: true,
            isActive: true,
            isDeleted: true,
        },
    });
    if (!dbUser || dbUser.isDeleted || !dbUser.isActive) {
        const err = new Error('Compte inactif ou introuvable');
        err.statusCode = 401;
        throw err;
    }
    const functionalCapabilities = await resolveUserFunctionalCapabilities(prisma, dbUser);
    const effectiveRole = computeEffectiveRole(dbUser.role, functionalCapabilities.elevatedAdmin);
    return {
        ...jwtPayload,
        name: dbUser.name,
        role: effectiveRole,
        storedRole: normalizeStoredRole(dbUser.role),
        directionId: dbUser.directionId,
        jobTitle: dbUser.jobTitle,
        functionalCapabilities,
    };
}

async function getRoleDirectionRules(prisma) {
    const rows = await prisma.roleDirectionRule.findMany({
        include: { direction: { select: { id: true, name: true, code: true, isActive: true } } },
        orderBy: [{ role: 'asc' }, { direction: { name: 'asc' } }],
    });
    const byRole = {
        [ROLES.RESPONSABLE]: [],
        [ROLES.COORDINATEUR]: [],
        [ROLES.CONSOLIDATEUR]: [],
        [ROLES.DG]: [],
        [ROLES.ASSISTANT]: [],
        [ROLES.ADMIN]: [],
    };
    for (const row of rows) {
        if (!byRole[row.role]) byRole[row.role] = [];
        byRole[row.role].push({
            id: row.id,
            directionId: row.directionId,
            direction: row.direction,
        });
    }
    return byRole;
}

async function setRoleDirectionRules(prisma, rulesByRole) {
    const toCreate = [];
    for (const role of ASSIGNABLE_ROLES) {
        const directionIds = [...new Set((rulesByRole[role] || []).map((id) => String(id).trim()).filter(Boolean))];
        for (const directionId of directionIds) {
            toCreate.push({ role, directionId });
        }
    }
    await prisma.$transaction([
        prisma.roleDirectionRule.deleteMany({}),
        ...(toCreate.length
            ? [prisma.roleDirectionRule.createMany({ data: toCreate, skipDuplicates: true })]
            : []),
    ]);
    return getRoleDirectionRules(prisma);
}

async function isDirectionAllowedForRole(prisma, role, directionId) {
    const normalized = normalizeStoredRole(role);
    if (normalized === ROLES.SUPER_ADMIN || normalized === ROLES.ADMIN) {
        if (normalized === ROLES.ADMIN && directionId) {
            const count = await prisma.roleDirectionRule.count({
                where: { role: ROLES.ADMIN, directionId },
            });
            if (count === 0) {
                const total = await prisma.roleDirectionRule.count({ where: { role: ROLES.ADMIN } });
                return total === 0;
            }
            return count > 0;
        }
        return true;
    }
    if (!directionId) return true;
    const count = await prisma.roleDirectionRule.count({
        where: { role: normalized, directionId },
    });
    if (count > 0) return true;
    const total = await prisma.roleDirectionRule.count({ where: { role: normalized } });
    return total === 0;
}

async function validateUserRoleForDirection(prisma, role, directionId, jobTitle) {
    const normalized = normalizeStoredRole(role);
    if (!ASSIGNABLE_ROLES.includes(normalized) && normalized !== ROLES.SUPER_ADMIN) {
        return { ok: false, error: 'Rôle invalide.' };
    }
    if ((normalized === ROLES.DG || normalized === ROLES.ASSISTANT) && !directionId) {
        return { ok: false, error: 'Un utilisateur DG ou ASSISTANT doit être rattaché à une direction.' };
    }
    if (normalized === ROLES.SUPER_ADMIN) return { ok: true };
    if (normalized === ROLES.ADMIN && directionId) {
        const elevations = await getFunctionalElevationsConfig(prisma);
        if (qualifiesForElevation({ directionId, jobTitle }, elevations[ELEVATION_TYPES.ADMIN])) {
            return { ok: true };
        }
    }
    const allowed = await isDirectionAllowedForRole(prisma, normalized, directionId);
    if (!allowed) {
        return {
            ok: false,
            error: `Ce rôle n'est pas autorisé pour la direction sélectionnée (configuration rôles/directions).`,
        };
    }
    return { ok: true };
}

async function getFullRoleConfig(prisma) {
    const [rules, functionalElevations, directions] = await Promise.all([
        getRoleDirectionRules(prisma),
        getFunctionalElevationsConfig(prisma),
        prisma.direction.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
        }),
    ]);
    return {
        rules,
        adminElevation: functionalElevations[ELEVATION_TYPES.ADMIN],
        functionalElevations,
        elevationTypes: Object.values(ELEVATION_TYPES),
        directions,
        assignableRoles: ASSIGNABLE_ROLES,
    };
}

function qualifiesForAdminElevation(user, elevationConfig) {
    return qualifiesForElevation(user, elevationConfig);
}

module.exports = {
    APP_SETTING_ADMIN_DIRECTION,
    APP_SETTING_ADMIN_JOB_PATTERNS,
    APP_SETTING_FUNCTIONAL_ELEVATIONS,
    ELEVATION_TYPES,
    ASSIGNABLE_ROLES,
    DEFAULT_ELEVATION_PATTERNS,
    getAdminElevationConfig,
    setAdminElevationConfig,
    getFunctionalElevationsConfig,
    setFunctionalElevationsConfig,
    computeEffectiveRole,
    resolveEffectiveRole,
    resolveUserFunctionalCapabilities,
    enrichReqUser,
    getRoleDirectionRules,
    setRoleDirectionRules,
    validateUserRoleForDirection,
    getFullRoleConfig,
    jobTitleMatchesPatterns,
    qualifiesForElevation,
    qualifiesForAdminElevation,
    userMayConsolidate,
    userMayCoordinateProject,
    userMayActAsServiceDirector,
};
