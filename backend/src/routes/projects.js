const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { canManageProjects } = require('../config/roles');
const {
    validateConsolidatorId,
    PROJECT_CONSOLIDATOR_INCLUDE,
    notifyProjectConsolidatorAssigned,
} = require('../services/projectConsolidator.service');
const {
    validateCoordinatorId,
    PROJECT_COORDINATOR_INCLUDE,
    notifyProjectCoordinatorAssigned,
} = require('../services/projectCoordinator.service');
const {
    validateResponsibleId,
    PROJECT_RESPONSIBLE_INCLUDE,
    syncResponsibleProjectMembership,
} = require('../services/projectResponsible.service');

const PROJECT_PEOPLE_INCLUDE = {
    ...PROJECT_RESPONSIBLE_INCLUDE,
    ...PROJECT_CONSOLIDATOR_INCLUDE,
    ...PROJECT_COORDINATOR_INCLUDE,
};
const { pdfOnlyMulterFileFilter, wrapMulterUpload } = require('../utils/pdfUpload');

const router = express.Router();

const PROJECT_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED'];
const uploadsDir = path.join(__dirname, '../../uploads/project-files');
const projectLogosDir = path.join(__dirname, '../../uploads/project-logos');

const uploadProjectLogo = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(projectLogosDir, { recursive: true });
            cb(null, projectLogosDir);
        },
        filename(req, file, cb) {
            const ext = (path.extname(file.originalname) || '').toLowerCase();
            const safeId = String(req.params.id || 'new').replace(/[^a-zA-Z0-9_-]/g, '');
            cb(null, `project_logo_${safeId}_${Date.now()}${ext || '.png'}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadProjectFile = multer({
    storage: multer.diskStorage({
        destination(_req, _file, cb) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        },
        filename(req, _file, cb) {
            cb(null, `${req.params.id}_${Date.now()}.pdf`);
        },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: pdfOnlyMulterFileFilter,
});

function canManageProject(_project, user) {
    return canManageProjects(user?.role);
}

function canCreateProject(user) {
    return canManageProjects(user?.role);
}

function canSetProjectConsolidator(_project, user) {
    return canManageProjects(user?.role);
}

function canAddProjectFile(project, user) {
    if (!project || !user) return false;
    if (project.status === 'COMPLETED') return false;
    return canManageProjects(user.role);
}

router.get('/', async (req, res) => {
    try {
        const { active, status } = req.query;
        const where = {};
        if (active !== undefined) where.isActive = active === 'true';
        if (status && PROJECT_STATUSES.includes(String(status).toUpperCase())) where.status = String(status).toUpperCase();

        const projects = await req.prisma.project.findMany({
            where,
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                ...PROJECT_PEOPLE_INCLUDE,
                _count: { select: { missions: true, meetings: true, planningEvents: true, files: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const project = await req.prisma.project.findUnique({
            where: { id: req.params.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                ...PROJECT_PEOPLE_INCLUDE,
                missions: {
                    select: { id: true, title: true, status: true, startTime: true, endTime: true },
                    orderBy: { startTime: 'desc' },
                    take: 20,
                },
                meetings: {
                    select: { id: true, title: true, startTime: true, endTime: true, status: true },
                    orderBy: { startTime: 'desc' },
                    take: 20,
                },
                files: {
                    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 200,
                },
                _count: { select: { missions: true, meetings: true, planningEvents: true, files: true } },
            },
        });
        if (!project) return res.status(404).json({ error: 'Projet introuvable' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.post('/', async (req, res) => {
    if (!canCreateProject(req.user)) return res.status(403).json({ error: 'Accès refusé' });
    const {
        name, code, description, logoUrl: logoUrlRaw,
        responsibleId: responsibleIdRaw,
        consolidatorId: consolidatorIdRaw, coordinatorId: coordinatorIdRaw,
    } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Le nom est requis' });
    const logoUrl = logoUrlRaw !== undefined ? String(logoUrlRaw || '').trim() : null;
    const responsibleCheck = await validateResponsibleId(req.prisma, responsibleIdRaw ?? null);
    if (!responsibleCheck.ok) return res.status(400).json({ error: responsibleCheck.error });
    const consolidatorCheck = await validateConsolidatorId(req.prisma, consolidatorIdRaw ?? null);
    if (!consolidatorCheck.ok) return res.status(400).json({ error: consolidatorCheck.error });
    const coordinatorCheck = await validateCoordinatorId(req.prisma, coordinatorIdRaw ?? null);
    if (!coordinatorCheck.ok) return res.status(400).json({ error: coordinatorCheck.error });
    try {
        const project = await req.prisma.project.create({
            data: {
                name: name.trim(),
                code: code?.trim() || null,
                description: description?.trim() || null,
                ...(logoUrl ? { logoUrl } : {}),
                responsibleId: responsibleCheck.value ?? null,
                consolidatorId: consolidatorCheck.value ?? null,
                coordinatorId: coordinatorCheck.value ?? null,
                status: 'ACTIVE',
                isActive: true,
                createdById: req.user?.id || null,
            },
            include: PROJECT_PEOPLE_INCLUDE,
        });
        if (project.responsibleId) {
            await syncResponsibleProjectMembership(req.prisma, project.id, project.responsibleId);
        }
        if (project.consolidatorId) {
            await notifyProjectConsolidatorAssigned(req.prisma, project.id, project.consolidatorId, {
                assignedByName: req.user?.name,
            });
        }
        if (project.coordinatorId) {
            await notifyProjectCoordinatorAssigned(req.prisma, project.id, project.coordinatorId, {
                assignedByName: req.user?.name,
            });
        }
        res.status(201).json(project);
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Un projet avec ce nom existe déjà' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/:id', async (req, res) => {
    const project = await req.prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });
    if (!canManageProject(project, req.user)) return res.status(403).json({ error: 'Accès refusé' });

    const {
        name, code, description, isActive, logoUrl: logoUrlBody,
        responsibleId: responsibleIdRaw,
        consolidatorId: consolidatorIdRaw, coordinatorId: coordinatorIdRaw,
    } = req.body;
    const data = {};
    if (name !== undefined) data.name = String(name || '').trim();
    if (code !== undefined) data.code = code?.trim() || null;
    if (description !== undefined) data.description = description?.trim() || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (logoUrlBody !== undefined) {
        const lu = String(logoUrlBody || '').trim();
        data.logoUrl = lu || '/logo-gp.png';
    }
    let nextResponsibleId;
    if (responsibleIdRaw !== undefined) {
        const responsibleCheck = await validateResponsibleId(req.prisma, responsibleIdRaw);
        if (!responsibleCheck.ok) return res.status(400).json({ error: responsibleCheck.error });
        nextResponsibleId = responsibleCheck.value ?? null;
        data.responsibleId = nextResponsibleId;
    }
    let nextConsolidatorId;
    if (consolidatorIdRaw !== undefined) {
        if (!canSetProjectConsolidator(project, req.user)) {
            return res.status(403).json({ error: 'Seuls les administrateurs peuvent désigner le consolidateur de ce projet.' });
        }
        const consolidatorCheck = await validateConsolidatorId(req.prisma, consolidatorIdRaw);
        if (!consolidatorCheck.ok) return res.status(400).json({ error: consolidatorCheck.error });
        nextConsolidatorId = consolidatorCheck.value ?? null;
        data.consolidatorId = nextConsolidatorId;
    }
    if (coordinatorIdRaw !== undefined) {
        if (!canSetProjectConsolidator(project, req.user)) {
            return res.status(403).json({ error: 'Seuls les administrateurs peuvent désigner le coordinateur de ce projet.' });
        }
        const coordinatorCheck = await validateCoordinatorId(req.prisma, coordinatorIdRaw);
        if (!coordinatorCheck.ok) return res.status(400).json({ error: coordinatorCheck.error });
        data.coordinatorId = coordinatorCheck.value ?? null;
    }

    try {
        const updated = await req.prisma.project.update({
            where: { id: req.params.id },
            data,
            include: PROJECT_PEOPLE_INCLUDE,
        });
        if (consolidatorIdRaw !== undefined && updated.consolidatorId && updated.consolidatorId !== project.consolidatorId) {
            await notifyProjectConsolidatorAssigned(req.prisma, updated.id, updated.consolidatorId, {
                assignedByName: req.user?.name,
            });
        }
        if (coordinatorIdRaw !== undefined && updated.coordinatorId && updated.coordinatorId !== project.coordinatorId) {
            await notifyProjectCoordinatorAssigned(req.prisma, updated.id, updated.coordinatorId, {
                assignedByName: req.user?.name,
            });
        }
        if (responsibleIdRaw !== undefined && updated.responsibleId) {
            await syncResponsibleProjectMembership(req.prisma, updated.id, updated.responsibleId);
        }
        res.json(updated);
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Un projet avec ce nom existe déjà' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/:id/status', async (req, res) => {
    const project = await req.prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });
    if (!canManageProject(project, req.user)) return res.status(403).json({ error: 'Accès refusé' });

    const status = String(req.body?.status || '').toUpperCase();
    if (!PROJECT_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Statut invalide (ACTIVE|PAUSED|COMPLETED).' });
    }
    const updated = await req.prisma.project.update({
        where: { id: project.id },
        data: {
            status,
            isActive: status === 'ACTIVE',
        },
    });
    return res.json(updated);
});

router.post('/:id/logo', (req, res, next) => {
    uploadProjectLogo.single('logo')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Erreur upload logo' });
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Aucun logo reçu.' });
        if (req.file.mimetype && !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Le logo doit être une image.' });
        }
        const project = await req.prisma.project.findUnique({ where: { id: req.params.id } });
        if (!project) return res.status(404).json({ error: 'Projet introuvable' });
        if (!canManageProject(project, req.user)) return res.status(403).json({ error: 'Accès refusé' });
        const logoUrl = `/uploads/project-logos/${req.file.filename}`;
        const updated = await req.prisma.project.update({
            where: { id: project.id },
            data: { logoUrl },
        });
        return res.status(201).json({ logoUrl, project: updated });
    } catch (err) {
        return res.status(400).json({ error: err.message || 'Erreur upload logo' });
    }
});

router.post('/:id/files', wrapMulterUpload(uploadProjectFile.single('file')), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Aucun fichier envoyé.' });
        const project = await req.prisma.project.findUnique({ where: { id: req.params.id } });
        if (!project) return res.status(404).json({ error: 'Projet introuvable' });
        if (!canAddProjectFile(project, req.user)) {
            return res.status(403).json({ error: 'Seuls la DG et l\'administration peuvent ajouter des fichiers au projet.' });
        }
        const saved = await req.prisma.projectFile.create({
            data: {
                projectId: project.id,
                uploadedById: req.user.id,
                fileName: req.file.originalname || req.file.filename,
                fileUrl: `/uploads/project-files/${req.file.filename}`,
                mimeType: req.file.mimetype || null,
                size: req.file.size || null,
            },
            include: { uploadedBy: { select: { id: true, name: true, email: true } } },
        });
        return res.status(201).json(saved);
    } catch (err) {
        return res.status(400).json({ error: err.message || 'Erreur ajout fichier' });
    }
});

router.delete('/:id/files/:fileId', async (req, res) => {
    try {
        const file = await req.prisma.projectFile.findUnique({
            where: { id: req.params.fileId },
            include: { project: true },
        });
        if (!file || file.projectId !== req.params.id) return res.status(404).json({ error: 'Fichier introuvable' });
        if (!canAddProjectFile(file.project, req.user)) {
            return res.status(403).json({ error: 'Suppression non autorisée pour ce projet.' });
        }
        await req.prisma.projectFile.delete({ where: { id: file.id } });
        const localPath = path.join(uploadsDir, path.basename(file.fileUrl || ''));
        try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch {}
        return res.json({ success: true });
    } catch (err) {
        return res.status(400).json({ error: err.message || 'Erreur suppression fichier' });
    }
});

router.delete('/:id', async (req, res) => {
    if (!canManageProjects(req.user?.role)) return res.status(403).json({ error: 'Accès refusé' });
    try {
        await req.prisma.$transaction([
            req.prisma.mission.updateMany({ where: { projectId: req.params.id }, data: { projectId: null } }),
            req.prisma.meeting.updateMany({ where: { projectId: req.params.id }, data: { projectId: null } }),
            req.prisma.planningEvent.updateMany({ where: { projectId: req.params.id }, data: { projectId: null } }),
            req.prisma.project.delete({ where: { id: req.params.id } }),
        ]);
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Projet introuvable' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
