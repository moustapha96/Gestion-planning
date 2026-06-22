const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { formatFrDateTime } = require('../config/timezone');
const { emitToUser } = require('../realtime/socket');
const prisma = new PrismaClient();

// ── Logo embarqué dans les e-mails (CID inline) ────────────────────
// Avantages d'un CID par rapport à une URL :
//  - fonctionne dans Gmail, Outlook, webmails, mobiles, hors-ligne
//  - aucun blocage "image distante" / "tracker"
//  - jamais cassé même si le serveur web frontend est arrêté
const EMAIL_LOGO_CID = 'app-logo';
const EMAIL_LOGO_PATH = path.resolve(__dirname, '../assets/logo-gp.png');
const EMAIL_LOGO_AVAILABLE = (() => {
    try { return fs.existsSync(EMAIL_LOGO_PATH); } catch { return false; }
})();
if (!EMAIL_LOGO_AVAILABLE) {
    logger.warn('EMAIL', `Logo non trouvé à ${EMAIL_LOGO_PATH} — repli sur URL distante.`);
}

function buildEmailLogoAttachments() {
    if (!EMAIL_LOGO_AVAILABLE) return [];
    return [{
        filename: 'logo-gp.png',
        path: EMAIL_LOGO_PATH,
        cid: EMAIL_LOGO_CID,
        contentDisposition: 'inline',
    }];
}

// ── Firebase Admin SDK (FCM pour push natif Android/iOS) ─────────
let firebaseAdmin = null;
try {
    const admin = require('firebase-admin');
    // Peut être configuré via FIREBASE_SERVICE_ACCOUNT_JSON (JSON string)
    // ou FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
    if (!admin.apps.length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            firebaseAdmin = admin;
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId:   process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
                }),
            });
            firebaseAdmin = admin;
        }
    } else {
        firebaseAdmin = admin;
    }
    if (firebaseAdmin) {
        logger.info('FCM', 'Firebase Admin SDK initialisé — push natif activé');
    }
} catch (e) {
    logger.warn('FCM', `Firebase Admin non configuré (push natif désactivé) : ${e.message}`);
}

function buildSmtpTransportOptions() {
    const host = (process.env.SMTP_HOST || 'localhost').trim();
    const port = parseInt(process.env.SMTP_PORT || '1025', 10);
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
    const secure = process.env.SMTP_SECURE === 'true';
    const isGmail = /gmail\.com|googlemail\.com/i.test(host);

    const options = {
        host,
        port,
        secure,
        tls: { rejectUnauthorized: false },
    };

    if (user) {
        options.auth = { user, pass };
    }

    // Gmail / port 587 : STARTTLS (secure: false + requireTLS)
    if (isGmail && port === 587 && !secure) {
        options.requireTLS = true;
    }

    return options;
}

// Configuration de l'email
const transporter = nodemailer.createTransport(buildSmtpTransportOptions());

/** Nom affiché dans les e-mails (évite « undefined » si objet utilisateur partiel). */
function userDisplayName(userOrName, fallback = 'Utilisateur') {
    if (userOrName == null || userOrName === '') return fallback;
    if (typeof userOrName === 'string') {
        const s = userOrName.trim();
        return s || fallback;
    }
    const name = String(userOrName.name || userOrName.fullName || '').trim();
    if (name) return name;
    const email = String(userOrName.email || '').trim();
    if (email) return email.split('@')[0];
    return fallback;
}

