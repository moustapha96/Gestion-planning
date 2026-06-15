import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import {
    canSubmitWithResponsibleProject,
    isProjectRequiredForUser,
    mergeResponsibleProjects,
    resolveDefaultProjectId,
} from '../utils/projectScope';

/**
 * Charge les projets assignables et détermine le projet par défaut pour un responsable.
 */
export function useResponsibleProjectScope(user, { projectIdFromUrl, enabled = true } = {}) {
    const [loading, setLoading] = useState(Boolean(enabled && isProjectRequiredForUser(user)));
    const [taxonomyProjects, setTaxonomyProjects] = useState([]);
    const [myResponsibleProjects, setMyResponsibleProjects] = useState([]);

    const needsResponsibleProject = isProjectRequiredForUser(user);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return undefined;
        }

        let cancelled = false;
        setLoading(true);

        const requests = [api.get('/events/taxonomy')];
        if (needsResponsibleProject) {
            requests.push(api.get('/projects/my-responsible'));
        }

        Promise.all(requests)
            .then(([taxonomyRes, mineRes]) => {
                if (cancelled) return;
                setTaxonomyProjects(taxonomyRes?.data?.projects || []);
                if (needsResponsibleProject) {
                    setMyResponsibleProjects(mineRes?.data?.projects || []);
                } else {
                    setMyResponsibleProjects([]);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTaxonomyProjects([]);
                    setMyResponsibleProjects([]);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [enabled, needsResponsibleProject, user?.id, user?.role]);

    const assignableProjects = useMemo(
        () => mergeResponsibleProjects(user, taxonomyProjects, myResponsibleProjects),
        [user, taxonomyProjects, myResponsibleProjects],
    );

    const defaultProjectId = useMemo(
        () => resolveDefaultProjectId(projectIdFromUrl, assignableProjects),
        [projectIdFromUrl, assignableProjects],
    );

    const primaryProject = assignableProjects[0] || null;
    const lockedSingle = needsResponsibleProject && assignableProjects.length === 1;
    const canSubmit = canSubmitWithResponsibleProject(user, assignableProjects);

    return {
        loading,
        assignableProjects,
        defaultProjectId,
        primaryProject,
        lockedSingle,
        needsResponsibleProject,
        hasResponsibleProject: !needsResponsibleProject || assignableProjects.length > 0,
        canSubmit,
    };
}

/** Applique le projet par défaut sur un formulaire Ant Design. */
export function applyDefaultProjectToForm(form, projectId) {
    if (!form || !projectId) return;
    form.setFieldsValue({ projectId });
}
