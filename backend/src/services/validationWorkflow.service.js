const { ROLES } = require('../config/roles');
const {
    isPendingConsolidatorValidation,
    isPendingCoordinatorValidation,
} = require('../config/planningWorkflow');
const { getProjectCoordinator } = require('./projectCoordinator.service');
const { getGlobalConsolidatorRoleUsers } = require('./projectConsolidator.service');
const {
    resolveConsolidatorRecipients,
    resolveConsolidatorScope,
} = require('./consolidatorResolution.service');

function mapValidator(user, roleLabel, kind) {
    if (!user?.id) return null;
    return {
        id: user.id,
        name: user.name,
        email: user.email || null,
        role: user.role || null,
        roleLabel,
        kind,
    };
}

async function resolveCoordinatorValidators(prisma, projectId) {
    const coordinator = await getProjectCoordinator(prisma, projectId);
    if (coordinator) {
        return {
            validators: [mapValidator(coordinator, 'coordinateur du projet', 'coordinator')].filter(Boolean),
            scope: 'project',
            scopeLabel: 'coordinateur du projet',
            isFallback: false,
        };
    }
    const globalUsers = await getGlobalConsolidatorRoleUsers(prisma);
    return {
        validators: globalUsers
            .filter((u) => u.isActive !== false && !u.isDeleted)
            .map((u) => mapValidator(u, 'consolidateur (rôle global — coordinateur non désigné)', 'global'))
            .filter(Boolean),
        scope: 'global',
        scopeLabel: 'consolidateur (rôle global)',
        isFallback: true,
    };
}

async function resolveConsolidatorValidators(prisma, { projectId, directionId, ownerUserId } = {}) {
    const scopeInfo = await resolveConsolidatorScope(prisma, { projectId, directionId, ownerUserId });
    const recipients = await resolveConsolidatorRecipients(prisma, {
        projectId,
        directionId,
        ownerUserId,
    });
    const roleLabel = scopeInfo.scopeLabel;
    return {
        validators: recipients
            .map((u) => mapValidator(u, roleLabel, 'consolidator'))
            .filter(Boolean),
        scope: scopeInfo.scope,
        scopeLabel: scopeInfo.scopeLabel,
        isFallback: scopeInfo.scope === 'global',
    };
}

function buildStepPayload(step, totalSteps, stepLabel, actionLabel, resolver) {
    return {
        inWorkflow: true,
        currentStep: step,
        totalSteps,
        stepLabel,
        actionLabel,
        pendingValidators: resolver.validators,
        resolverScope: resolver.scope,
        resolverScopeLabel: resolver.scopeLabel,
        isFallback: Boolean(resolver.isFallback),
        pendingValidatorNames: resolver.validators.map((v) => v.name).filter(Boolean),
    };
}

function idleWorkflow() {
    return {
        inWorkflow: false,
        currentStep: null,
        totalSteps: 2,
        stepLabel: null,
        actionLabel: null,
        pendingValidators: [],
        resolverScope: null,
        resolverScopeLabel: null,
        isFallback: false,
        pendingValidatorNames: [],
    };
}

async function buildMeetingValidationWorkflow(prisma, meeting) {
    if (!meeting) return idleWorkflow();
    const organizerRole = meeting.organizer?.role;
    if (organizerRole !== ROLES.RESPONSABLE) return idleWorkflow();

    const projectId = meeting.projectId || meeting.project?.id || null;
    const directionId = meeting.directionId || null;
    const ownerUserId = meeting.organizerId;

    if (meeting.status === 'DRAFT') {
        const resolver = await resolveCoordinatorValidators(prisma, projectId);
        return buildStepPayload(
            1,
            2,
            'Étape 1/2 — Validation coordinateur',
            'Valider (coordinateur)',
            resolver,
        );
    }
    if (isPendingConsolidatorValidation(meeting.status)) {
        const resolver = await resolveConsolidatorValidators(prisma, { projectId, directionId, ownerUserId });
        return buildStepPayload(
            2,
            2,
            'Étape 2/2 — Consolidation',
            'Consolider et publier',
            resolver,
        );
    }
    if (isPendingCoordinatorValidation(meeting.status)) {
        const resolver = await resolveCoordinatorValidators(prisma, projectId);
        return {
            ...buildStepPayload(
                2,
                2,
                'Validation finale (legacy)',
                'Valider et publier',
                resolver,
            ),
            legacy: true,
        };
    }
    return idleWorkflow();
}

