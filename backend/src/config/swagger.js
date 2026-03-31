const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gestion Planning API',
      version: '1.0.0',
      description: `
API REST pour la gestion de planning, réunions, salles et notifications.

## Rôles utilisateurs
- **RESPONSABLE** : Soumet son planning hebdomadaire
- **CONSOLIDATEUR** : Consolide les plannings des responsables
- **DG** : Valide ou retourne les plannings consolidés
- **ADMIN** : Gestion des utilisateurs et configuration
- **SUPER_ADMIN** : Même périmètre qu'ADMIN + audit messagerie et modération globale

## Authentification
Toutes les routes protégées requièrent un token JWT Bearer dans le header Authorization.
      `,
      contact: {
        name: 'Support Gestion Planning',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Serveur de développement',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via POST /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1abc123' },
            name: { type: 'string', example: 'Jean Dupont' },
            email: { type: 'string', format: 'email', example: 'jean.dupont@example.com' },
            role: {
              type: 'string',
              enum: ['RESPONSABLE', 'CONSOLIDATEUR', 'DG', 'ADMIN', 'SUPER_ADMIN'],
              example: 'RESPONSABLE',
            },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Planning: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx1abc123' },
            userId: { type: 'string' },
            weekStart: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SUBMITTED', 'IN_CONSOLIDATION', 'VALIDATED', 'RETURNED'],
              example: 'DRAFT',
            },
            submittedAt: { type: 'string', format: 'date-time', nullable: true },
            consolidatedAt: { type: 'string', format: 'date-time', nullable: true },
            validatedAt: { type: 'string', format: 'date-time', nullable: true },
            returnedAt: { type: 'string', format: 'date-time', nullable: true },
            returnComment: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PlanningEvent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            planningId: { type: 'string' },
            title: { type: 'string', example: 'Réunion équipe' },
            type: {
              type: 'string',
              enum: ['REUNION', 'MISSION', 'CONGE', 'FORMATION', 'AUTRE'],
              example: 'REUNION',
            },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            roomId: { type: 'string', nullable: true },
            destination: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
          },
        },
        Meeting: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Réunion de direction' },
            agenda: { type: 'string', example: 'Point sur les projets en cours' },
            organizerId: { type: 'string' },
            roomId: { type: 'string', nullable: true },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SENT', 'CANCELLED'],
              example: 'DRAFT',
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Salle de conférence A' },
            capacity: { type: 'integer', example: 10 },
            location: { type: 'string', example: 'Bâtiment principal, 2ème étage' },
            equipment: { type: 'string', example: 'Projecteur, tableau blanc' },
            openFrom: { type: 'string', example: '08:00' },
            openTo: { type: 'string', example: '19:00' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            type: {
              type: 'string',
              enum: [
                'PLANNING_SUBMITTED',
                'PLANNING_VALIDATED',
                'PLANNING_RETURNED',
                'PLANNING_REMINDER',
                'MEETING_CONVOCATION',
                'MEETING_REMINDER',
                'MEETING_CANCELLED',
              ],
              example: 'PLANNING_VALIDATED',
            },
            title: { type: 'string', example: 'Planning validé' },
            body: { type: 'string', example: 'Votre planning a été validé par le DG' },
            link: { type: 'string', nullable: true, example: '/plannings/clx1abc123' },
            isRead: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Invitation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            meetingId: { type: 'string' },
            userId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
              example: 'PENDING',
            },
            sentAt: { type: 'string', format: 'date-time', nullable: true },
            respondedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string', nullable: true },
            action: { type: 'string', example: 'LOGIN' },
            entity: { type: 'string', example: 'User' },
            entityId: { type: 'string' },
            ipAddress: { type: 'string', nullable: true },
            details: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Message d\'erreur' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token manquant ou invalide',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'No token provided' },
            },
          },
        },
        Forbidden: {
          description: 'Droits insuffisants',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Forbidden' },
            },
          },
        },
        NotFound: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Resource not found' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/routes/*.js',
    './server.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
