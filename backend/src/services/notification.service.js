const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { emitToUser } = require('../realtime/socket');
const prisma = new PrismaClient();

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

// Configuration de l'email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    auth: process.env.SMTP_USER ?
        {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        } :
        undefined,
    secure: process.env.SMTP_SECURE === 'true',
    tls: {
        rejectUnauthorized: false,
    },
});

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
          <p>Bonjour ${user.name},</p>
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

    PLANNING_SUBMITTED: (user, planningId) => ({
        subject: '✅ Confirmation : Votre planning a été reçu',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${user.name},</p>
          <p>✅ Votre planning a été soumis avec succès!</p>
          <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <strong>Status:</strong> Planning reçu et en cours de consolidation
          </div>
          <p>Le consolidateur examinera votre planning et le transmettra au Directeur Général pour validation.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/planning" style="display: inline-block; background: #1F5C8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Consulter mon planning
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    }),

    PLANNING_VALIDATED: (user) => ({
        subject: '🎉 Votre planning a été validé!',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${user.name},</p>
          <p>🎉 Excellente nouvelle! Votre planning a été validé par le Directeur Général!</p>
          <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <strong>Status:</strong> Planning validé ✓
          </div>
          <p>Votre planning est maintenant officiel et consultable par tous.</p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    }),

    PLANNING_RETURNED: (user, comment) => ({
        subject: '📌 Votre planning doit être modifié',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${user.name},</p>
          <p>📌 Votre planning a été retourné pour modifications.</p>
          <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <strong>Commentaire du Directeur Général:</strong><br>
            ${comment}
          </div>
          <p>Veuillez corriger votre planning et le resoumetre dès que possible.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/planning" style="display: inline-block; background: #1F5C8B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Modifier mon planning
            </a>
          </p>
        </div>
        <div style="border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>© 2026 Gestion Planning - Tous droits réservés</p>
        </div>
      </div>
    `,
    }),

    MEETING_CONVOCATION: (participant, meeting, room, actions = {}) => ({
        subject: `📅 Convocation : ${meeting.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${participant.name},</p>
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
          <p>Bonjour ${participant.name},</p>
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
          <p>Bonjour ${participant.name},</p>
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

  PASSWORD_RESET: (user, resetUrl) => ({
    subject: '🔑 Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${user.name},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <strong>⚠️ Ce lien est valable 1 heure.</strong>
          </div>
          <p>
            <a href="${resetUrl}" style="display: inline-block; background: #1F5C8B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Réinitialiser mon mot de passe
            </a>
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
          <p>Bonjour ${user.name},</p>
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

  ROLE_CHANGED: (user, newRoleLabel, previousRoleLabel) => ({
    subject: '👤 Votre rôle a été modifié - Gestion Planning',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${user.name},</p>
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
          <p>Bonjour ${user.name},</p>
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
    const startStr = new Date(mission.startTime).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
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
          <p>Bonjour ${user.name},</p>
          <p>Une nouvelle mission vous a été assignée par <strong>${createdByName}</strong>.</p>
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

  ACCOUNT_ACTIVATED: (user) => ({
    subject: '✅ Votre compte a été réactivé - Gestion Planning',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1F5C8B 0%, #2a7cb8 100%); color: white; padding: 20px; text-align: center;">
          <h1>Gestion Planning</h1>
        </div>
        <div style="padding: 20px;">
          <p>Bonjour ${user.name},</p>
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
          <p>Bonjour ${user.name},</p>
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
    const startStr = new Date(mission.startTime).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
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
          <p>Bonjour ${user.name},</p>
          <p>Une mission à laquelle vous êtes assigné(e) a été modifiée par <strong>${createdByName}</strong>.</p>
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
          <p>Bonjour ${user.name},</p>
          <p>La mission <strong>« ${mission.title } »</strong> (${mission.location}) à laquelle vous étiez assigné(e) a été <strong>annulée</strong> par ${createdByName}.</p>
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
    const dateStr = new Date(meeting.startTime).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
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
          <p>Bonjour ${user.name},</p>
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
 * URL absolue du logo dans les e-mails.
 * Priorité : EMAIL_LOGO_URL → app_logo_url (http ou chemin relatif/absolu) → http://localhost:9000/logo-gp.png
 */
function getEmailLogoUrl(branding) {
    const explicit = (process.env.EMAIL_LOGO_URL || '').trim();
    if (explicit) return explicit;
    const u = branding?.app_logo_url ? String(branding.app_logo_url).trim() : '';
    const base = getPublicAppBaseUrl();

    if (u && /^https?:\/\//i.test(u)) return u;
    if (u && u.startsWith('/')) return `${base}${u}`;
    if (u && !u.startsWith('/')) return `${base}/${u}`;

    // Fallback strict demandé (sans config admin)
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