async function buildMissionValidationWorkflow(prisma, mission) {
    if (!mission) return idleWorkflow();
    const creatorRole = mission.createdBy?.role;
    if (creatorRole !== ROLES.RESPONSABLE) return idleWorkflow();

    const projectId = mission.projectId || mission.project?.id || null;
    const directionId = mission.directionId || null;
    const ownerUserId = mission.createdById;

    if (mission.status === 'DRAFT') {
        const resolver = await resolveCoordinatorValidators(prisma, projectId);
        return buildStepPayload(
            1,
            2,
            'Étape 1/2 — Validation coordinateur',
            'Valider (coordinateur)',
            resolver,
        );
    }
    if (isPendingConsolidatorValidation(mission.status)) {
        const resolver = await resolveConsolidatorValidators(prisma, { projectId, directionId, ownerUserId });
        return buildStepPayload(
            2,
            2,
            'Étape 2/2 — Consolidation',
            'Consolider et confirmer',
            resolver,
        );
    }
    if (isPendingCoordinatorValidation(mission.status)) {
        const resolver = await resolveCoordinatorValidators(prisma, projectId);
        return {
            ...buildStepPayload(
                2,
                2,
                'Validation finale (legacy)',
                'Confirmer la mission',
                resolver,
            ),
            legacy: true,
        };
    }
    return idleWorkflow();
}

async function buildPlanningValidationWorkflow(prisma, planning) {
    if (!planning) return idleWorkflow();

    const projectId = planning.user?.projectId || planning.user?.project?.id || planning.project?.id || null;
    const directionId = planning.user?.directionId || null;
    const ownerUserId = planning.userId;

    if (planning.status === 'SUBMITTED') {
        const resolver = await resolveCoordinatorValidators(prisma, projectId);
        return buildStepPayload(
            1,
            2,
            'Étape 1/2 — Validation coordinateur',
            'Valider (coordinateur)',
            resolver,
        );
    }
    if (isPendingConsolidatorValidation(planning.status)) {
        const resolver = await resolveConsolidatorValidators(prisma, { projectId, directionId, ownerUserId });
        return buildStepPayload(
            2,
            2,
            'Étape 2/2 — Consolidation',
            'Consolider et publier',
            resolver,
        );
    }
    if (isPendingCoordinatorValidation(planning.status)) {
        const resolver = await resolveCoordinatorValidators(prisma, projectId);
        return {
            ...buildStepPayload(
                2,
                2,
                'Validation finale (legacy)',
                'Valider le planning',
                resolver,
            ),
            legacy: true,
        };
    }
    return idleWorkflow();
}

async function attachMeetingValidationWorkflow(prisma, meeting) {
    const workflow = await buildMeetingValidationWorkflow(prisma, meeting);
    return { ...meeting, validation: { ...(meeting.validation || {}), workflow } };
}

async function attachMissionValidationWorkflow(prisma, mission) {
    const workflow = await buildMissionValidationWorkflow(prisma, mission);
    return { ...mission, validation: { ...(mission.validation || {}), workflow } };
}

module.exports = {
    mapValidator,
    resolveCoordinatorValidators,
    resolveConsolidatorValidators,
    buildMeetingValidationWorkflow,
    buildMissionValidationWorkflow,
    buildPlanningValidationWorkflow,
    attachMeetingValidationWorkflow,
    attachMissionValidationWorkflow,
};
