const { isPendingCoordinatorValidation, isPendingConsolidatorValidation } = require('../config/planningWorkflow');
const {
    attachPlanningValidationProject,
    canUserConsolidatePlanning,
} = require('./projectConsolidator.service');
const {
    canUserCoordinatePlanning,
    coordinatorApproveBlockingReason,
} = require('./projectCoordinator.service');
const { buildPlanningValidationWorkflow } = require('./validationWorkflow.service');

/** Plus de double rôle consolidateur/coordinateur sur le même palier. */
function isSameActorConsolidatorAndCoordinator(_project) {
    return false;
}

function canAutoFinalizeAfterConsolidation(_project, _user) {
    return false;
}

async function buildPlanningValidationContext(prisma, planning, user) {
    if (!planning) {
        return {
            project: null,
            canConsolidate: false,
            canCoordinate: false,
            canReturn: false,
            nextAction: null,
            hint: null,
            autoFinalizeOnConsolidate: false,
        };
    }

    await attachPlanningValidationProject(prisma, planning);
    const project = planning.user?.project || planning.project || null;

    const canConsolidate = await canUserConsolidatePlanning(prisma, user, planning);
    const canCoordinate = await canUserCoordinatePlanning(prisma, user, planning);
    const canReturn = canCoordinate && isPendingCoordinatorValidation(planning.status);
    const autoFinalizeOnConsolidate = false;

    let nextAction = null;
    let hint = null;

    if (canCoordinate && planning.status === 'SUBMITTED') {
        nextAction = 'coordinate';
        hint = 'Validez le planning (coordinateur du projet) avant transmission au rôle Consolidateur.';
    } else if (canConsolidate) {
        nextAction = 'consolidate';
        hint = 'Consolidez le planning (rôle Consolidateur) pour publication sur le calendrier.';
    } else if (canCoordinate && isPendingCoordinatorValidation(planning.status)) {
        nextAction = 'coordinate';
        hint = 'Validez définitivement pour publier le planning (élément en attente legacy).';
    } else {
        const block = coordinatorApproveBlockingReason(planning);
        if (block) hint = block;
        else if (planning.status === 'SUBMITTED') {
            hint = 'En attente de validation par le coordinateur du projet.';
        } else if (isPendingConsolidatorValidation(planning.status)) {
            hint = 'En attente de consolidation par le rôle Consolidateur.';
        } else if (isPendingCoordinatorValidation(planning.status)) {
            hint = 'En attente de validation finale par le coordinateur (legacy).';
        }
    }

    return {
        project: project
            ? {
                id: project.id,
                name: project.name,
                code: project.code,
                coordinatorId: project.coordinatorId,
            }
            : null,
        canConsolidate,
        canCoordinate,
        canReturn,
        nextAction,
        hint,
        autoFinalizeOnConsolidate,
        sameActorConsolidatorAndCoordinator: false,
    };
}

async function enrichPlanningForUser(prisma, planning, user) {
    const [validation, workflow] = await Promise.all([
        buildPlanningValidationContext(prisma, planning, user),
        buildPlanningValidationWorkflow(prisma, planning),
    ]);
    return { ...planning, validation: { ...validation, workflow } };
}

async function enrichPlanningsForUser(prisma, plannings, user) {
    return Promise.all(plannings.map((p) => enrichPlanningForUser(prisma, p, user)));
}

module.exports = {
    isSameActorConsolidatorAndCoordinator,
    canAutoFinalizeAfterConsolidation,
    buildPlanningValidationContext,
    enrichPlanningForUser,
    enrichPlanningsForUser,
};
