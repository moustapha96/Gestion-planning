const { isPendingCoordinatorValidation } = require('../config/planningWorkflow');
const {
    attachPlanningValidationProject,
    canUserConsolidatePlanning,
} = require('./projectConsolidator.service');
const {
    canUserCoordinatePlanning,
    coordinatorApproveBlockingReason,
} = require('./projectCoordinator.service');

/** Même personne consolidateur et coordinateur sur le projet. */
function isSameActorConsolidatorAndCoordinator(project) {
    return Boolean(
        project?.consolidatorId
        && project.consolidatorId === project.coordinatorId,
    );
}

/** L'acteur peut-il enchaîner consolidation + validation en une action ? */
function canAutoFinalizeAfterConsolidation(project, user) {
    if (!project || !user?.id) return false;
    if (!isSameActorConsolidatorAndCoordinator(project)) return false;
    return project.consolidatorId === user.id;
}

/**
 * Contexte de validation pour l'UI (aligné backend / frontend).
 * @param {import('@prisma/client').PrismaClient} prisma
 */
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
    const autoFinalizeOnConsolidate = canConsolidate && canAutoFinalizeAfterConsolidation(project, user);

    let nextAction = null;
    let hint = null;

    if (canConsolidate) {
        nextAction = autoFinalizeOnConsolidate ? 'consolidate_and_validate' : 'consolidate';
        hint = autoFinalizeOnConsolidate
            ? 'Vous êtes consolidateur et coordinateur : une seule action publiera le planning.'
            : 'Consolidez le planning avant la validation finale par le coordinateur.';
    } else if (canCoordinate) {
        nextAction = 'coordinate';
        hint = 'Validez définitivement pour publier le planning sur le calendrier.';
    } else {
        const block = coordinatorApproveBlockingReason(planning);
        if (block) hint = block;
        else if (planning.status === 'SUBMITTED' && project?.consolidatorId) {
            hint = 'En attente de consolidation par le consolidateur du projet.';
        } else if (isPendingCoordinatorValidation(planning.status)) {
            hint = 'En attente de validation par le coordinateur du projet.';
        }
    }

    return {
        project: project
            ? {
                id: project.id,
                name: project.name,
                code: project.code,
                consolidatorId: project.consolidatorId,
                coordinatorId: project.coordinatorId,
            }
            : null,
        canConsolidate,
        canCoordinate,
        canReturn,
        nextAction,
        hint,
        autoFinalizeOnConsolidate,
        sameActorConsolidatorAndCoordinator: isSameActorConsolidatorAndCoordinator(project),
    };
}

async function enrichPlanningForUser(prisma, planning, user) {
    const validation = await buildPlanningValidationContext(prisma, planning, user);
    return { ...planning, validation };
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