function appUrl(path = '') {
    // FRONTEND_URL peut contenir plusieurs origines (CORS) séparées par des
    // virgules : on ne garde que la première pour construire des liens valides.
    const firstOrigin = String(process.env.FRONTEND_URL || 'http://localhost:9000')
        .split(',')[0]
        .trim();
    const base = firstOrigin.replace(/\/$/, '');
    if (!path) return base;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function emailFrame(innerHtml) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          ${innerHtml}
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Gestion Planning</p>
        </div>
      </div>`;
}

function emailCta(href, label) {
    return `<p style="margin: 24px 0 8px;"><a href="${href}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">${label}</a></p>`;
}

function emailInfoBox(content, color = '#fff8e1', border = '#ff9800') {
    return `<div style="background: ${color}; padding: 16px 20px; border-left: 4px solid ${border}; margin: 20px 0;">${content}</div>`;
}

function formatMeetingWhen(meeting) {
    const startDate = new Date(meeting.startTime).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const startTime = new Date(meeting.startTime).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit',
    });
    const endTime = new Date(meeting.endTime).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit',
    });
    return { startDate, startTime, endTime };
}

function meetingPlace(meeting, room) {
    return room?.name || (meeting?.meetingLink ? 'Visioconférence' : 'À définir');
}

function coordinatorValidatorLabel(context = {}) {
    return context.isFallbackRole
        ? 'consolidateur (rôle global — coordinateur non désigné)'
        : 'coordinateur du projet';
}

function consolidatorValidatorLabel(context = {}) {
    if (context.scope === 'project') return 'consolidateur du projet';
    if (context.scope === 'direction') return 'consolidateur de la direction';
    return 'consolidateur (rôle global)';
}

/** @deprecated */
function finalValidatorLabel(context = {}) {
    return coordinatorValidatorLabel(context);
}

function buildMeetingPublishedEmail(organizer, meeting, room, approver) {
    const url = appUrl(`/meetings/${meeting.id}`);
    return {
        subject: `✅ Réunion publiée : ${meeting.title}`,
        html: emailFrame(`
          <p>Bonjour ${userDisplayName(organizer)},</p>
          <p>Votre réunion <strong>« ${meeting.title} »</strong> a été <strong>validée définitivement</strong> par <strong>${userDisplayName(approver)}</strong>.</p>
          ${emailInfoBox(`
            <p style="margin: 0 0 8px 0;"><strong>Statut :</strong> publiée sur le calendrier</p>
            <p style="margin: 0;">Les convocations ont été envoyées aux participants.</p>
          `, '#e8f5e9', '#4caf50')}
          ${emailCta(url, 'Voir la réunion')}
        `),
    };
}

// Templates d'emails
const emailTemplates = {
    PLANNING_REMINDER: (user) => ({
        subject: '📋 Rappel : Soumettez votre planning hebdomadaire',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>C'est un rappel amical pour vous informer qu'il est temps de soumettre votre planning hebdomadaire.</p>
          <div style="background: #f0f0f0; padding: 15px; border-left: 4px solid #1F5C8B; margin: 20px 0;">
            <strong>⏰ Deadline: Vendredi 12h00</strong>
          </div>
          <p>
            <a href="${process.env.FRONTEND_URL}/planning" style="display: inline-block; background: #1F5C8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Soumettre mon planning
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    }),

    /** Consolidateur : planning — étape 2 (après validation coordinateur). */
    PLANNING_PENDING_CONSOLIDATION: (consolidator, ownerName, planningId, weekLabel, projectName, context = {}) => {
        const url = appUrl(`/plannings/${planningId}`);
        const weekLine = weekLabel ? ` pour la semaine du <strong>${weekLabel}</strong>` : '';
        const projectLine = projectName ? ` (projet « ${projectName} »)` : '';
        const roleLabel = consolidatorValidatorLabel(context);
        return {
            subject: '📋 Planning à consolider (étape 2/2)',
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(consolidator)},</p>
          <p><strong>${userDisplayName(ownerName, 'Un responsable')}</strong> a soumis un planning hebdomadaire${weekLine}${projectLine}.</p>
          <p>Le <strong>coordinateur du projet</strong> l'a validé au 1er palier.</p>
          ${emailInfoBox(`
            <p style="margin: 0 0 8px 0;"><strong>Étape 2/2 — Consolidation</strong></p>
            <p style="margin: 0;">En tant que <strong>${roleLabel}</strong>, consolidez ce planning pour le publier sur le calendrier.</p>
          `)}
          ${emailCta(appUrl('/a-valider'), 'Ouvrir la file de validation')}
          ${emailCta(url, 'Voir le planning')}
        `),
        };
    },

    /** Coordinateur : planning soumis — étape 1. */
    PLANNING_PENDING_COORDINATOR: (recipient, ownerName, planningId, weekLabel, projectName, context = {}) => {
        const url = appUrl(`/plannings/${planningId}`);
        const weekLine = weekLabel ? ` (semaine du ${weekLabel})` : '';
        const projectLine = projectName ? ` — projet « ${projectName} »` : '';
        const roleLabel = coordinatorValidatorLabel(context);
        return {
            subject: '📋 Planning à valider (étape 1/2)',
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(recipient)},</p>
          <p><strong>${userDisplayName(ownerName, 'un responsable')}</strong> a soumis un planning${weekLine}${projectLine}.</p>
          ${emailInfoBox(`
            <p style="margin: 0 0 8px 0;"><strong>Étape 1/2 — Validation coordinateur</strong></p>
            <p style="margin: 0;">En tant que <strong>${roleLabel}</strong>, validez ce planning avant transmission au consolidateur (2e palier).</p>
          `, '#e3f2fd', '#2196f3')}
          ${emailCta(appUrl('/a-valider'), 'Valider depuis « À valider »')}
          ${emailCta(url, 'Examiner le planning')}
        `),
        };
    },

    /** Responsable : planning validé par le coordinateur, en attente consolidation. */
    PLANNING_COORDINATED: (user, planningId, weekLabel, projectName, coordinator) => {
        const url = appUrl(`/plannings/${planningId}`);
        const weekLine = weekLabel ? ` (semaine du ${weekLabel})` : '';
        const projectLine = projectName ? ` — projet « ${projectName} »` : '';
        return {
            subject: '📋 Votre planning a été validé (étape 1/2)',
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre planning${weekLine}${projectLine} a été <strong>validé</strong> par <strong>${userDisplayName(coordinator)}</strong> (coordinateur).</p>
          ${emailInfoBox(`
            <p style="margin: 0;"><strong>Prochaine étape (2/2) :</strong> consolidation par le consolidateur du projet, de la direction ou le rôle Consolidateur global. Vous serez notifié dès publication.</p>
          `)}
          ${emailCta(url, 'Suivre mon planning')}
        `),
        };
    },

    /** @deprecated alias — utiliser PLANNING_COORDINATED */
    PLANNING_CONSOLIDATED: (user, planningId, weekLabel, projectName, coordinator) => ({
        subject: '📋 Votre planning a été validé (étape 1/2)',
        html: emailFrame(`
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre planning${weekLabel ? ` (semaine du ${weekLabel})` : ''}${projectName ? ` — projet « ${projectName} »` : ''} a été <strong>validé</strong> par <strong>${userDisplayName(coordinator)}</strong> (coordinateur).</p>
          ${emailInfoBox(`
            <p style="margin: 0;"><strong>Prochaine étape (2/2) :</strong> consolidation par le consolidateur. Vous serez notifié dès publication.</p>
          `)}
          ${emailCta(appUrl(`/plannings/${planningId}`), 'Suivre mon planning')}
        `),
    }),

    PLANNING_SUBMITTED: (user, planningId, statusMessage, weekLabel) => {
        const url = appUrl(`/plannings/${planningId}`);
        const weekLine = weekLabel ? ` (semaine du ${weekLabel})` : '';
        return {
            subject: '✅ Planning soumis — circuit de validation',
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre planning${weekLine} a bien été <strong>reçu</strong>.</p>
          ${emailInfoBox(`
            <p style="margin: 0 0 8px 0;"><strong>Suite du circuit :</strong></p>
            <p style="margin: 0;">${statusMessage || 'Consolidation puis validation finale avant publication.'}</p>
          `, '#e8f5e9', '#4caf50')}
          ${emailCta(url, 'Consulter mon planning')}
        `),
        };
    },

    PLANNING_VALIDATED: (user, planningId, approver, weekLabel, projectName) => {
        const url = appUrl(`/plannings/${planningId}`);
        const weekLine = weekLabel ? ` (semaine du ${weekLabel})` : '';
        const projectLine = projectName ? ` — projet « ${projectName} »` : '';
        return {
            subject: '🎉 Votre planning est validé et publié',
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre planning${weekLine}${projectLine} a été <strong>validé définitivement</strong> par <strong>${userDisplayName(approver)}</strong>.</p>
          ${emailInfoBox(`
            <p style="margin: 0;"><strong>Statut :</strong> publié — visible sur le calendrier et consultable par l'équipe.</p>
          `, '#e8f5e9', '#4caf50')}
          ${emailCta(url, 'Voir le planning validé')}
        `),
        };
    },

    PLANNING_RETURNED: (user, comment, planningId) => ({
        subject: '📌 Votre planning doit être modifié',
        html: emailFrame(`
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre planning a été <strong>retourné</strong> pour modifications avant validation.</p>
          ${emailInfoBox(`<strong>Commentaire du validateur :</strong><br>${comment || '—'}`)}
          <p>Veuillez corriger votre planning et le resoumettre.</p>
          ${emailCta(appUrl(planningId ? `/plannings/${planningId}` : '/planning'), 'Modifier mon planning')}
        `),
    }),

    MEETING_CONVOCATION: (participant, meeting, room, actions = {}) => ({
        subject: `📅 Convocation : ${meeting.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(participant)},</p>
          <p>📅 Vous êtes convoqué à une réunion:</p>
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #1F5C8B; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${meeting.title}</h3>
            <p><strong>📍 Lieu:</strong> ${room?.name || 'À définir'}</p>
            ${meeting.meetingLink ? `<p><strong>🎥 Lien visio:</strong> <a href="${meeting.meetingLink}" target="_blank" rel="noopener noreferrer">${meeting.meetingLink}</a></p>` : ''}
            <p><strong>🕐 Date & Heure:</strong> ${new Date(meeting.startTime).toLocaleDateString('fr-FR')} à ${new Date(meeting.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>⏱ Durée:</strong> ${Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / 60000)} minutes</p>
            <p><strong>📝 Ordre du jour:</strong> ${meeting.agenda}</p>
          </div>
          <p>
            <a href="${process.env.FRONTEND_URL}/meetings" style="display: inline-block; background: #1F5C8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Répondre à la convocation
            </a>
          </p>
          ${actions.acceptUrl || actions.declineUrl ? `
          <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
            ${actions.acceptUrl ? `<a href="${actions.acceptUrl}" style="display:inline-block;background:#52c41a;color:#fff;padding:10px 16px;text-decoration:none;border-radius:5px;font-weight:600;">Accepter</a>` : ''}
            ${actions.declineUrl ? `<a href="${actions.declineUrl}" style="display:inline-block;background:#ff4d4f;color:#fff;padding:10px 16px;text-decoration:none;border-radius:5px;font-weight:600;">Refuser</a>` : ''}
          </div>` : ''}
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    }),

    MEETING_SCHEDULE_UPDATED: (participant, meeting, room) => ({
        subject: `📅 Modification : ${meeting.title} – nouvel horaire`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(participant)},</p>
          <p>📅 L'horaire ou le lieu de la réunion suivante a été modifié :</p>
          <div style="background: #fff8e1; padding: 20px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${meeting.title}</h3>
            <p><strong>📍 Lieu:</strong> ${room?.name || 'À définir'}</p>
            ${meeting.meetingLink ? `<p><strong>🎥 Lien visio:</strong> <a href="${meeting.meetingLink}" target="_blank" rel="noopener noreferrer">${meeting.meetingLink}</a></p>` : ''}
            <p><strong>🕐 Date & Heure:</strong> ${new Date(meeting.startTime).toLocaleDateString('fr-FR')} à ${new Date(meeting.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>⏱ Fin:</strong> ${new Date(meeting.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>⏱ Durée:</strong> ${Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / 60000)} minutes</p>
            <p><strong>📝 Ordre du jour:</strong> ${meeting.agenda || '—'}</p>
          </div>
          <p>Veuillez prendre note des nouveaux horaires.</p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/meetings" style="display: inline-block; background: #1F5C8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Voir la réunion
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    }),

    MEETING_REMINDER: (participant, meeting, room) => ({
        subject: `🔔 Rappel: Réunion demain - ${meeting.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(participant)},</p>
          <p>🔔 Rappel: Une réunion est prévue demain</p>
          <div style="background: #fff8e1; padding: 20px; border-left: 4px solid #fbc02d; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${meeting.title}</h3>
            <p><strong>🕐 Demain à:</strong> ${new Date(meeting.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>📍 Salle:</strong> ${room?.name || 'À définir'}</p>
          </div>
          <p>Assurez-vous d'être disponible à l'heure.</p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    }),

    /** Confirmation envoyée à l’organisateur après création d’une réunion. */
    MEETING_CREATED_CONFIRMATION: (organizer, meeting, room, participantCount = 0, statusHint) => {
        const startDate = new Date(meeting.startTime).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const startTime = new Date(meeting.startTime).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const endTime = new Date(meeting.endTime).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const url = `${process.env.FRONTEND_URL || 'http://localhost:9000'}/meetings/${meeting.id}`;
        const lieu = room?.name
            || (meeting.meetingLink ? 'Visioconférence' : 'À définir');
        return {
            subject: `✅ Réunion créée : ${meeting.title}`,
            html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(organizer)},</p>
          <p>Votre réunion a bien été <strong>créée</strong> dans l'application.</p>
          <div style="background: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${meeting.title}</h3>
            <p><strong>📅 Date :</strong> ${startDate}</p>
            <p><strong>🕐 Horaire :</strong> ${startTime} – ${endTime}</p>
            <p><strong>📍 Lieu :</strong> ${lieu}</p>
            ${meeting.meetingLink ? `<p><strong>🎥 Visio :</strong> <a href="${meeting.meetingLink}">${meeting.meetingLink}</a></p>` : ''}
            <p><strong>👥 Participants :</strong> ${participantCount}</p>
            <p><strong>📝 Ordre du jour :</strong> ${meeting.agenda || '—'}</p>
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #555;">${statusHint || 'Statut : brouillon — pensez à envoyer les convocations depuis la fiche réunion.'}</p>
          </div>
          <p>
            <a href="${url}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Voir la réunion
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
        };
    },

    /** Consolidateur : réunion — étape 2 (après validation coordinateur). */
    MEETING_PENDING_APPROVAL: (consolidator, meeting, organizer, room, context = {}) => {
        const { startDate, startTime, endTime } = formatMeetingWhen(meeting);
        const url = appUrl(`/meetings/${meeting.id}`);
        const lieu = meetingPlace(meeting, room);
        const roleLabel = consolidatorValidatorLabel(context);
        return {
            subject: `📋 Réunion à consolider (étape 2/2) : ${meeting.title}`,
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(consolidator)},</p>
          <p><strong>${userDisplayName(organizer)}</strong> a soumis une réunion. Le coordinateur du projet l'a validée au 1er palier.</p>
          ${emailInfoBox(`
            <h3 style="margin: 0 0 10px 0;">${meeting.title}</h3>
            <p style="margin: 4px 0;"><strong>📅 Date :</strong> ${startDate}</p>
            <p style="margin: 4px 0;"><strong>🕐 Horaire :</strong> ${startTime} – ${endTime}</p>
            <p style="margin: 4px 0;"><strong>📍 Lieu :</strong> ${lieu}</p>
            <p style="margin: 8px 0 0;"><strong>Étape 2/2 :</strong> en tant que <strong>${roleLabel}</strong>, consolidez pour publier sur le calendrier et envoyer les convocations.</p>
          `)}
          ${emailCta(appUrl('/a-valider'), 'Consolider depuis « À valider »')}
          ${emailCta(url, 'Voir la réunion')}
        `),
        };
    },

    /** Coordinateur : réunion en brouillon — étape 1. */
    MEETING_PENDING_COORDINATOR: (recipient, meeting, organizer, room, projectName, context = {}) => {
        const { startDate, startTime, endTime } = formatMeetingWhen(meeting);
        const url = appUrl(`/meetings/${meeting.id}`);
        const lieu = meetingPlace(meeting, room);
        const projectLine = projectName ? ` (projet « ${projectName} »)` : '';
        const roleLabel = coordinatorValidatorLabel(context);
        return {
            subject: `📋 Réunion à valider (étape 1/2) : ${meeting.title}`,
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(recipient)},</p>
          <p><strong>${userDisplayName(organizer)}</strong> a soumis une réunion en brouillon${projectLine}.</p>
          ${emailInfoBox(`
            <p style="margin: 4px 0;"><strong>📅 Date :</strong> ${startDate}</p>
            <p style="margin: 4px 0;"><strong>🕐 Horaire :</strong> ${startTime} – ${endTime}</p>
            <p style="margin: 4px 0;"><strong>📍 Lieu :</strong> ${lieu}</p>
            <p style="margin: 8px 0 0;"><strong>Étape 1/2 :</strong> en tant que <strong>${roleLabel}</strong>, validez avant transmission au consolidateur (2e palier).</p>
          `, '#e3f2fd', '#2196f3')}
          ${emailCta(appUrl('/a-valider'), 'Valider (coordinateur)')}
          ${emailCta(url, 'Voir la réunion')}
        `),
        };
    },

    /** Organisateur : réunion validée par le coordinateur, en attente consolidation. */
    MEETING_COORDINATED: (organizer, meeting, room, coordinator) => {
        const { startDate, startTime, endTime } = formatMeetingWhen(meeting);
        const url = appUrl(`/meetings/${meeting.id}`);
        return {
            subject: `📋 Réunion validée (étape 1/2) : ${meeting.title}`,
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(organizer)},</p>
          <p>Votre réunion <strong>« ${meeting.title} »</strong> a été <strong>validée</strong> par <strong>${userDisplayName(coordinator)}</strong> (coordinateur).</p>
          ${emailInfoBox(`
            <p style="margin: 4px 0;"><strong>📅 Date :</strong> ${startDate}</p>
            <p style="margin: 4px 0;"><strong>🕐 Horaire :</strong> ${startTime} – ${endTime}</p>
            <p style="margin: 4px 0;"><strong>📍 Lieu :</strong> ${meetingPlace(meeting, room)}</p>
            <p style="margin: 8px 0 0;"><strong>Prochaine étape (2/2) :</strong> consolidation par le consolidateur (projet, direction ou rôle global). Les convocations partiront après cette étape.</p>
          `)}
          ${emailCta(url, 'Suivre la réunion')}
        `),
        };
    },

    /** @deprecated alias */
    MEETING_CONSOLIDATED: (organizer, meeting, room, actor) => ({
        subject: `📋 Réunion validée (étape 1/2) : ${meeting.title}`,
        html: emailFrame(`
          <p>Bonjour ${userDisplayName(organizer)},</p>
          <p>Votre réunion <strong>« ${meeting.title} »</strong> a été <strong>validée</strong> par <strong>${userDisplayName(actor)}</strong>.</p>
          ${emailInfoBox(`
            <p style="margin: 0;"><strong>Prochaine étape (2/2) :</strong> consolidation par le consolidateur avant publication.</p>
          `)}
          ${emailCta(appUrl(`/meetings/${meeting.id}`), 'Suivre la réunion')}
        `),
    }),

    /** Organisateur : réunion publiée (validation finale). */
    MEETING_PUBLISHED: buildMeetingPublishedEmail,

    /** Alias historique */
    MEETING_APPROVED: buildMeetingPublishedEmail,

    /** Consolidateur : mission — étape 2 (après validation coordinateur). */
    MISSION_PENDING_APPROVAL: (consolidator, mission, creator, context = {}) => {
        const startStr = formatFrDateTime(mission.startTime, { dateStyle: 'full', timeStyle: 'short' });
        const endStr = new Date(mission.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const url = appUrl(`/missions/${mission.id}`);
        const roleLabel = consolidatorValidatorLabel(context);
        return {
            subject: `📋 Mission à consolider (étape 2/2) : ${mission.title}`,
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(consolidator)},</p>
          <p><strong>${userDisplayName(creator)}</strong> a soumis une mission. Le coordinateur du projet l'a validée au 1er palier.</p>
          ${emailInfoBox(`
            <h3 style="margin: 0 0 10px 0;">${mission.title}</h3>
            <p style="margin: 4px 0;"><strong>📅 Début :</strong> ${startStr}</p>
            <p style="margin: 4px 0;"><strong>🕐 Fin :</strong> ${endStr}</p>
            <p style="margin: 4px 0;"><strong>📍 Lieu :</strong> ${mission.location || '—'}</p>
            <p style="margin: 8px 0 0;"><strong>Étape 2/2 :</strong> en tant que <strong>${roleLabel}</strong>, consolidez pour confirmer la mission sur le calendrier.</p>
          `)}
          ${emailCta(appUrl('/a-valider'), 'Consolider depuis « À valider »')}
          ${emailCta(url, 'Voir la mission')}
        `),
        };
    },

    /** Coordinateur : mission en brouillon — étape 1. */
    MISSION_PENDING_COORDINATOR: (recipient, mission, creator, projectName, context = {}) => {
        const startStr = formatFrDateTime(mission.startTime, { dateStyle: 'full', timeStyle: 'short' });
        const endStr = new Date(mission.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const url = appUrl(`/missions/${mission.id}`);
        const projectLine = projectName ? ` (projet « ${projectName} »)` : '';
        const roleLabel = coordinatorValidatorLabel(context);
        return {
            subject: `📋 Mission à valider (étape 1/2) : ${mission.title}`,
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(recipient)},</p>
          <p><strong>${userDisplayName(creator)}</strong> a soumis une mission en brouillon${projectLine}.</p>
          ${emailInfoBox(`
            <p style="margin: 4px 0;"><strong>📅 Début :</strong> ${startStr}</p>
            <p style="margin: 4px 0;"><strong>🕐 Fin :</strong> ${endStr}</p>
            <p style="margin: 4px 0;"><strong>📍 Lieu :</strong> ${mission.location || '—'}</p>
            <p style="margin: 8px 0 0;"><strong>Étape 1/2 :</strong> en tant que <strong>${roleLabel}</strong>, validez avant transmission au consolidateur (2e palier).</p>
          `, '#e3f2fd', '#2196f3')}
          ${emailCta(appUrl('/a-valider'), 'Valider (coordinateur)')}
          ${emailCta(url, 'Voir la mission')}
        `),
        };
    },

    /** Créateur : mission validée par le coordinateur, en attente consolidation. */
    MISSION_COORDINATED: (creator, mission, coordinator) => {
        const startStr = formatFrDateTime(mission.startTime, { dateStyle: 'full', timeStyle: 'short' });
        const endStr = new Date(mission.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const url = appUrl(`/missions/${mission.id}`);
        return {
            subject: `📋 Mission validée (étape 1/2) : ${mission.title}`,
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(creator)},</p>
          <p>Votre mission <strong>« ${mission.title} »</strong> a été <strong>validée</strong> par <strong>${userDisplayName(coordinator)}</strong> (coordinateur).</p>
          ${emailInfoBox(`
            <p style="margin: 4px 0;"><strong>📅 Début :</strong> ${startStr}</p>
            <p style="margin: 4px 0;"><strong>🕐 Fin :</strong> ${endStr}</p>
            <p style="margin: 4px 0;"><strong>📍 Lieu :</strong> ${mission.location || '—'}</p>
            <p style="margin: 8px 0 0;"><strong>Prochaine étape (2/2) :</strong> consolidation par le consolidateur avant confirmation sur le calendrier.</p>
          `)}
          ${emailCta(url, 'Suivre la mission')}
        `),
        };
    },

    /** @deprecated alias */
    MISSION_CONSOLIDATED: (creator, mission, actor) => ({
        subject: `📋 Mission validée (étape 1/2) : ${mission.title}`,
        html: emailFrame(`
          <p>Bonjour ${userDisplayName(creator)},</p>
          <p>Votre mission <strong>« ${mission.title} »</strong> a été <strong>validée</strong> par <strong>${userDisplayName(actor)}</strong>.</p>
          ${emailInfoBox(`
            <p style="margin: 0;"><strong>Prochaine étape (2/2) :</strong> consolidation par le consolidateur.</p>
          `)}
          ${emailCta(appUrl(`/missions/${mission.id}`), 'Suivre la mission')}
        `),
    }),

    /** Créateur : mission confirmée (validation finale). */
    MISSION_CONFIRMED: (creator, mission, validator) => {
        const startStr = formatFrDateTime(mission.startTime, { dateStyle: 'full', timeStyle: 'short' });
        const endStr = new Date(mission.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const url = appUrl(`/missions/${mission.id}`);
        return {
            subject: `✅ Mission confirmée : ${mission.title}`,
            html: emailFrame(`
          <p>Bonjour ${userDisplayName(creator)},</p>
          <p>Votre mission <strong>« ${mission.title} »</strong> a été <strong>validée</strong> par <strong>${userDisplayName(validator)}</strong> et confirmée sur le calendrier.</p>
          ${emailInfoBox(`
            <p style="margin: 4px 0;"><strong>📅 Début :</strong> ${startStr}</p>
            <p style="margin: 4px 0;"><strong>🕐 Fin :</strong> ${endStr}</p>
            <p style="margin: 4px 0;"><strong>📍 Lieu :</strong> ${mission.location || '—'}</p>
            <p style="margin: 8px 0 0;">Les intervenants assignés ont été notifiés.</p>
          `, '#e8f5e9', '#4caf50')}
          ${emailCta(url, 'Voir la mission')}
        `),
        };
    },

  PASSWORD_RESET: (user, resetUrl) => ({
    subject: '🔑 Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <strong>⚠️ Ce lien est valable 1 heure.</strong>
          </div>
          <p>
            <a href="${resetUrl}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p style="font-size: 12px; color: #666; word-break: break-all;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
            <a href="${resetUrl}" style="color: #1F5C8B;">${resetUrl}</a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  ACCOUNT_CREATED: (user, password) => ({
    subject: '👋 Bienvenue sur Gestion Planning - Vos identifiants',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre compte a été créé sur <strong>Gestion Planning</strong>.</p>
          <div style="background: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>📧 Email :</strong> ${user.email}</p>
            <p style="margin: 0 0 8px 0;"><strong>🔑 Mot de passe :</strong> ${password}</p>
            <p style="margin: 0;"><strong>👤 Rôle :</strong> ${user.role}</p>
          </div>
          <p style="color: #e53935;"><strong>⚠️ Changez votre mot de passe dès la première connexion.</strong></p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Se connecter
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  PROJECT_COORDINATOR_ASSIGNED: (user, project, assignedByName) => {
    const projectLabel = project.code ? `${project.name} (${project.code})` : project.name;
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/${project.id}`;
    return {
      subject: `📋 Coordinateur du projet « ${project.name} »`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p><strong>${userDisplayName(assignedByName, 'L\'administration')}</strong> vous a désigné <strong>coordinateur</strong> du projet suivant :</p>
          <div style="background: #e3f2fd; padding: 20px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${projectLabel}</h3>
            <p style="margin: 0; font-size: 14px; color: #555;">
              Vous validez les plannings consolidés et les demandes liées à ce projet.
            </p>
          </div>
          <p>
            <a href="${url}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Voir le projet
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    };
  },

  PROJECT_CONSOLIDATOR_ASSIGNED: (user, project, assignedByName) => {
    const projectLabel = project.code ? `${project.name} (${project.code})` : project.name;
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/${project.id}`;
    return {
      subject: `📋 Consolidateur du projet « ${project.name} »`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p><strong>${userDisplayName(assignedByName, 'L\'administration')}</strong> vous a désigné(e) <strong>consolidateur(trice)</strong> du projet suivant :</p>
          <div style="background: #f3e5f5; padding: 20px; border-left: 4px solid #722ed1; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0;">${projectLabel}</h3>
            <p style="margin: 0; font-size: 14px; color: #555;">
              Vous êtes responsable de la validation des réunions, plannings et demandes liées à ce projet.
            </p>
          </div>
          <p>
            <a href="${url}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Voir le projet
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    };
  },

  ROLE_CHANGED: (user, newRoleLabel, previousRoleLabel) => ({
    subject: '👤 Votre rôle a été modifié - Gestion Planning',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre rôle sur l'application <strong>Gestion Planning</strong> a été modifié par un administrateur.</p>
          <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <p style="margin: 0 0 6px 0;"><strong>Ancien rôle :</strong> ${previousRoleLabel || '—'}</p>
            <p style="margin: 0;"><strong>Nouveau rôle :</strong> ${newRoleLabel || user.role}</p>
          </div>
          <p>Vos droits d'accès ont été mis à jour en conséquence. Reconnectez-vous si nécessaire pour voir les changements.</p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Accéder à l'application
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  ACCOUNT_ACTIVATION: (user, activationUrl, password) => ({
    subject: '✅ Activez votre compte Gestion Planning',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre compte a été créé sur <strong>Gestion Planning</strong>. Pour pouvoir vous connecter, vous devez d'abord l'activer en cliquant sur le lien ci-dessous.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${activationUrl}" style="display: inline-block; background: #4caf50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Activer mon compte
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p style="font-size: 12px; word-break: break-all; color: #1F5C8B;">${activationUrl}</p>
          <div style="background: #f5f5f5; padding: 16px; border-left: 4px solid #1F5C8B; margin: 20px 0;">
            <p style="margin: 0 0 6px 0;"><strong>Vos identifiants après activation :</strong></p>
            <p style="margin: 0 0 4px 0;"><strong>📧 Email :</strong> ${user.email}</p>
            <p style="margin: 0 0 4px 0;"><strong>🔑 Mot de passe :</strong> ${password}</p>
          </div>
          <p style="color: #e53935; font-size: 13px;"><strong>⚠️ Ce lien expire sous 7 jours. Changez votre mot de passe après votre première connexion.</strong></p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  MISSION_CREATED: (user, mission, createdByName) => {
    const startStr = formatFrDateTime(mission.startTime, { dateStyle: 'full', timeStyle: 'short' });
    const endStr = new Date(mission.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/missions/${mission.id}`;
    return {
      subject: `📍 Nouvelle mission : ${mission.title}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Une nouvelle mission vous a été assignée par <strong>${userDisplayName(createdByName, 'Un utilisateur')}</strong>.</p>
          <div style="background: #e3f2fd; padding: 20px; border-left: 4px solid #1F5C8B; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>📍 Mission :</strong> ${mission.title}</p>
            <p style="margin: 0 0 8px 0;"><strong>📍 Lieu :</strong> ${mission.location}</p>
            <p style="margin: 0 0 8px 0;"><strong>🕐 Début :</strong> ${startStr}</p>
            <p style="margin: 0 0 8px 0;"><strong>🕐 Fin :</strong> ${endStr}</p>
            ${mission.description ? `<p style="margin: 8px 0 0 0;"><strong>Description :</strong><br/>${mission.description}</p>` : ''}
          </div>
          <p>
            <a href="${url}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Voir la mission
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    };
  },

  /** Confirmation envoyée au créateur après création d’une mission. */
  MISSION_CREATED_CONFIRMATION: (creator, mission, assigneeCount = 0, statusHint) => {
    const startStr = formatFrDateTime(mission.startTime, { dateStyle: 'full', timeStyle: 'short' });
    const endStr = new Date(mission.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:9000'}/missions/${mission.id}`;
    const assigneeLine = assigneeCount > 0
        ? `<p style="margin: 12px 0 0 0;"><strong>👥 Intervenants prévus :</strong> ${assigneeCount} (notifiés après validation)</p>`
        : '';
    return {
      subject: `✅ Mission créée : ${mission.title}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(creator)},</p>
          <p>Votre mission a bien été <strong>enregistrée</strong> dans l'application.</p>
          <div style="background: #e8f5e9; padding: 20px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>📍 Mission :</strong> ${mission.title}</p>
            <p style="margin: 0 0 8px 0;"><strong>📍 Lieu :</strong> ${mission.location}</p>
            <p style="margin: 0 0 8px 0;"><strong>🕐 Début :</strong> ${startStr}</p>
            <p style="margin: 0 0 8px 0;"><strong>🕐 Fin :</strong> ${endStr}</p>
            ${mission.description ? `<p style="margin: 8px 0 0 0;"><strong>Description :</strong><br/>${mission.description}</p>` : ''}
            ${assigneeLine}
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #555;">${statusHint || 'Statut : brouillon — la mission sera confirmée après validation.'}</p>
          </div>
          <p>
            <a href="${url}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Voir la mission
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    };
  },

  ACCOUNT_ACTIVATED: (user) => ({
    subject: '✅ Votre compte a été réactivé - Gestion Planning',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre compte a été <strong>réactivé</strong> par un administrateur. Vous pouvez à nouveau vous connecter à l'application.</p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Se connecter
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  ACCOUNT_DEACTIVATED: (user) => ({
    subject: '⚠️ Votre compte a été désactivé - Gestion Planning',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Votre compte sur <strong>Gestion Planning</strong> a été <strong>désactivé</strong> par un administrateur. Vous ne pouvez plus vous connecter pour le moment.</p>
          <p>Pour toute question, contactez votre administrateur.</p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  MISSION_UPDATED: (user, mission, createdByName) => {
    const startStr = formatFrDateTime(mission.startTime, { dateStyle: 'full', timeStyle: 'short' });
    const endStr = new Date(mission.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/missions/${mission.id}`;
    return {
      subject: `📍 Mission modifiée : ${mission.title}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Une mission à laquelle vous êtes assigné(e) a été modifiée par <strong>${userDisplayName(createdByName, 'Un utilisateur')}</strong>.</p>
          <div style="background: #fff3e0; padding: 20px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>📍 Mission :</strong> ${mission.title}</p>
            <p style="margin: 0 0 8px 0;"><strong>📍 Lieu :</strong> ${mission.location}</p>
            <p style="margin: 0 0 8px 0;"><strong>🕐 Début :</strong> ${startStr}</p>
            <p style="margin: 0 0 8px 0;"><strong>🕐 Fin :</strong> ${endStr}</p>
            ${mission.description ? `<p style="margin: 8px 0 0 0;"><strong>Description :</strong><br/>${mission.description}</p>` : ''}
          </div>
          <p>
            <a href="${url}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Voir la mission
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    };
  },

  MISSION_CANCELLED: (user, mission, createdByName) => {
    return {
      subject: `❌ Mission annulée : ${mission.title}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>La mission <strong>« ${mission.title } »</strong> (${mission.location}) à laquelle vous étiez assigné(e) a été <strong>annulée</strong> par ${userDisplayName(createdByName, 'Un utilisateur')}.</p>
          <p>Vous n'avez plus à vous rendre sur cette mission.</p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    };
  },

  BACKUP_SUCCESS: (detail) => ({
    subject: `✅ Sauvegarde base de données réussie — ${detail.fileName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1A365D 0%, #2a5282 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin:0;font-size:20px;">Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>La sauvegarde de la base de données s'est terminée avec <strong>succès</strong>.</p>
          <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 16px 0;">
            <p style="margin:0 0 6px 0;"><strong>Fichier :</strong> ${detail.fileName}</p>
            <p style="margin:0 0 6px 0;"><strong>Taille :</strong> ${detail.sizeLabel}</p>
            <p style="margin:0 0 6px 0;"><strong>Durée :</strong> ${detail.durationSec} s</p>
            <p style="margin:0 0 6px 0;"><strong>Type :</strong> ${detail.kind}</p>
            <p style="margin:0;"><strong>Date :</strong> ${detail.at}</p>
          </div>
          <p style="color:#666;font-size:13px;">Conservez ce fichier dans un lieu sûr. La restauration est disponible depuis l'administration (super administrateur).</p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  BACKUP_FAILED: (detail) => ({
    subject: `❌ Échec sauvegarde base de données — ${detail.fileName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin:0;font-size:20px;">Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>La sauvegarde de la base de données a <strong>échoué</strong>.</p>
          <div style="background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 16px 0;">
            <p style="margin:0 0 6px 0;"><strong>Fichier prévu :</strong> ${detail.fileName}</p>
            <p style="margin:0 0 6px 0;"><strong>Type :</strong> ${detail.kind}</p>
            <p style="margin:0 0 6px 0;"><strong>Date :</strong> ${detail.at}</p>
            <p style="margin:0 0 6px 0;"><strong>Durée avant échec :</strong> ${detail.durationSec} s</p>
            <p style="margin:0;white-space:pre-wrap;"><strong>Erreur :</strong><br/>${(detail.error || '—').replace(/</g, '&lt;')}</p>
          </div>
          <p style="color:#666;font-size:13px;">Vérifiez que les outils PostgreSQL (<code>pg_dump</code>) sont installés et accessibles sur le serveur, et que <code>DATABASE_URL</code> est correct.</p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
  }),

  // Rappel réunion J-1 — CDC §3.3.2
  MEETING_REMINDER: (user, meeting) => {
    const dateStr = formatFrDateTime(meeting.startTime, { dateStyle: 'full', timeStyle: 'short' });
    const endStr = new Date(meeting.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meetings/${meeting.id}`;
    return {
      subject: `⏰ Rappel : Réunion demain — ${meeting.title}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${userDisplayName(user)},</p>
          <p>Rappel : vous êtes convié(e) à une réunion <strong>demain</strong>.</p>
          <div style="background: #fff3e0; padding: 20px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>📋 Objet :</strong> ${meeting.title}</p>
            <p style="margin: 0 0 8px 0;"><strong>🕐 Horaire :</strong> ${dateStr} – ${endStr}</p>
            ${meeting.room ? `<p style="margin: 0 0 8px 0;"><strong>📍 Salle :</strong> ${meeting.room.name}</p>` : ''}
            ${meeting.agenda ? `<p style="margin: 8px 0 0 0;"><strong>Ordre du jour :</strong><br/>${meeting.agenda}</p>` : ''}
          </div>
          <p>
            <a href="${url}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Voir la réunion
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    };
  },
};

const BRANDING_DEFAULTS = {
    app_name: 'Gestion Planning',
    app_contact_email: '',
    app_contact_phone: '',
    app_contact_address: '',
    app_footer_text: '© 2026 Gestion Planning - Tous droits réservés',
    /** URL relative (/uploads/...) ou absolue ; sinon logo public défaut via getEmailLogoUrl */
    app_logo_url: '',
};

/** Échappe les attributs HTML (src, alt). */
function escapeHtmlAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

/** Base publique pour les assets (logo dans les mails). Défaut aligné sur le front Vite courant. */
function getPublicAppBaseUrl() {
    return (process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'http://localhost:9000').replace(/\/$/, '');
}

/**
 * Source du logo dans les e-mails.
 *
 * Priorité :
 *   1. Pièce jointe inline (cid:app-logo) — fonctionne sur tous les clients,
 *      même sans accès Internet vers le serveur frontend (ex. http://localhost:9000).
 *   2. EMAIL_LOGO_URL (env) si défini.
 *   3. branding.app_logo_url (depuis l'admin) — peut être absolu ou relatif.
 *   4. Fallback : http://localhost:9000/logo-gp.png (uniquement utile en dev local).
 */
function getEmailLogoUrl(branding) {
    if (EMAIL_LOGO_AVAILABLE) return `cid:${EMAIL_LOGO_CID}`;

    const explicit = (process.env.EMAIL_LOGO_URL || '').trim();
    if (explicit) return explicit;
    const u = branding?.app_logo_url ? String(branding.app_logo_url).trim() : '';
    const base = getPublicAppBaseUrl();

    if (u && /^https?:\/\//i.test(u)) return u;
    if (u && u.startsWith('/')) return `${base}${u}`;
    if (u && !u.startsWith('/')) return `${base}/${u}`;

    return 'http://localhost:9000/logo-gp.png';
}

/**
 * Insère le logo au-dessus du bandeau titre (ou en tête du corps HTML).
 */
function injectEmailLogo(html, branding) {
    const appName = branding.app_name || BRANDING_DEFAULTS.app_name;
    const logoUrl = getEmailLogoUrl(branding);
    const img = `<img src="${escapeHtmlAttr(logoUrl)}" alt="${escapeHtmlAttr(appName)}" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto 12px;border:0;" />`;

    let out = String(html || '');

    const headerBand = /(<div[^>]*background:\s*linear-gradient[^>]*>)\s*(<h1[^>]*>[\s\S]*?<\/h1>)/i;
    if (headerBand.test(out)) {
        return out.replace(headerBand, (m, divOpen, h1) => `${divOpen}\n          ${img}\n          ${h1}`);
    }

    const wrapperDiv = /(<div style="font-family:\s*Arial,\s*sans-serif;\s*max-width:\s*\d+px[^"]*"[^>]*>)/i;
    if (wrapperDiv.test(out)) {
        return out.replace(wrapperDiv, `$1<div style="text-align:center;padding:16px 0 12px;">${img}</div>`);
    }

    const bodyTag = /(<body[^>]*>)/i;
    if (bodyTag.test(out)) {
        return out.replace(bodyTag, `$1<div style="text-align:center;padding:16px 0 12px;">${img}</div>`);
    }

    return out;
}
const DEFAULT_NOTIFICATION_CHANNELS = { DEFAULT: { inApp: true, email: true } };
const DEFAULT_QUIET_HOURS = { enabled: false, start: '22:00', end: '07:00' };
const DEFAULT_DAILY_DIGEST = { enabled: false, time: '08:00' };

function prefKeyChannels(userId) {
    return `notif_pref:${userId}:channels`;
}
function prefKeyQuietHours(userId) {
    return `notif_pref:${userId}:quiet_hours`;
}
function prefKeyDigest(userId) {
    return `notif_pref:${userId}:digest`;
}
function parseJsonOrDefault(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function hhmmToMinutes(v) {
    const [h, m] = String(v || '00:00').split(':').map((x) => parseInt(x, 10) || 0);
    return h * 60 + m;
}
function isInQuietHours(quietHours, now = new Date()) {
    if (!quietHours?.enabled) return false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = hhmmToMinutes(quietHours.start);
    const end = hhmmToMinutes(quietHours.end);
    if (start === end) return false;
    if (start < end) return nowMinutes >= start && nowMinutes < end;
    return nowMinutes >= start || nowMinutes < end; // traverse minuit
}

async function getBrandingSettings() {
    try {
        const rows = await prisma.appSetting.findMany({
            where: {
                key: {
                    in: Object.keys(BRANDING_DEFAULTS),
                },
            },
        });
        const fromDb = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        return { ...BRANDING_DEFAULTS, ...fromDb };
    } catch {
        return BRANDING_DEFAULTS;
    }
}

function buildContactLines(branding) {
    const lines = [];
    if (branding.app_contact_email) lines.push(`Email: ${branding.app_contact_email}`);
    if (branding.app_contact_phone) lines.push(`Téléphone: ${branding.app_contact_phone}`);
    if (branding.app_contact_address) lines.push(`Adresse: ${branding.app_contact_address}`);
    if (!lines.length) return '';
    return `<p style="margin-top: 6px;">${lines.join(' | ')}</p>`;
}

function applyBranding(subject, html, branding) {
    let nextSubject = String(subject || '').replace(/Gestion Planning/g, branding.app_name || BRANDING_DEFAULTS.app_name);
    let nextHtml = String(html || '').replace(/Gestion Planning/g, branding.app_name || BRANDING_DEFAULTS.app_name);
    nextHtml = nextHtml.replace(/© 2026 Gestion Planning - Tous droits réservés/g, branding.app_footer_text || BRANDING_DEFAULTS.app_footer_text);
    nextHtml = injectEmailLogo(nextHtml, branding);
    const contactBlock = buildContactLines(branding);
    if (contactBlock) {
        nextHtml = nextHtml.replace('</div>\n      </div>', `${contactBlock}\n        </div>\n      </div>`);
    }
    return { subject: nextSubject, html: nextHtml };
}

// Classe de gestion des notifications
class NotificationService {
    constructor() {
        this.retryAttempts = 3;
        // Délais CDC §3.8.2 : 1 min, 5 min, 15 min
        this.retryDelays = [60_000, 300_000, 900_000];
    }

    // ── Push natif (FCM Android + APNs iOS via Firebase) ─────────
    /**
     * Envoie une notification push native à un utilisateur.
     * Ne fait rien si Firebase n'est pas configuré ou si l'utilisateur
     * n'a pas de device tokens enregistrés.
     *
     * @param {Object} opts
     * @param {string} opts.userId    - ID de l'utilisateur cible
     * @param {string} opts.title     - Titre de la notification
     * @param {string} opts.body      - Corps du message
     * @param {Object} opts.data      - Données supplémentaires (ex: link, type)
     * @param {string} opts.channelId - Canal Android (default|messages|planning|meetings)
     */
    async sendPushToUser({ userId, title, body, data = {}, channelId = 'default' }) {
        if (!firebaseAdmin) return;

        try {
            const deviceTokens = await prisma.deviceToken.findMany({
                where:  { userId },
                select: { token: true, platform: true },
            });

            if (deviceTokens.length === 0) return;

            const tokens = deviceTokens.map((t) => t.token);

            // Convertir toutes les valeurs data en string (exigence FCM)
            const stringData = {};
            for (const [k, v] of Object.entries(data)) {
                stringData[k] = String(v ?? '');
            }
            stringData.channelId = channelId;

            const message = {
                notification: { title, body },
                data: stringData,
                tokens,
                android: {
                    notification: {
                        channelId,
                        color:       '#1A365D',
                        priority:    'high',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                    },
                    priority: 'high',
                },
                apns: {
                    payload: {
                        aps: {
                            sound:            'default',
                            badge:            1,
                            'content-available': 1,
                        },
                    },
                    headers: {
                        'apns-priority': '10',
                        'apns-push-type': 'alert',
                    },
                },
            };

            const response = await firebaseAdmin.messaging().sendEachForMulticast(message);

            // Supprimer les tokens invalides / expirés
            const toDelete = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const code = resp.error?.code || '';
                    if (
                        code === 'messaging/invalid-registration-token' ||
                        code === 'messaging/registration-token-not-registered' ||
                        code === 'messaging/invalid-argument'
                    ) {
                        toDelete.push(tokens[idx]);
                    }
                }
            });

            if (toDelete.length > 0) {
                await prisma.deviceToken.deleteMany({ where: { token: { in: toDelete } } });
                logger.info('FCM', `${toDelete.length} token(s) invalide(s) supprimé(s)`);
            }

            const sent    = response.successCount;
            const failed  = response.failureCount;
            if (failed > 0) {
                logger.warn('FCM', `Push partiel: ${sent} OK, ${failed} échec(s)`, { userId });
            }

            return { sent, failed };
        } catch (err) {
            logger.error('FCM_SEND', err.message, { userId });
        }
    }

    /**
     * Envoie une notification push native + in-app + email en une seule appel.
     * Wrapper de sendFullNotification qui ajoute le push natif.
     */
    async sendFullNotificationWithPush(prismaClient, userId, type, title, body, link, options = {}) {
        // In-app + email
        const notif = await this.sendFullNotification(prismaClient, userId, type, title, body, link, options);

        // Push natif
        await this.sendPushToUser({
            userId,
            title,
            body,
            data:      { link: link || '', type, notifId: notif?.id || '' },
            channelId: options.channelId || 'default',
        });

        return notif;
    }

    async getUserNotificationPreferences(prismaClient, userId) {
        try {
            const rows = await prismaClient.appSetting.findMany({
                where: {
                    key: {
                        in: [prefKeyChannels(userId), prefKeyQuietHours(userId), prefKeyDigest(userId)],
                    },
                },
            });
            const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
            return {
                channels: parseJsonOrDefault(byKey[prefKeyChannels(userId)], DEFAULT_NOTIFICATION_CHANNELS),
                quietHours: parseJsonOrDefault(byKey[prefKeyQuietHours(userId)], DEFAULT_QUIET_HOURS),
                dailyDigest: parseJsonOrDefault(byKey[prefKeyDigest(userId)], DEFAULT_DAILY_DIGEST),
            };
        } catch {
            return {
                channels: DEFAULT_NOTIFICATION_CHANNELS,
                quietHours: DEFAULT_QUIET_HOURS,
                dailyDigest: DEFAULT_DAILY_DIGEST,
            };
        }
    }

    shouldSendChannel(channels, type, channelName) {
        const specific = channels?.[type];
        const fallback = channels?.DEFAULT || DEFAULT_NOTIFICATION_CHANNELS.DEFAULT;
        const source = specific || fallback;
        return source?.[channelName] !== false;
    }

    /**
     * Envoyer un email avec retry logic (CDC §3.8.2)
     * 3 essais, délais : 1 min, 5 min, 15 min
     */
    async sendEmailWithRetry(to, templateKey, params = []) {
        return this.sendEmail(to, templateKey, params, 1);
    }

    /**
     * Envoyer un email avec retry logic
     */
    async sendEmail(to, templateKey, params = [], attempt = 1) {
        try {
            const template = emailTemplates[templateKey];
            if (!template) {
                logger.warn('EMAIL', `Template ${templateKey} non trouvé`);
                return { success: false, error: 'Template not found' };
            }

            const mailOptions = template(...params);
            const branding = await getBrandingSettings();
            const branded = applyBranding(mailOptions.subject, mailOptions.html, branding);
            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@gestionplanning.local',
                to,
                subject: branded.subject,
                html: branded.html,
                attachments: buildEmailLogoAttachments(),
            });

            logger.success(
                'EMAIL_SENT',
                `Email envoyé à ${to} - Template: ${templateKey}`, { to, templateKey, messageId: info.messageId }
            );

            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error(
                'EMAIL_FAILED',
                `Échec d'envoi email (tentative ${attempt}/${this.retryAttempts})`, {
                    to,
                    templateKey,
                    error: error.message,
                }
            );

            if (attempt < this.retryAttempts) {
                // Retry avec délais CDC §3.8.2 : 1 min, 5 min, 15 min
                const delay = this.retryDelays[attempt - 1] ?? 60_000;
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.sendEmail(to, templateKey, params, attempt + 1);
            }

            return { success: false, error: error.message };
        }
    }

    /** Résumé SMTP (sans secrets) pour l’administration. */
    getSmtpConfigSummary() {
        const user = (process.env.SMTP_USER || '').trim();
        const maskUser = (value) => {
            if (!value) return null;
            if (value.includes('@')) {
                const [local, domain] = value.split('@');
                const head = local.length <= 2 ? '**' : `${local.slice(0, 2)}***`;
                return `${head}@${domain}`;
            }
            return value.length <= 2 ? '***' : `${value.slice(0, 2)}***`;
        };
        return {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '1025', 10),
            secure: process.env.SMTP_SECURE === 'true',
            from: process.env.SMTP_FROM || 'noreply@gestionplanning.local',
            user: maskUser(user),
            authConfigured: Boolean(user && (process.env.SMTP_PASS || '').trim()),
        };
    }

    async verifySmtpConnection() {
        await transporter.verify();
        return { ok: true };
    }

    /**
     * E-mail de test (Admin → Configuration).
     */
    async sendTestEmail(to, options = {}) {
        const summary = this.getSmtpConfigSummary();
        const sentAt = formatFrDateTime(new Date());
        const adminName = options.adminName || 'Administrateur';
        const appName = options.appName || 'Gestion Planning';
        const frontendUrl = process.env.FRONTEND_URL || '—';

        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin:0;">${appName}</h1>
          <p style="margin:8px 0 0; opacity:0.9;">Test d'envoi SMTP</p>
        </div>
        <div style="padding: 24px; color: #333;">
          <p>Bonjour,</p>
          <p>Ce message confirme que la configuration <strong>SMTP</strong> de l'application fonctionne correctement.</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding:8px; border:1px solid #e8e8e8; background:#fafafa;"><strong>Envoyé par</strong></td>
                <td style="padding:8px; border:1px solid #e8e8e8;">${adminName}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e8e8e8; background:#fafafa;"><strong>Date</strong></td>
                <td style="padding:8px; border:1px solid #e8e8e8;">${sentAt}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e8e8e8; background:#fafafa;"><strong>Serveur</strong></td>
                <td style="padding:8px; border:1px solid #e8e8e8;">${summary.host}:${summary.port}${summary.secure ? ' (TLS)' : ''}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e8e8e8; background:#fafafa;"><strong>Expéditeur</strong></td>
                <td style="padding:8px; border:1px solid #e8e8e8;">${summary.from}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e8e8e8; background:#fafafa;"><strong>URL application</strong></td>
                <td style="padding:8px; border:1px solid #e8e8e8;">${frontendUrl}</td></tr>
          </table>
          <p style="font-size: 13px; color: #666;">Si vous recevez cet e-mail, les notifications (plannings, réunions, mots de passe, etc.) pourront être délivrées.</p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          <p>Message de test — ne pas répondre</p>
        </div>
      </div>
    `;

        const subject = `[Test] ${appName} — vérification SMTP`;
        const branding = await getBrandingSettings();
        const branded = applyBranding(subject, html, branding);
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@gestionplanning.local',
            to,
            subject: branded.subject,
            html: branded.html,
            attachments: buildEmailLogoAttachments(),
        });
        logger.success('EMAIL_TEST', `E-mail de test envoyé à ${to}`, { to, messageId: info.messageId });
        return { success: true, messageId: info.messageId };
    }

    /**
     * Envoyer un email avec contenu HTML libre (ex: rapport hebdomadaire)
     */
    async sendRawEmail(to, subject, html) {
        try {
            const branding = await getBrandingSettings();
            const branded = applyBranding(subject, html, branding);
            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@gestionplanning.local',
                to,
                subject: branded.subject,
                html: branded.html,
                attachments: buildEmailLogoAttachments(),
            });
            logger.success('EMAIL_SENT', `Rapport envoyé à ${to}`, { to, messageId: info.messageId });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('EMAIL_FAILED', `Échec envoi rapport à ${to}`, { to, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Créer une notification in-app
     */
    async createNotification(prisma, userId, type, title, body, link = null, options = {}) {
        try {
            if (!options.ignorePreferences) {
                const prefs = await this.getUserNotificationPreferences(prisma, userId);
                const allowedByType = this.shouldSendChannel(prefs.channels, type, 'inApp');
                const quiet = isInQuietHours(prefs.quietHours);
                if (!allowedByType || quiet) {
                    return null;
                }
            }
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    body,
                    link,
                    isRead: false,
                },
            });

            logger.success(
                'NOTIFICATION_CREATED',
                `Notification créée pour l'utilisateur ${userId}`, { notificationId: notification.id, type, userId }
            );
            emitToUser(userId, 'notification:new', notification);

            return notification;
        } catch (error) {
            logger.error('NOTIFICATION_ERROR', 'Erreur lors de la création de notification', {
                userId,
                type,
                error: error.message,
            });
            return null;
        }
    }

    /**
     * Envoyer une notification complète (email + in-app)
     */
    async sendFullNotification(
        prisma,
        userId,
        email,
        notificationType,
        emailTemplate,
        templateParams,
        inAppTitle,
        inAppBody,
        inAppLink
    ) {
        try {
            const prefs = await this.getUserNotificationPreferences(prisma, userId);
            const quietNow = isInQuietHours(prefs.quietHours);
            const allowEmail = this.shouldSendChannel(prefs.channels, notificationType, 'email') && !quietNow;
            const allowInApp = this.shouldSendChannel(prefs.channels, notificationType, 'inApp') && !quietNow;

            // Envoyer l'email
            const emailResult = allowEmail
                ? await this.sendEmail(email, emailTemplate, templateParams)
                : { success: false, skipped: true, reason: quietNow ? 'quiet_hours' : 'channel_disabled' };

            // Créer la notification in-app
            const notification = allowInApp
                ? await this.createNotification(
                    prisma,
                    userId,
                    notificationType,
                    inAppTitle,
                    inAppBody,
                    inAppLink,
                    { ignorePreferences: true }
                )
                : null;

            logger.success('FULL_NOTIFICATION_SENT', `Notification complète envoyée à ${email}`, {
                userId,
                emailSent: emailResult.success,
                inAppCreated: notification !== null,
            });

            return {
                success: (emailResult.success || emailResult.skipped) && (allowInApp ? notification !== null : true),
                email: emailResult,
                inApp: notification,
            };
        } catch (error) {
            logger.error('FULL_NOTIFICATION_ERROR', 'Erreur lors de l\'envoi de notification complète', {
                userId,
                error: error.message,
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Envoyer une notification à plusieurs utilisateurs
     */
    async sendBulkNotification(prisma, userIds, notificationType, title, body, link = null) {
        const results = [];

        for (const userId of userIds) {
            try {
                const notification = await this.createNotification(
                    prisma,
                    userId,
                    notificationType,
                    title,
                    body,
                    link
                );
                results.push({ userId, success: notification !== null });
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }

        logger.info('BULK_NOTIFICATION_SENT', `${results.filter((r) => r.success).length}/${results.length} notifications envoyées`, {
            total: results.length,
            succeeded: results.filter((r) => r.success).length,
        });

        return results;
    }

    /**
     * Marquer une notification comme lue
     */
    async markAsRead(prisma, notificationId) {
        try {
            const notification = await prisma.notification.update({
                where: { id: notificationId },
                data: { isRead: true },
            });

            logger.debug('NOTIFICATION_READ', `Notification ${notificationId} marquée comme lue`);
            return notification;
        } catch (error) {
            logger.error('NOTIFICATION_READ_ERROR', 'Erreur lors de la lecture de notification', {
                notificationId,
                error: error.message,
            });
            return null;
        }
    }

    /**
     * Récupérer les notifications de l'utilisateur avec pagination (pour GET /api/notifications)
     */
    async getNotifications(prisma, userId, skip = 0, limit = 20) {
        try {
            const [notifications, total, unread] = await Promise.all([
                prisma.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.notification.count({ where: { userId } }),
                prisma.notification.count({ where: { userId, isRead: false } }),
            ]);

            return { notifications, total, unread };
        } catch (error) {
            logger.error('GET_NOTIFICATIONS_ERROR', 'Erreur récupération notifications', {
                userId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Compter les notifications non lues (pour GET /api/notifications/unread/count)
     */
    async getUnreadCount(prisma, userId) {
        try {
            return await prisma.notification.count({
                where: { userId, isRead: false },
            });
        } catch (error) {
            logger.error('UNREAD_COUNT_ERROR', error.message, { userId });
            throw error;
        }
    }

    /**
     * Marquer toutes les notifications comme lues
     */
    async markAllAsRead(prisma, userId) {
        try {
            await prisma.notification.updateMany({
                where: { userId },
                data: { isRead: true },
            });
            return true;
        } catch (error) {
            logger.error('MARK_ALL_AS_READ_ERROR', error.message, { userId });
            throw error;
        }
    }

    /**
     * Obtenir les notifications non lues d'un utilisateur
     */
    async getUnreadNotifications(prisma, userId) {
        try {
            const notifications = await prisma.notification.findMany({
                where: {
                    userId,
                    isRead: false,
                },
                orderBy: { createdAt: 'desc' },
            });

            return notifications;
        } catch (error) {
            logger.error('UNREAD_NOTIFICATIONS_ERROR', 'Erreur lors de la récupération des notifications', {
                userId,
                error: error.message,
            });
            return [];
        }
    }

    /**
     * Supprimer les anciennes notifications (older than days)
     */
    async cleanupOldNotifications(prisma, days = 30) {
        try {
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const deleted = await prisma.notification.deleteMany({
                where: {
                    createdAt: { lt: cutoff },
                    isRead: true,
                },
            });

            logger.info('NOTIFICATIONS_CLEANUP', `${deleted.count} anciennes notifications supprimées`);
            return deleted;
        } catch (error) {
            logger.error('NOTIFICATIONS_CLEANUP_ERROR', 'Erreur lors du nettoyage des notifications', {
                error: error.message,
            });
            return null;
        }
    }
}

// Exporter l'instance singleton
const notificationService = new NotificationService();

module.exports = { notificationService, emailTemplates };