--
-- PostgreSQL database dump
--

\restrict eDew0QVLsoROcfvd9LG1l91FURNT9p7wq5tcWZJQz1mOiHkRn6dmWyfuucQxn4S

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_directionId_fkey";
ALTER TABLE IF EXISTS ONLY public."RoomBooking" DROP CONSTRAINT IF EXISTS "RoomBooking_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."RoomBooking" DROP CONSTRAINT IF EXISTS "RoomBooking_roomId_fkey";
ALTER TABLE IF EXISTS ONLY public."RoomBooking" DROP CONSTRAINT IF EXISTS "RoomBooking_meetingId_fkey";
ALTER TABLE IF EXISTS ONLY public."RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."ProjectFile" DROP CONSTRAINT IF EXISTS "ProjectFile_uploadedById_fkey";
ALTER TABLE IF EXISTS ONLY public."ProjectFile" DROP CONSTRAINT IF EXISTS "ProjectFile_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public."Planning" DROP CONSTRAINT IF EXISTS "Planning_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."PlanningEvent" DROP CONSTRAINT IF EXISTS "PlanningEvent_roomId_fkey";
ALTER TABLE IF EXISTS ONLY public."PlanningEvent" DROP CONSTRAINT IF EXISTS "PlanningEvent_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public."PlanningEvent" DROP CONSTRAINT IF EXISTS "PlanningEvent_planningId_fkey";
ALTER TABLE IF EXISTS ONLY public."PlanningEvent" DROP CONSTRAINT IF EXISTS "PlanningEvent_directionId_fkey";
ALTER TABLE IF EXISTS ONLY public."PasswordHistory" DROP CONSTRAINT IF EXISTS "PasswordHistory_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Mission" DROP CONSTRAINT IF EXISTS "Mission_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public."Mission" DROP CONSTRAINT IF EXISTS "Mission_directionId_fkey";
ALTER TABLE IF EXISTS ONLY public."Mission" DROP CONSTRAINT IF EXISTS "Mission_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."MissionFile" DROP CONSTRAINT IF EXISTS "MissionFile_uploadedById_fkey";
ALTER TABLE IF EXISTS ONLY public."MissionFile" DROP CONSTRAINT IF EXISTS "MissionFile_missionId_fkey";
ALTER TABLE IF EXISTS ONLY public."MissionAssignment" DROP CONSTRAINT IF EXISTS "MissionAssignment_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."MissionAssignment" DROP CONSTRAINT IF EXISTS "MissionAssignment_missionId_fkey";
ALTER TABLE IF EXISTS ONLY public."Meeting" DROP CONSTRAINT IF EXISTS "Meeting_roomId_fkey";
ALTER TABLE IF EXISTS ONLY public."Meeting" DROP CONSTRAINT IF EXISTS "Meeting_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public."Meeting" DROP CONSTRAINT IF EXISTS "Meeting_organizerId_fkey";
ALTER TABLE IF EXISTS ONLY public."Meeting" DROP CONSTRAINT IF EXISTS "Meeting_directionId_fkey";
ALTER TABLE IF EXISTS ONLY public."MeetingMessage" DROP CONSTRAINT IF EXISTS "MeetingMessage_senderId_fkey";
ALTER TABLE IF EXISTS ONLY public."MeetingMessage" DROP CONSTRAINT IF EXISTS "MeetingMessage_parentId_fkey";
ALTER TABLE IF EXISTS ONLY public."MeetingMessage" DROP CONSTRAINT IF EXISTS "MeetingMessage_meetingId_fkey";
ALTER TABLE IF EXISTS ONLY public."MeetingFile" DROP CONSTRAINT IF EXISTS "MeetingFile_uploadedById_fkey";
ALTER TABLE IF EXISTS ONLY public."MeetingFile" DROP CONSTRAINT IF EXISTS "MeetingFile_meetingId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invitation" DROP CONSTRAINT IF EXISTS "Invitation_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Invitation" DROP CONSTRAINT IF EXISTS "Invitation_meetingId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectionMessage" DROP CONSTRAINT IF EXISTS "DirectionMessage_senderId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectionMessage" DROP CONSTRAINT IF EXISTS "DirectionMessage_parentId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectionMessage" DROP CONSTRAINT IF EXISTS "DirectionMessage_directionId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectionDiscussion" DROP CONSTRAINT IF EXISTS "DirectionDiscussion_directionId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectionDiscussionMember" DROP CONSTRAINT IF EXISTS "DirectionDiscussionMember_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectionDiscussionMember" DROP CONSTRAINT IF EXISTS "DirectionDiscussionMember_discussionId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_senderId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_receiverId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_parentId_fkey";
ALTER TABLE IF EXISTS ONLY public."DeviceToken" DROP CONSTRAINT IF EXISTS "DeviceToken_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Backup" DROP CONSTRAINT IF EXISTS "Backup_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."User_directionId_idx";
DROP INDEX IF EXISTS public."Room_name_key";
DROP INDEX IF EXISTS public."RoomBooking_meetingId_key";
DROP INDEX IF EXISTS public."RepertoireContact_ordre_idx";
DROP INDEX IF EXISTS public."RepertoireContact_directionLabel_idx";
DROP INDEX IF EXISTS public."RefreshToken_token_key";
DROP INDEX IF EXISTS public."Project_status_idx";
DROP INDEX IF EXISTS public."Project_name_key";
DROP INDEX IF EXISTS public."Project_createdById_idx";
DROP INDEX IF EXISTS public."Project_code_key";
DROP INDEX IF EXISTS public."ProjectFile_projectId_createdAt_idx";
DROP INDEX IF EXISTS public."Planning_userId_weekStart_key";
DROP INDEX IF EXISTS public."PlanningEvent_projectId_idx";
DROP INDEX IF EXISTS public."PlanningEvent_directionId_idx";
DROP INDEX IF EXISTS public."PasswordHistory_userId_createdAt_idx";
DROP INDEX IF EXISTS public."Mission_projectId_idx";
DROP INDEX IF EXISTS public."Mission_directionId_idx";
DROP INDEX IF EXISTS public."MissionFile_missionId_createdAt_idx";
DROP INDEX IF EXISTS public."MissionAssignment_missionId_userId_key";
DROP INDEX IF EXISTS public."Meeting_projectId_idx";
DROP INDEX IF EXISTS public."Meeting_directionId_idx";
DROP INDEX IF EXISTS public."MeetingMessage_parentId_idx";
DROP INDEX IF EXISTS public."MeetingMessage_meetingId_createdAt_idx";
DROP INDEX IF EXISTS public."MeetingFile_meetingId_createdAt_idx";
DROP INDEX IF EXISTS public."Invitation_meetingId_userId_key";
DROP INDEX IF EXISTS public."Direction_name_key";
DROP INDEX IF EXISTS public."Direction_code_key";
DROP INDEX IF EXISTS public."DirectionMessage_senderId_createdAt_idx";
DROP INDEX IF EXISTS public."DirectionMessage_parentId_idx";
DROP INDEX IF EXISTS public."DirectionMessage_directionId_createdAt_idx";
DROP INDEX IF EXISTS public."DirectionDiscussion_directionId_key";
DROP INDEX IF EXISTS public."DirectionDiscussionMember_userId_joinedAt_idx";
DROP INDEX IF EXISTS public."DirectionDiscussionMember_discussionId_userId_key";
DROP INDEX IF EXISTS public."DirectMessage_senderId_receiverId_createdAt_idx";
DROP INDEX IF EXISTS public."DirectMessage_receiverId_senderId_isRead_idx";
DROP INDEX IF EXISTS public."DirectMessage_receiverId_createdAt_idx";
DROP INDEX IF EXISTS public."DirectMessage_parentId_idx";
DROP INDEX IF EXISTS public."DeviceToken_userId_idx";
DROP INDEX IF EXISTS public."DeviceToken_token_key";
DROP INDEX IF EXISTS public."Backup_status_idx";
DROP INDEX IF EXISTS public."Backup_startedAt_idx";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."Room" DROP CONSTRAINT IF EXISTS "Room_pkey";
ALTER TABLE IF EXISTS ONLY public."RoomBooking" DROP CONSTRAINT IF EXISTS "RoomBooking_pkey";
ALTER TABLE IF EXISTS ONLY public."RepertoireContact" DROP CONSTRAINT IF EXISTS "RepertoireContact_pkey";
ALTER TABLE IF EXISTS ONLY public."RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_pkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_pkey";
ALTER TABLE IF EXISTS ONLY public."ProjectFile" DROP CONSTRAINT IF EXISTS "ProjectFile_pkey";
ALTER TABLE IF EXISTS ONLY public."Planning" DROP CONSTRAINT IF EXISTS "Planning_pkey";
ALTER TABLE IF EXISTS ONLY public."PlanningEvent" DROP CONSTRAINT IF EXISTS "PlanningEvent_pkey";
ALTER TABLE IF EXISTS ONLY public."PasswordHistory" DROP CONSTRAINT IF EXISTS "PasswordHistory_pkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_pkey";
ALTER TABLE IF EXISTS ONLY public."Mission" DROP CONSTRAINT IF EXISTS "Mission_pkey";
ALTER TABLE IF EXISTS ONLY public."MissionFile" DROP CONSTRAINT IF EXISTS "MissionFile_pkey";
ALTER TABLE IF EXISTS ONLY public."MissionAssignment" DROP CONSTRAINT IF EXISTS "MissionAssignment_pkey";
ALTER TABLE IF EXISTS ONLY public."Meeting" DROP CONSTRAINT IF EXISTS "Meeting_pkey";
ALTER TABLE IF EXISTS ONLY public."MeetingMessage" DROP CONSTRAINT IF EXISTS "MeetingMessage_pkey";
ALTER TABLE IF EXISTS ONLY public."MeetingFile" DROP CONSTRAINT IF EXISTS "MeetingFile_pkey";
ALTER TABLE IF EXISTS ONLY public."Invitation" DROP CONSTRAINT IF EXISTS "Invitation_pkey";
ALTER TABLE IF EXISTS ONLY public."Direction" DROP CONSTRAINT IF EXISTS "Direction_pkey";
ALTER TABLE IF EXISTS ONLY public."DirectionMessage" DROP CONSTRAINT IF EXISTS "DirectionMessage_pkey";
ALTER TABLE IF EXISTS ONLY public."DirectionDiscussion" DROP CONSTRAINT IF EXISTS "DirectionDiscussion_pkey";
ALTER TABLE IF EXISTS ONLY public."DirectionDiscussionMember" DROP CONSTRAINT IF EXISTS "DirectionDiscussionMember_pkey";
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_pkey";
ALTER TABLE IF EXISTS ONLY public."DeviceToken" DROP CONSTRAINT IF EXISTS "DeviceToken_pkey";
ALTER TABLE IF EXISTS ONLY public."Backup" DROP CONSTRAINT IF EXISTS "Backup_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE IF EXISTS ONLY public."AppSetting" DROP CONSTRAINT IF EXISTS "AppSetting_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."RoomBooking";
DROP TABLE IF EXISTS public."Room";
DROP TABLE IF EXISTS public."RepertoireContact";
DROP TABLE IF EXISTS public."RefreshToken";
DROP TABLE IF EXISTS public."ProjectFile";
DROP TABLE IF EXISTS public."Project";
DROP TABLE IF EXISTS public."PlanningEvent";
DROP TABLE IF EXISTS public."Planning";
DROP TABLE IF EXISTS public."PasswordHistory";
DROP TABLE IF EXISTS public."Notification";
DROP TABLE IF EXISTS public."MissionFile";
DROP TABLE IF EXISTS public."MissionAssignment";
DROP TABLE IF EXISTS public."Mission";
DROP TABLE IF EXISTS public."MeetingMessage";
DROP TABLE IF EXISTS public."MeetingFile";
DROP TABLE IF EXISTS public."Meeting";
DROP TABLE IF EXISTS public."Invitation";
DROP TABLE IF EXISTS public."DirectionMessage";
DROP TABLE IF EXISTS public."DirectionDiscussionMember";
DROP TABLE IF EXISTS public."DirectionDiscussion";
DROP TABLE IF EXISTS public."Direction";
DROP TABLE IF EXISTS public."DirectMessage";
DROP TABLE IF EXISTS public."DeviceToken";
DROP TABLE IF EXISTS public."Backup";
DROP TABLE IF EXISTS public."AuditLog";
DROP TABLE IF EXISTS public."AppSetting";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AppSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppSetting" (
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text NOT NULL,
    "ipAddress" text,
    details text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Backup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Backup" (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "relativePath" text NOT NULL,
    "sizeBytes" integer,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "errorMessage" text,
    kind text DEFAULT 'MANUAL'::text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "finishedAt" timestamp(3) without time zone,
    "createdById" text
);


--
-- Name: DeviceToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeviceToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DirectMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DirectMessage" (
    id text NOT NULL,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    body text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fileName" text,
    "fileUrl" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "mimeType" text,
    size integer,
    "parentId" text
);


--
-- Name: Direction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Direction" (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "logoUrl" text DEFAULT '/logo-gp.png'::text NOT NULL
);


--
-- Name: DirectionDiscussion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DirectionDiscussion" (
    id text NOT NULL,
    "directionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DirectionDiscussionMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DirectionDiscussionMember" (
    id text NOT NULL,
    "discussionId" text NOT NULL,
    "userId" text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DirectionMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DirectionMessage" (
    id text NOT NULL,
    "directionId" text NOT NULL,
    "senderId" text NOT NULL,
    body text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "fileName" text,
    "fileUrl" text,
    "mimeType" text,
    size integer,
    "parentId" text
);


--
-- Name: Invitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invitation" (
    id text NOT NULL,
    "meetingId" text NOT NULL,
    "userId" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Meeting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Meeting" (
    id text NOT NULL,
    title text NOT NULL,
    agenda text NOT NULL,
    "organizerId" text NOT NULL,
    "roomId" text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "orderOfDay" text,
    attachments text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "meetingLink" text,
    "directionId" text,
    "projectId" text
);


--
-- Name: MeetingFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MeetingFile" (
    id text NOT NULL,
    "meetingId" text NOT NULL,
    "uploadedById" text NOT NULL,
    kind text DEFAULT 'DOCUMENT'::text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "mimeType" text,
    size integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MeetingMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MeetingMessage" (
    id text NOT NULL,
    "meetingId" text NOT NULL,
    "senderId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "parentId" text
);


--
-- Name: Mission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Mission" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    location text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "createdById" text NOT NULL,
    status text DEFAULT 'CONFIRMED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "directionId" text,
    "projectId" text
);


--
-- Name: MissionAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MissionAssignment" (
    id text NOT NULL,
    "missionId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MissionFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MissionFile" (
    id text NOT NULL,
    "missionId" text NOT NULL,
    "uploadedById" text NOT NULL,
    kind text DEFAULT 'DOCUMENT'::text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "mimeType" text,
    size integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    link text,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PasswordHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordHistory" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Planning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Planning" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "weekStart" timestamp(3) without time zone NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "consolidatedAt" timestamp(3) without time zone,
    "validatedAt" timestamp(3) without time zone,
    "returnedAt" timestamp(3) without time zone,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "returnComment" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PlanningEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PlanningEvent" (
    id text NOT NULL,
    "planningId" text NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "roomId" text,
    destination text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "directionId" text,
    "projectId" text
);


--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL
);


--
-- Name: ProjectFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProjectFile" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "uploadedById" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "mimeType" text,
    size integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isRevoked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RepertoireContact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RepertoireContact" (
    id text NOT NULL,
    numero integer DEFAULT 0 NOT NULL,
    "prenomNom" text NOT NULL,
    fonction text,
    "directionLabel" text NOT NULL,
    poste text,
    directe text,
    portable text,
    ordre integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Room; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Room" (
    id text NOT NULL,
    name text NOT NULL,
    capacity integer NOT NULL,
    location text NOT NULL,
    equipment text NOT NULL,
    "openFrom" text DEFAULT '08:00'::text NOT NULL,
    "openTo" text DEFAULT '19:00'::text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RoomBooking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RoomBooking" (
    id text NOT NULL,
    "roomId" text NOT NULL,
    "meetingId" text,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    status text DEFAULT 'CONFIRMED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role text DEFAULT 'RESPONSABLE'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "avatarUrl" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "directionId" text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AppSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AppSetting" (key, value, "updatedAt") FROM stdin;
2fa_enabled	true	2026-03-26 14:42:50.875
integrated_visio_enabled	false	2026-03-26 15:54:57.954
direct_messages_enabled	true	2026-03-26 16:07:26.332
app_footer_text	© 2026 GP - Tous droits réservés	2026-05-01 12:33:01.227
app_contact_phone	3380002020	2026-05-01 12:33:01.227
app_contact_address	Dakar	2026-05-01 12:33:01.227
app_contact_email	contact@adm.sn	2026-05-01 12:33:01.227
app_logo_url	/uploads/branding/app_logo_1777638779986.png	2026-05-01 12:33:01.228
app_name	ADM GP	2026-05-01 12:33:01.227
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "userId", action, entity, "entityId", "ipAddress", details, "createdAt") FROM stdin;
cmmo3z3oc000925fvwtdnzc5b	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	\N	2026-03-12 23:38:06.301
cmmo4ctwr0003htg3vojgr0q1	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	\N	2026-03-12 23:48:46.827
cmmo4ptsp0003lvr2wo46kfgx	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-12 23:58:53.209
cmmo4ssxu000dlvr274u3txmx	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmmo4sswp0005lvr2qs2c0fi5	::1	Réunion "TEST TETSE" créée	2026-03-13 00:01:12.066
cmmo4togy000flvr2xuqd8w3g	cmmo3suxw0000p1np0eron6et	MEETING_UPDATED	Meeting	cmmo4sswp0005lvr2qs2c0fi5	::1	Réunion "TEST TETSE" modifiée (horaire/salle)	2026-03-13 00:01:52.93
cmmo4ucil000jlvr2369nceyr	cmmo3suxw0000p1np0eron6et	MEETING_UPDATED	Meeting	cmmo4sswp0005lvr2qs2c0fi5	::1	Réunion "TEST TETSE" modifiée (horaire/salle)	2026-03-13 00:02:24.094
cmmo4wu59000tak15tkw9t3b7	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmmo4sswp0005lvr2qs2c0fi5	\N	Convocations réunion "TEST TETSE" envoyées	2026-03-13 00:04:20.253
cmmom81yz0003ruosw6v390p4	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 08:08:57.083
cmmom92kt0007ruosej2ist2i	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 08:09:44.525
cmmommfpf0009ruos6l2mefb2	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3svr60002p1npg39ix3rb	::1	Mot de passe réinitialisé pour dg@example.com	2026-03-13 08:20:08.066
cmmommik4000bruosco8ibhp6	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3svr60002p1npg39ix3rb	::1	Mot de passe réinitialisé pour dg@example.com	2026-03-13 08:20:11.764
cmmonkj6j0003r25v0wc1hl69	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 08:46:38.875
cmmoo9c1v000bwlvx2ogd5j3h	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 09:05:56.035
cmmot9cxn00028jo7ftng60ys	cmmo3suxw0000p1np0eron6et	CREATE_USER	User	cmmot9cwj00008jo77uui1yor	::1	Utilisateur alhusseinkhouma0@gmail.com créé	2026-03-13 11:25:55.259
cmmovl6oh00039wszkul11cxe	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 12:31:06.256
cmmozx86h0003xnvotf1gpz5k	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 14:32:26.537
cmmozzr050007xnvor9tl6j6v	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 14:34:24.245
cmmp01s0x000gxnvor81anb9d	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmmp01rza0009xnvoupogf5ih	::1	Réunion "TESTETE A" créée	2026-03-13 14:35:58.882
cmmp029tq000sxnvozpndl2i7	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmmp01rza0009xnvoupogf5ih	::1	Convocations réunion "TESTETE A" envoyées	2026-03-13 14:36:21.951
cmmqj4isj0003g3pet4bwfvam	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 16:17:45.763
cmmqj6lyr000gg3pezx2q551b	cmmo3suxw0000p1np0eron6et	MISSION_CREATED	Mission	cmmqj6eu50005g3pealoydma1	::1	Mission ADM créée	2026-03-14 16:19:23.187
cmmqjq0ir0003btgmgrj5w3zz	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 16:34:28.516
cmmqlmlq10003snjkclb37el5	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 17:27:48.602
cmmqm1hsa0003h5j21pr4kdu9	cmmo3suxw0000p1np0eron6et	PLANNING_ADMIN_CREATE	Planning	cmmqm1hqj0001h5j2vd8wdbam	::1	Planning créé par admin pour alhusseinkhouma0@gmail.com	2026-03-14 17:39:23.338
cmmqmfhpv0003hgk8w7npamfe	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 17:50:16.436
cmmqmg9wu0005hgk8i0n9w9e9	cmmo3suxw0000p1np0eron6et	SEND_RESET_LINK	User	cmmot9cwj00008jo77uui1yor	::1	Lien de réinitialisation envoyé à alhusseinkhouma0@gmail.com	2026-03-14 17:50:52.974
cmmqos4k70003vcmbetrfzp3k	cmmo3suxw0000p1np0eron6et	PLANNING_EVENT_CREATED	PlanningEvent	cmmqos4jm0001vcmb8s0hcgf4	::1	Événement ajouté par admin sur planning cmmqm1hqj0001h5j2vd8wdbam	2026-03-14 18:56:05.143
cmmqsaddr0003swm2ymyx4691	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 20:34:15.232
cmmt8sjg000036z3z5ijyp7mh	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-16 13:51:49.103
cmmtmnz1s0003iqtma6f5mcdk	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-16 20:20:10.672
cmmtne8wp0003s3fm0g20bnlf	cmmo3suxw0000p1np0eron6et	PLANNING_ADMIN_CREATE	Planning	cmmtne8w90001s3fmbyxfpnf5	::1	Planning créé par admin pour responsable5@example.com	2026-03-16 20:40:36.505
cmmtnejvu0005s3fmnyx5a6v5	cmmo3suxw0000p1np0eron6et	PLANNING_CONSOLIDATED	Planning	cmmqlgapx00017by4wcyj9dyp	::1	Planning cmmqlgapx00017by4wcyj9dyp consolidé	2026-03-16 20:40:50.73
cmmtner7e0009s3fmw5hk2155	cmmo3suxw0000p1np0eron6et	PLANNING_VALIDATED	Planning	cmmqlgapx00017by4wcyj9dyp	::1	Planning cmmqlgapx00017by4wcyj9dyp validé	2026-03-16 20:41:00.219
cmmtniajp000fs3fmqvzv9rmy	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-16 20:43:45.253
cmmtobly1000js3fmuluyezpd	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-16 21:06:33.049
cmmtqi3lm000zs3fmgurmtxrk	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-16 22:07:35.098
cmmtqq94h000110xe1z5k24qy	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3svdj0001p1npkybbwako	::1	Mot de passe réinitialisé pour mansour.bocoum@example.com	2026-03-16 22:13:55.505
cmmw3rzlm0003ez94n9j4pm7a	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-18 13:54:43.834
cmmw3wxvc0007ez94rkuej64l	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-18 13:58:34.872
cmmw3ypki000dez9405wdv4pe	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmmw3ypk40009ez94hsy51nu9	::1	Réunion "TEST MERCREDI" créée	2026-03-18 13:59:57.427
cmmw3z46z000jez94zq0zbj78	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmmw3ypk40009ez94hsy51nu9	::1	Convocations réunion "TEST MERCREDI" envoyées	2026-03-18 14:00:16.379
cmmw40l8e000wez94xffrxi06	cmmo3suxw0000p1np0eron6et	MISSION_CREATED	Mission	cmmw40fsc000lez94blp2404f	::1	Mission MISSION X créée	2026-03-18 14:01:25.118
cmmw42za40010ez941r9k24gs	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-18 14:03:16.636
cmmw43hmk0014ez94rw4vr4dv	cmmo3suxw0000p1np0eron6et	MEETING_UPDATED	Meeting	cmmw3ypk40009ez94hsy51nu9	::1	Réunion "TEST MERCREDI" modifiée (horaire/salle)	2026-03-18 14:03:40.413
cmmw440re001fez94u8c33dtw	cmmo3suxw0000p1np0eron6et	MISSION_UPDATED	Mission	cmmw40fsc000lez94blp2404f	::1	Mission MISSION X modifiée	2026-03-18 14:04:05.21
cmmw44mf2001jez94bborl2nn	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-18 14:04:33.278
cmmw44ws2001nez94nmgyx147	cmmo3suxw0000p1np0eron6et	MEETING_UPDATED	Meeting	cmmw3ypk40009ez94hsy51nu9	::1	Réunion "TEST MERCREDI" modifiée (horaire/salle)	2026-03-18 14:04:46.706
cmn7fruul0003ng5o6q5u4nw4	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 12:16:01.005
cmn7gk5hw0003130kueow0btu	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 12:38:01.172
cmn7grmdb0007130kqi1dgfgp	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 12:43:49.631
cmn7gsvrc000e130kcyvat2wz	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmn7gsvqw0009130kj9dnmxy2	::1	Réunion "TEST" créée	2026-03-26 12:44:48.456
cmn7gtdz0000m130koi82c1bq	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmn7gsvqw0009130kj9dnmxy2	::1	Convocations réunion "TEST" envoyées	2026-03-26 12:45:12.06
cmn7gu2t9000q130k2xpzyvgb	cmmo3suxw0000p1np0eron6et	MISSION_FILE_ADDED	MissionFile	cmn7gu2t5000o130kmykbg6tq	::1	Fichier "favicon (1).png" ajouté (IMAGE)	2026-03-26 12:45:44.254
cmn7gunzp000u130kvnho0q4j	cmmo3suxw0000p1np0eron6et	MISSION_FILE_ADDED	MissionFile	cmn7gunzl000s130kdoitnl33	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" ajouté (DOCUMENT)	2026-03-26 12:46:11.701
cmn7gv0vj000w130k7v44o9o8	cmmo3suxw0000p1np0eron6et	MISSION_FILE_DELETED	MissionFile	cmn7gu2t5000o130kmykbg6tq	::1	Fichier "favicon (1).png" supprimé	2026-03-26 12:46:28.399
cmn7hns1g001y130kt50je1z8	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 13:08:49.972
cmn7hor4b0020130kbofnp39k	cmmo3suxw0000p1np0eron6et	PLANNING_CONSOLIDATED	Planning	cmn7hgp1e001g130kyuq0qjux	::1	Planning cmn7hgp1e001g130kyuq0qjux consolidé	2026-03-26 13:09:35.436
cmn7hov8m0024130ks6cyo2iv	cmmo3suxw0000p1np0eron6et	PLANNING_VALIDATED	Planning	cmn7hgp1e001g130kyuq0qjux	::1	Planning cmn7hgp1e001g130kyuq0qjux validé	2026-03-26 13:09:40.775
cmn7l0ggh00031p3odq7rind1	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 14:42:40.337
cmn7l0omm00051p3oqpkfaxat	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : 2fa_enabled	2026-03-26 14:42:50.927
cmn7l4rhb000h1p3ocecr6qq9	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 14:46:01.247
cmn7l83sk000l1p3o3kz8cbgu	cmmo3suxw0000p1np0eron6et	MEETING_FILE_ADDED	MeetingFile	cmn7l83sa000j1p3o4r67677p	::1	Fichier "Gemini_Generated_Image_v37ry1v37ry1v37r.png" ajouté (IMAGE)	2026-03-26 14:48:37.172
cmn7lpoyn000646tus8mq9mpc	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmn7lpoxm000146tuwhf71n06	::1	Réunion "TEST CONFLIT" créée	2026-03-26 15:02:17.759
cmn7lr4bj000e46tu9bp6nzbz	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmn7lpoxm000146tuwhf71n06	::1	Convocations réunion "TEST CONFLIT" envoyées	2026-03-26 15:03:24.319
cmn7luv8h000m46tuwyjl9z4v	cmmo3suxw0000p1np0eron6et	MEETING_FILE_ADDED	MeetingFile	cmn7luv8a000k46tu00yz2kvf	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" ajouté (DOCUMENT)	2026-03-26 15:06:19.17
cmn7lvssf000s46tuoqha8r2j	cmmo3suxw0000p1np0eron6et	MEETING_CANCELLED	Meeting	cmn7lpoxm000146tuwhf71n06	::1	Réunion "TEST CONFLIT" annulée	2026-03-26 15:07:02.655
cmn7nlfe80001gqq73tzyw1zq	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : integrated_visio_enabled	2026-03-26 15:54:57.968
cmn7o19lt000dloz1eiuagtd2	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : direct_messages_enabled	2026-03-26 16:07:16.961
cmn7o1guf000floz1438c0pxc	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : direct_messages_enabled	2026-03-26 16:07:26.342
cmn7ojda10001136npxjxokk9	cmmo3suxw0000p1np0eron6et	PLANNING_SUBMITTED	Planning	cmmqm1hqj0001h5j2vd8wdbam	::1	Planning cmmqm1hqj0001h5j2vd8wdbam soumis par l'administration (responsable: cmmot9cwj00008jo77uui1yor)	2026-03-26 16:21:21.529
cmn7ojh250007136n108bnra1	cmmo3suxw0000p1np0eron6et	PLANNING_DELETED	Planning	cmmqm1hqj0001h5j2vd8wdbam	::1	Planning supprimé (semaine du 2026-03-23)	2026-03-26 16:21:26.429
cmn8tovoe0003hgyf81mlfmqn	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-27 11:33:22.911
cmn8uyxeq0005hgyfj4o7lwws	cmmo3suxw0000p1np0eron6et	MEETING_FILE_DELETED	MeetingFile	cmn7l83sa000j1p3o4r67677p	::1	Fichier "Gemini_Generated_Image_v37ry1v37ry1v37r.png" supprimé	2026-03-27 12:09:11.33
cmn8uz2fx0009hgyfom00scc9	cmmo3suxw0000p1np0eron6et	MEETING_FILE_ADDED	MeetingFile	cmn8uz2fp0007hgyfmw55g64y	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" ajouté (REPORT)	2026-03-27 12:09:17.854
cmn8v31om000jhgyfe2pv22ak	cmmo3suxw0000p1np0eron6et	PLANNING_ADMIN_CREATE	Planning	cmn8v31oe000hhgyfi19o47vh	::1	Planning créé par admin pour alhusseinkhouma0@gmail.com	2026-03-27 12:12:23.495
cmn90jc9800032ljafumji9ah	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-27 14:45:01.772
cmn90jy9f00052ljae1tdy9bh	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text	2026-03-27 14:45:30.292
cmn90khqx00072ljahpx37v4p	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text	2026-03-27 14:45:55.546
cmn90qy3v00014glv07wn8jlh	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1774623056602.png	2026-03-27 14:50:56.684
cmn90s4lo00034glvnpbsr9pn	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1774623111713.png	2026-03-27 14:51:51.756
cmn90uuol00054glv3vovf6qp	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1774623238860.png	2026-03-27 14:53:58.87
cmn90uw5c00074glv30aqmt8t	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-03-27 14:54:00.769
cmn90wcsh00094glvwclcxaz2	cmmo3suxw0000p1np0eron6et	SEND_RESET_LINK	User	cmmot9cwj00008jo77uui1yor	::1	Lien de réinitialisation envoyé à alhusseinkhouma0@gmail.com	2026-03-27 14:55:08.993
cmn90xyh0000b4glv0qpuisir	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1774623383737.png	2026-03-27 14:56:23.749
cmn90yaw6000d4glv484u7lc8	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-03-27 14:56:39.846
cmn94cq160003lglk52f7l9jv	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmot9cwj00008jo77uui1yor	::1	Mot de passe réinitialisé pour alhusseinkhouma0@gmail.com	2026-03-27 16:31:51.499
cmn9fp6cn000hue5f4z47mcss	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-27 21:49:28.295
cmn9h1w2j0003rousecbfvmib	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-27 22:27:21.115
cmn9jyivs0011w1vtxhpycqgl	cmmo3suxw0000p1np0eron6et	MISSION_CANCELLED	Mission	cmmqj6eu50005g3pealoydma1	::1	Mission ADM annulée	2026-03-27 23:48:42.904
cmn9k09lk0007lcns9g8f3heu	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmn9k09l20001lcns7xwbirzb	::1	Réunion "DEMARRAGE PROJET" créée	2026-03-27 23:50:04.185
cmn9k16hy000hlcnseuqkp1wl	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmn9k09l20001lcns7xwbirzb	::1	Convocations réunion "DEMARRAGE PROJET" envoyées	2026-03-27 23:50:46.822
cmn9k4koy000vlcnsd5wyzxwx	cmmo3suxw0000p1np0eron6et	MEETING_FILE_DELETED	MeetingFile	cmn8uz2fp0007hgyfmw55g64y	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" supprimé	2026-03-27 23:53:25.186
cmnbtdrys00033448clgrie1m	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-29 13:48:03.412
cmnbu6ywf0003oclykihljsvv	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-29 14:10:45.423
cmnbu7d400005ocly5o99umd6	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1774793463816.png	2026-03-29 14:11:03.841
cmnbu7e7a0007oclyc9o97rc8	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-03-29 14:11:05.255
cmnbuhk5500031202dzshl6x3	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-29 14:18:59.513
cmnbuzrzw0003mvm0o2rsad44	cmmo3suxw0000p1np0eron6et	BACKUP_CREATED	Backup	cmnbuzppl0001mvm00foxazxv	::1	Sauvegarde backup_2026-03-29T14-33-06.sql	2026-03-29 14:33:09.5
cmndf45410003fatlkq5enttr	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-30 16:44:11.618
cmneavz1g0003f1ui9p8lhapt	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 07:33:38.212
cmneb8gei000gf1uiar77cazg	cmmo3suxw0000p1np0eron6et	MISSION_CREATED	Mission	cmneb8bqp0005f1uit2x84wvc	::1	Mission GESTION VENTE EN GROS créée	2026-03-31 07:43:20.586
cmneb9d6c000kf1uiwzzovneu	cmmo3suxw0000p1np0eron6et	MISSION_FILE_ADDED	MissionFile	cmneb9d64000if1ui9w91k99a	::1	Fichier "gp-64 (Site Web).png" ajouté (IMAGE)	2026-03-31 07:44:03.061
cmnebbjst000sf1ui62d70o5z	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 07:45:44.957
cmned01ch000dfum2q3jp7er7	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 08:32:47.057
cmned1vog000ffum27y531vny	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3svdj0001p1npkybbwako	::1	Mot de passe réinitialisé pour mansour.bocoum@example.com	2026-03-31 08:34:13.024
cmned3gq7000pfum2l7qrsvcx	cmmo3suxw0000p1np0eron6et	PLANNING_VALIDATED	Planning	cmn8v31oe000hhgyfi19o47vh	::1	Planning cmn8v31oe000hhgyfi19o47vh validé	2026-03-31 08:35:26.96
cmneel5jb000136ri5kd4dk8u	cmmo3suxw0000p1np0eron6et	MEETING_REOPENED	Meeting	cmn7gsvqw0009130kj9dnmxy2	::1	Réunion "TEST" rouverte (statut SENT)	2026-03-31 09:17:11.879
cmnehy5hp0003g59ny14y0nm9	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 10:51:17.197
cmnejws5g001h8c5u0ygci240	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 11:46:12.485
cmnem5abq000lo5vb1je54esg	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 12:48:48.518
cmnmanfc20003unitkndbsx5p	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-05 21:49:08.835
cmnmaobqw0007unitye5ni2sb	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-05 21:49:50.84
cmolhyz4p0005atqh7gs41iih	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-30 13:06:01.177
cmolj2vcy0002mrqrddkp0cz9	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1777556222511.png	2026-04-30 13:37:02.531
cmolj2wu40004mrqrjcd1xdki	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-04-30 13:37:04.444
cmolvnror000340r4xl73nf14	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-30 19:29:12.939
cmolvz7ke000w40r4v267kbuq	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-30 19:38:06.735
cmolxu5dq0006hjp6keackwqf	cmmo3suxw0000p1np0eron6et	CREATE_USER	User	cmolxu5bz0001hjp688nfthe4	::1	Utilisateur amina@yopmail.com créé (en attente d'activation)	2026-04-30 20:30:09.854
cmomtfg6z000310sk8sm6aple	cmomtfazz0000jmo56gafwtru	LOGIN	User	cmomtfazz0000jmo56gafwtru	::1	Connexion de demo@adm.sn	2026-05-01 11:14:31.739
cmomvnmcr0003aov9vtvtn9yc	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 12:16:52.203
cmomvrn1w0007aov9obeiv1i1	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 12:19:59.732
cmomw5zca000baov9ronzgqs0	cmmo3suxw0000p1np0eron6et	BACKUP_CREATED	Backup	cmomw5x7m0009aov9qobndxaz	::1	Sauvegarde backup_2026-05-01T12-31-06.sql	2026-05-01 12:31:08.842
cmomw8axg000daov9sae60a8f	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-05-01 12:32:57.173
cmomw8d44000faov9cfx6vtbp	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1777638779986.png	2026-05-01 12:33:00.005
cmomw8e4m000haov9li0uxcwl	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-05-01 12:33:01.318
cmomw9nfb000jaov9havco059	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmolxu5bz0001hjp688nfthe4	::1	Mot de passe réinitialisé pour amina@yopmail.com	2026-05-01 12:34:00.023
cmomwt8qb001xaov90l2tmrof	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 12:49:14.1
cmomwtyb8001zaov94vshiw03	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmot9cwj00008jo77uui1yor	::1	Mot de passe réinitialisé pour alhusseinkhouma0@gmail.com	2026-05-01 12:49:47.252
cmomwuj5e0021aov90mxe35mw	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3sxn00007p1npldvr5svn	::1	Mot de passe réinitialisé pour responsable5@example.com	2026-05-01 12:50:14.258
cmon19c8u0003itqpu4s2c578	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 14:53:43.614
cmon1g6xo0008itqpzbrr5p5q	cmmo3suxw0000p1np0eron6et	DATA_PURGED	System	global	::1	Purge globale exécutée après backup backup_2026-05-01T14-58-59.sql	2026-05-01 14:59:03.324
\.


--
-- Data for Name: Backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Backup" (id, "fileName", "relativePath", "sizeBytes", status, "errorMessage", kind, "startedAt", "finishedAt", "createdById") FROM stdin;
cmnbuzppl0001mvm00foxazxv	backup_2026-03-29T14-33-06.sql	backups\\backup_2026-03-29T14-33-06.sql	124045	SUCCESS	\N	MANUAL	2026-03-29 14:33:06.534	2026-03-29 14:33:07.368	cmmo3suxw0000p1np0eron6et
cmomw5x7m0009aov9qobndxaz	backup_2026-05-01T12-31-06.sql	backups\\backup_2026-05-01T12-31-06.sql	182061	SUCCESS	\N	MANUAL	2026-05-01 12:31:06.082	2026-05-01 12:31:06.786	cmmo3suxw0000p1np0eron6et
cmon1g48u0005itqprqzw7e56	backup_2026-05-01T14-58-59.sql	backups\\backup_2026-05-01T14-58-59.sql	189686	SUCCESS	\N	MANUAL	2026-05-01 14:58:59.838	2026-05-01 14:59:00.655	cmmo3suxw0000p1np0eron6et
cmon1k62a000citqpycnmh9xl	backup_2026-05-01T15-02-08.sql	backups\\backup_2026-05-01T15-02-08.sql	\N	PENDING	\N	MANUAL	2026-05-01 15:02:08.818	\N	cmmo3suxw0000p1np0eron6et
\.


--
-- Data for Name: DeviceToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DeviceToken" (id, "userId", token, platform, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DirectMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DirectMessage" (id, "senderId", "receiverId", body, "createdAt", "fileName", "fileUrl", "isRead", "mimeType", size, "parentId") FROM stdin;
\.


--
-- Data for Name: Direction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Direction" (id, name, code, description, "isActive", "createdAt", "updatedAt", "logoUrl") FROM stdin;
cmolix1b90000mrqrd6p1uqiy	Direction général	DIR	\N	t	2026-04-30 13:32:30.309	2026-04-30 13:32:30.309	/uploads/directions/direction_logo_1777555943824.png
cmn9jawvp000aw1vtj8tfmc3y	Université Démo	DP202510311551	test	t	2026-03-27 23:30:21.301	2026-04-30 19:31:49.008	/uploads/directions/direction_logo_1777577506940.png
cmolxghax0000rw4yt5k984kg	DIRECTION GENERALE	DG	Direction Générale de l'ADM	t	2026-04-30 20:19:32.121	2026-04-30 20:19:32.121	/adm_logo.png
cmolxghb10001rw4yyhq769pe	SECRETARIAT GENERAL	SG	Secrétariat Général	t	2026-04-30 20:19:32.126	2026-04-30 20:19:32.126	/adm_logo.png
cmolxghb40002rw4ykyqut86u	DIRECTION DEVELOPPEMENT, PARTENARIAT ET FINANCEMENT INNOVENTS	DDPFI	Direction Développement, Partenariat et Financement Innovants	t	2026-04-30 20:19:32.129	2026-04-30 20:19:32.129	/adm_logo.png
cmolxghb70003rw4yesfxxwhb	CELLULE SUIVI EVALUATION	CSE	Cellule Suivi-Évaluation	t	2026-04-30 20:19:32.131	2026-04-30 20:19:32.131	/adm_logo.png
cmolxghba0004rw4ycmz0edr9	CELLULE PASSATION DE MARCHES	CPM	Cellule Passation des Marchés	t	2026-04-30 20:19:32.134	2026-04-30 20:19:32.134	/adm_logo.png
cmolxghbc0005rw4yrkl5iljc	CELLULE COMMUNICATION	CCOM	Cellule Communication	t	2026-04-30 20:19:32.136	2026-04-30 20:19:32.136	/adm_logo.png
cmolxghbf0006rw4yer944plk	DIRECTION ADMINISTRATIVE & FINANCIERE	DAF	Direction Administrative et Financière	t	2026-04-30 20:19:32.139	2026-04-30 20:19:32.139	/adm_logo.png
cmolxghbh0007rw4yx7zf2yni	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	DRCIDC	Direction du Renforcement des Capacités Institutionnelles et du Développement des Compétences	t	2026-04-30 20:19:32.142	2026-04-30 20:19:32.142	/adm_logo.png
cmolxghbk0008rw4yrddm0efv	DIRECTION TECHNIQUE	DT	Direction Technique	t	2026-04-30 20:19:32.144	2026-04-30 20:19:32.144	/adm_logo.png
cmolxghbm0009rw4yvgj9oqff	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	CGES	Cellule Gestion Environnementale et Sociale	t	2026-04-30 20:19:32.146	2026-04-30 20:19:32.146	/adm_logo.png
\.


--
-- Data for Name: DirectionDiscussion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DirectionDiscussion" (id, "directionId", "createdAt", "updatedAt") FROM stdin;
cmnejiwiz0005g36gejdoihiw	cmn9jawvp000aw1vtj8tfmc3y	2026-03-31 11:35:24.971	2026-03-31 11:35:24.971
cmolxu5cx0003hjp6i2b5tv2b	cmolxghbk0008rw4yrddm0efv	2026-04-30 20:30:09.826	2026-04-30 20:30:09.826
\.


--
-- Data for Name: DirectionDiscussionMember; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DirectionDiscussionMember" (id, "discussionId", "userId", "joinedAt") FROM stdin;
cmnemop67001qo5vb049esku4	cmnejiwiz0005g36gejdoihiw	cmmo3suxw0000p1np0eron6et	2026-03-31 13:03:54.223
\.


--
-- Data for Name: DirectionMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DirectionMessage" (id, "directionId", "senderId", body, "createdAt", "fileName", "fileUrl", "mimeType", size, "parentId") FROM stdin;
\.


--
-- Data for Name: Invitation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invitation" (id, "meetingId", "userId", status, "sentAt", "respondedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Meeting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Meeting" (id, title, agenda, "organizerId", "roomId", "startTime", "endTime", status, "orderOfDay", attachments, "createdAt", "updatedAt", "meetingLink", "directionId", "projectId") FROM stdin;
\.


--
-- Data for Name: MeetingFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MeetingFile" (id, "meetingId", "uploadedById", kind, "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
\.


--
-- Data for Name: MeetingMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MeetingMessage" (id, "meetingId", "senderId", body, "createdAt", "parentId") FROM stdin;
\.


--
-- Data for Name: Mission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Mission" (id, title, description, location, "startTime", "endTime", "createdById", status, "createdAt", "updatedAt", "directionId", "projectId") FROM stdin;
\.


--
-- Data for Name: MissionAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MissionAssignment" (id, "missionId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: MissionFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MissionFile" (id, "missionId", "uploadedById", kind, "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "userId", type, title, body, link, "isRead", "createdAt") FROM stdin;
cmn7gyh2z001e130ko40gkt3y	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST TETSE"	/meetings	t	2026-03-26 12:49:09.372
cmn7lubjl000i46tud80coqqd	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST CONFLIT"	/meetings	t	2026-03-26 15:05:53.65
cmn9fvq3t000rue5fpg6yokf4	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de alhusseinkhouma0@gmail.com	alhusseinkhouma0@gmail.com (alhusseinkhouma0@gmail.com) a accepté votre réunion "TEST"	/meetings/cmn7gsvqw0009130kj9dnmxy2	t	2026-03-27 21:54:33.833
cmn9k281b000llcnsipknv7le	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de alhusseinkhouma0@gmail.com	alhusseinkhouma0@gmail.com (alhusseinkhouma0@gmail.com) a accepté votre réunion "DEMARRAGE PROJET"	/meetings/cmn9k09l20001lcns7xwbirzb	t	2026-03-27 23:51:35.471
cmneehcu7000vm1twdp467z2h	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de mansour.bocoum@example.com	mansour.bocoum@example.com (mansour.bocoum@example.com) a accepté votre réunion "DEMARRAGE PROJET"	/meetings/cmn9k09l20001lcns7xwbirzb	t	2026-03-31 09:14:14.72
cmnee3rk2000tm1twwvxttja8	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de mansour.bocoum@example.com	mansour.bocoum@example.com (mansour.bocoum@example.com) a accepté votre réunion "TEST"	/meetings/cmn7gsvqw0009130kj9dnmxy2	t	2026-03-31 09:03:40.61
\.


--
-- Data for Name: PasswordHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordHistory" (id, "userId", "passwordHash", "createdAt") FROM stdin;
cmolhyqke0001atqhuza0qgs6	cmmo3suxw0000p1np0eron6et	$2b$12$mnkE8URK7d8/vf0uY6r/6eQW9KJcW68LWukSZrEFq2U5B3Q6V0iAy	2026-04-30 13:05:50.079
\.


--
-- Data for Name: Planning; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Planning" (id, "userId", "weekStart", "submittedAt", "consolidatedAt", "validatedAt", "returnedAt", status, "returnComment", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PlanningEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanningEvent" (id, "planningId", title, type, "startTime", "endTime", "roomId", destination, description, "createdAt", "directionId", "projectId") FROM stdin;
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, name, code, description, "isActive", "createdAt", "updatedAt", "createdById", status) FROM stdin;
\.


--
-- Data for Name: ProjectFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProjectFile" (id, "projectId", "uploadedById", "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RefreshToken" (id, "userId", token, "expiresAt", "isRevoked", "createdAt") FROM stdin;
cmmo3z3ng000725fv2x12mz5p	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTg2ODYsImV4cCI6MTc3Mzk2MzQ4Nn0.3lxbgRJAXgzgTzuc0VgEP9KHi7KE_PZ4kVvBau55rKE	2026-03-19 23:38:06.261	t	2026-03-12 23:38:06.268
cmmo4ctvv0001htg30r0xfts1	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTkzMjYsImV4cCI6MTc3Mzk2NDEyNn0.PCYw4Mde_R315yMKpLb5fcS2L5DqwiE6AiivNJpVam8	2026-03-19 23:48:46.794	t	2026-03-12 23:48:46.796
cmmo4ptse0001lvr2dm86yiul	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTk5MzMsImV4cCI6MTc3Mzk2NDczM30.MpXRy8PZBBzbIaJTIrGhNGKEiMid3ytUalxFTxvWGCU	2026-03-19 23:58:53.187	t	2026-03-12 23:58:53.199
cmn9fp6b9000fue5f6mdklw6w	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2NDgxNjgsImV4cCI6MTc3NTI1Mjk2OH0.OjnRMG6OkxPd5dTxeswhoBGhNvStXtFd9X-l_bnYAzA	2026-04-03 21:49:28.242	t	2026-03-27 21:49:28.245
cmmom81yj0001ruospfdyvzj4	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzODkzMzcsImV4cCI6MTc3Mzk5NDEzN30.KnL_st6m6DoH-mQr8cW6EYFOskKaW-LQoNhuX42I8Wg	2026-03-20 08:08:57.035	t	2026-03-13 08:08:57.037
cmmom92km0005ruosau3otwv5	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzODkzODQsImV4cCI6MTc3Mzk5NDE4NH0.zXubzxxrc5AlssfED8onHxjFCop_hS0-551-kPk5cG4	2026-03-20 08:09:44.516	t	2026-03-13 08:09:44.518
cmmonkj6b0001r25v83lvfk1s	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzOTE1OTgsImV4cCI6MTc3Mzk5NjM5OH0.JLWozMNpd_x-rbK3HKlwHTCe9sTHVY3Y8_XUgZZIpkg	2026-03-20 08:46:38.866	t	2026-03-13 08:46:38.867
cmmoo9c1n0009wlvxy5hxr965	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzOTI3NTYsImV4cCI6MTc3Mzk5NzU1Nn0.lbbah0G5g3JPooOAeB_4_Yc0lFdW22LWR4zsOjCxsj4	2026-03-20 09:05:56.027	t	2026-03-13 09:05:56.028
cmmqmfhon0001hgk8jifwv1c3	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MTA2MTYsImV4cCI6MTc3NDExNTQxNn0.KQWSD1ktQ7BDiemLzRlHoKCup-fotmJjhfulzzEbRQE	2026-03-21 17:50:16.389	t	2026-03-14 17:50:16.391
cmmovl6nv00019wszyhf1cyay	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM0MDUwNjYsImV4cCI6MTc3NDAwOTg2Nn0.uSQSBi597K2VtAg8q1koU5PQZrKZqg6uaOFW0q7F3YA	2026-03-20 12:31:06.164	t	2026-03-13 12:31:06.165
cmmozx8620001xnvof01gh011	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM0MTIzNDYsImV4cCI6MTc3NDAxNzE0Nn0.79eDV0k77J6xPGaUMWPkw1tLA4abDS1FR7IpiQ7uca4	2026-03-20 14:32:26.489	t	2026-03-13 14:32:26.49
cmmozzqzx0005xnvorljbwb61	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM0MTI0NjQsImV4cCI6MTc3NDAxNzI2NH0.S8HpzbOZyGjOKn_vLYDX29EK2EXuemWW6widbjoknLE	2026-03-20 14:34:24.235	t	2026-03-13 14:34:24.237
cmmqsadcr0001swm28elrm7dv	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MjA0NTUsImV4cCI6MTc3NDEyNTI1NX0.WTQUee-Gpbbzf0HxlBxHoMi3vM_lC2dWHI38uK6Mp_g	2026-03-21 20:34:15.195	t	2026-03-14 20:34:15.196
cmmqj4irm0001g3pe8ie46vx4	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MDUwNjUsImV4cCI6MTc3NDEwOTg2NX0.1Wqj315dKE86DzrGMUMNNKWsPdGdNqR4CSc2qt2y26s	2026-03-21 16:17:45.694	t	2026-03-14 16:17:45.699
cmmqjq0ib0001btgmwtxi2hx0	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MDYwNjgsImV4cCI6MTc3NDExMDg2OH0.Ehk1gx7VzO-3Pr88eHiCJI_EOrZn3hdxUf5T3DN7PJw	2026-03-21 16:34:28.498	t	2026-03-14 16:34:28.5
cmmqlmlop0001snjkhfa1wa4l	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MDkyNjgsImV4cCI6MTc3NDExNDA2OH0.V5m4vjoskErC46aiR9kAZJptpgHmLutU1ZcJOiMdWlo	2026-03-21 17:27:48.552	t	2026-03-14 17:27:48.553
cmmt8sjfl00016z3z2mxxnzvc	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2NjkxMDksImV4cCI6MTc3NDI3MzkwOX0.GwX6Fu_oelcqMWZyVdT41zgqjcdDZgDnXLbcwdzwqB4	2026-03-23 13:51:49.086	t	2026-03-16 13:51:49.087
cmmtmnz0i0001iqtmyggr03xq	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTI0MTAsImV4cCI6MTc3NDI5NzIxMH0.6oYMR1-ePaLfNQT17cXduX3OU2wtzMzY-kq2SqhSnlo	2026-03-23 20:20:10.595	t	2026-03-16 20:20:10.597
cmmtniaib000ds3fmp35s6fww	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTM4MjUsImV4cCI6MTc3NDI5ODYyNX0.Wjebc_1EstncMgdAVw__zxf-D3xSIBgwGUhm6ZZPqAI	2026-03-23 20:43:45.198	t	2026-03-16 20:43:45.204
cmmtoblww000hs3fmor2ieozu	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTUxOTMsImV4cCI6MTc3NDI5OTk5M30.BYdFYY6dMkkBrF9sKahrZSDAY1jU_t2_Zrf0_YW3o08	2026-03-23 21:06:33.006	t	2026-03-16 21:06:33.008
cmmtqi3kk000xs3fm9hpn2wxd	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTg4NTUsImV4cCI6MTc3NDMwMzY1NX0.u46aBLYVR0OHfy_3XPv-jtfhawiq33wbwYiBYtLnDZo	2026-03-23 22:07:35.056	t	2026-03-16 22:07:35.06
cmmw3rzl00001ez945v2u4ezv	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDIwODMsImV4cCI6MTc3NDQ0Njg4M30.P5gXXuFXMbhSvMFTHgrFdwLtrnrPO4HYWz7wdLQTvvU	2026-03-25 13:54:43.807	t	2026-03-18 13:54:43.808
cmmw3wxut0005ez94yvxy7sxg	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDIzMTQsImV4cCI6MTc3NDQ0NzExNH0.IonLFQ8Wb6qlJug0XYYMJKkTy5a36kuZdsDH-oOkkMw	2026-03-25 13:58:34.852	t	2026-03-18 13:58:34.853
cmmw42z97000yez94tqxx0adm	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDI1OTYsImV4cCI6MTc3NDQ0NzM5Nn0.jWM8och1y0fFIzPUjD2lVMozYMybX5E5qmoyB7loKYk	2026-03-25 14:03:16.602	t	2026-03-18 14:03:16.603
cmmw44mdr001hez94biadt46f	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDI2NzMsImV4cCI6MTc3NDQ0NzQ3M30.dszSAjQgk-0melqrCvDt6mABtQkUt2tAoKkO0vegR_A	2026-03-25 14:04:33.229	t	2026-03-18 14:04:33.231
cmn7fruth0001ng5oh1pm36gd	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MjczNjAsImV4cCI6MTc3NTEzMjE2MH0.J8Eq5fY0mrYXLiy-8laxqwgfLhoc0Mcgz5AqwOB0mn8	2026-04-02 12:16:00.928	t	2026-03-26 12:16:00.929
cmn7gk5ho0001130ktsfafb55	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1Mjg2ODEsImV4cCI6MTc3NTEzMzQ4MX0.0b-W2A5oWDGRDkuFuLh8X3vjyi6WNUQu3-8lF5AXY3Q	2026-04-02 12:38:01.16	t	2026-03-26 12:38:01.164
cmn7hns0h001w130k9siro8gn	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MzA1MjksImV4cCI6MTc3NTEzNTMyOX0.UDpOLgsVsAQmot1dMgRi3LiIRgCxPFf-wSggE3vZ-Qg	2026-04-02 13:08:49.937	t	2026-03-26 13:08:49.938
cmn7l0gfk00011p3ohbjuw7xk	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MzYxNjAsImV4cCI6MTc3NTE0MDk2MH0.mCoo4gFRO-g53MVnXXOXJhJBIPOmsOnIPHFWXSKXUQI	2026-04-02 14:42:40.295	t	2026-03-26 14:42:40.297
cmnmaobqn0005unit8y8zl8db	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzU0MjU3OTAsImV4cCI6MTc3NjAzMDU5MH0.0ElI5QxE8GF3IvB9V8t-1Uk-mj0pSOOovHkuFlVLXsE	2026-04-12 21:49:50.83	t	2026-04-05 21:49:50.831
cmn7grmcg0005130kseqmc7qb	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MjkwMjksImV4cCI6MTc3NTEzMzgyOX0.ZbJmM_JHsW1qOZRpbOC_U0-OvTsybHu032akrRz3EIs	2026-04-02 12:43:49.598	t	2026-03-26 12:43:49.6
cmn7l4rh4000f1p3oqnbcrezo	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MzYzNjEsImV4cCI6MTc3NTE0MTE2MX0.OZkitDZvSGqfvsu5SIFIKZuHTWVN44nK4IKVEuVR2Kk	2026-04-02 14:46:01.239	t	2026-03-26 14:46:01.24
cmn8tovnj0001hgyf8la7hlr7	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2MTEyMDIsImV4cCI6MTc3NTIxNjAwMn0.l2LcT7Gtj_GzAdgQhW7qh_MIJqb-1ZPGy52wf3G-NSc	2026-04-03 11:33:22.812	t	2026-03-27 11:33:22.813
cmn90jc8c00012lja7xxxaf4l	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2MjI3MDEsImV4cCI6MTc3NTIyNzUwMX0.cPQY_U_QXVUUwg8d-dwswKc5kTI99WHJz3izt89XFd8	2026-04-03 14:45:01.735	t	2026-03-27 14:45:01.737
cmn9h1w1b0001roushozzf7lq	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2NTA0NDEsImV4cCI6MTc3NTI1NTI0MX0.HxtsZtUcBuzuiEOkVQxfJiuQ_XDMCz9HFkOfm6oOMX8	2026-04-03 22:27:21.069	t	2026-03-27 22:27:21.072
cmnbtdrxk00013448ki3xma8x	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ3OTIwODMsImV4cCI6MTc3NTM5Njg4M30.ZdB2OVSL5gi2mG_dGBjk-YvBtdOugukA771VOKGnris	2026-04-05 13:48:03.36	t	2026-03-29 13:48:03.362
cmnbu6yw60001oclyy8z5bmze	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ3OTM0NDUsImV4cCI6MTc3NTM5ODI0NX0.T6hJOTSZ9PBLp9Xt2YFU4yDfEjxPTQMAPUDoSi13Nto	2026-04-05 14:10:45.413	t	2026-03-29 14:10:45.414
cmnbuhk4800011202hnr6mqyq	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ3OTM5MzksImV4cCI6MTc3NTM5ODczOX0.9kBlBoG5ygsf1S93ipXch4yOam9WXmqJLGtDzOnU7Gg	2026-04-05 14:18:59.48	t	2026-03-29 14:18:59.48
cmndf452z0001fatl1i1q3yix	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ4ODkwNTEsImV4cCI6MTc3NTQ5Mzg1MX0.ba1FY7CwzA6txcDIA_wMDuEmCAxVHyXNvmkxX8q0eXA	2026-04-06 16:44:11.575	t	2026-03-30 16:44:11.578
cmneavz0s0001f1uilruhb5h1	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ5NDI0MTgsImV4cCI6MTc3NTU0NzIxOH0.iW_iJ6G1IqYAG7gIxmygpT5cKWY-m05johp1lWY54Yk	2026-04-07 07:33:38.183	t	2026-03-31 07:33:38.186
cmnebbjsl000qf1uiczmutsed	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ5NDMxNDQsImV4cCI6MTc3NTU0Nzk0NH0.6srg3OYJqKBYhO0eYBjJCVrPdDd-j1MERGf7umyu2Ow	2026-04-07 07:45:44.949	t	2026-03-31 07:45:44.95
cmned01cb000bfum25b7z25oe	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ5NDU5NjcsImV4cCI6MTc3NTU1MDc2N30.BaDcpsk0VVpsVVArg6XOUXkyU30MeclHzQhlLPOXXPU	2026-04-07 08:32:47.05	t	2026-03-31 08:32:47.051
cmnehy5gi0001g59nim5h3npu	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ5NTQyNzcsImV4cCI6MTc3NTU1OTA3N30.T7alte_Ip5DxvgQyaojEmaNZH05U2wHeWwWj2CzJpr0	2026-04-07 10:51:17.121	t	2026-03-31 10:51:17.122
cmnejws5b001f8c5uoqlsimxu	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ5NTc1NzIsImV4cCI6MTc3NTU2MjM3Mn0.FrgojEvcZCWwsAZKdhTE5nPl93I-kzrrOVqn2BmwP58	2026-04-07 11:46:12.477	t	2026-03-31 11:46:12.479
cmnem5abh000jo5vbu5yau7a8	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ5NjEzMjgsImV4cCI6MTc3NTU2NjEyOH0.WouXqHEH10dgBA0oRgb7klI8VI1Z1fJ9Mm6NOkCt4oQ	2026-04-07 12:48:48.509	t	2026-03-31 12:48:48.51
cmnmanfbg0001unitugg8vmlb	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzU0MjU3NDgsImV4cCI6MTc3NjAzMDU0OH0.Kxqf1la-zJeKm-6DbRDpu9ZV02zeMztzrOy49nZZr8o	2026-04-12 21:49:08.807	t	2026-04-05 21:49:08.809
cmolhyz3v0003atqhsmtfazo9	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc1NTQzNjEsImV4cCI6MTc3ODE1OTE2MX0.7Y-_4qatgyEe9xOpAVui0eoeplHLypnT-gyowITSiuc	2026-05-07 13:06:01.146	t	2026-04-30 13:06:01.147
cmolvnrnv000140r4so1qzcdv	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc1NzczNTIsImV4cCI6MTc3ODE4MjE1Mn0.TChYPFMyJHpra8jvB6rHu2Nk4EugwW8EB_QGe4ADjw4	2026-05-07 19:29:12.903	f	2026-04-30 19:29:12.904
cmolvz7ju000u40r4eu014o7w	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc1Nzc4ODYsImV4cCI6MTc3ODE4MjY4Nn0.h-FyDK-dMtm4fzNMpobNUzoSwCQdm2vRCwusobl02Ic	2026-05-07 19:38:06.713	f	2026-04-30 19:38:06.715
cmomtfg69000110skadc9n8wm	cmomtfazz0000jmo56gafwtru	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtb210ZmF6ejAwMDBqbW81NmdhZnd0cnUiLCJpYXQiOjE3Nzc2MzQwNzEsImV4cCI6MTc3ODIzODg3MX0.ZY2l7DQh9ZnuQq1ZgrVMfbADhmqOf2RQ2ERU85bUZfE	2026-05-08 11:14:31.709	f	2026-05-01 11:14:31.711
cmomvnmbu0001aov9dligwpxe	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc2Mzc4MTIsImV4cCI6MTc3ODI0MjYxMn0.VuBB6GNfyk22xKY2dykDR77Cws1lz0_hweCMC3AbsjA	2026-05-08 12:16:52.165	t	2026-05-01 12:16:52.166
cmomvrn1r0005aov9m50nwylk	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc2Mzc5OTksImV4cCI6MTc3ODI0Mjc5OX0.N5EJii5AnPTF0EBNZHJ_9qqtV_oY6wMVTVMaNCo4L7g	2026-05-08 12:19:59.726	t	2026-05-01 12:19:59.727
cmomwt8pg001vaov9ro63eavv	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc2Mzk3NTQsImV4cCI6MTc3ODI0NDU1NH0.WU4Z-xCHvfiS8UlcFtndzS6dktQNAQ9NrnJZwh_MAk8	2026-05-08 12:49:14.067	t	2026-05-01 12:49:14.068
cmon19c7d0001itqp6m2gpjag	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc2NDcyMjMsImV4cCI6MTc3ODI1MjAyM30.giG0iAgV9E4EtebwaHJsrVOJLPBKtGoO_4VlXMn0LTM	2026-05-08 14:53:43.56	f	2026-05-01 14:53:43.561
\.


--
-- Data for Name: RepertoireContact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RepertoireContact" (id, numero, "prenomNom", fonction, "directionLabel", poste, directe, portable, ordre, "createdAt", "updatedAt") FROM stdin;
cmolxghbr000arw4ysvojc0lt	1	Mamouth DIOP	Directeur Général	DIRECTION GENERALE	131	\N	77 499 95 51	1	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000brw4yql7ufeqb	2	Mame Diarra B DIOP	Secrétaire de Direction	DIRECTION GENERALE	142	33 849 17 43	77 802 69 61	2	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000crw4y302a7uke	3	Papa Sambaré NDIAYE	Secrétaire Général	SECRETARIAT GENERAL	104	\N	77 333 87 33	3	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000drw4yabuifufp	4	SP SG	Secrétaire de Direction	SECRETARIAT GENERAL	105	\N	\N	4	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000erw4ywxjjaol9	5	Ndeye Ngoné SY	DDPFI	DIRECTION DEVELOPPEMENT, PARTENARIAT ET FINANCEMENT INNOVENTS	149	33 849 17 41	77 529 33 34	5	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000frw4y6dm0wcqc	6	Mansour BOCOUM	Responsable Cellule Suivi-Evaluation / Coordonnateur PACASEN	CELLULE SUIVI EVALUATION	116	\N	77 450 44 71	6	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000grw4ymxo07cxs	7	Mamadou Daha Kane	Spécialiste en Suivi-Evaluation SERPP / PROGEP 2	CELLULE SUIVI EVALUATION	144	\N	78 183 25 51	7	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000hrw4yzwscf4w1	8	Yakhya CISSE	Expert en Suivi-Evaluation PACASEN	CELLULE SUIVI EVALUATION	121	\N	78 183 25 67	8	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000irw4y5faj4pbc	9	Moussa FALL	SPM / Resp. Cellule Passation des Marchés	CELLULE PASSATION DE MARCHES	120	33 849 27 15	77 742 39 73	9	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000jrw4ywuxcv099	10	Ousmane Jean Baptiste DIOP	Spécialiste en Passation des Marchés SERRP / PROGEP 2	CELLULE PASSATION DE MARCHES	119	\N	77 740 78 52	10	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000krw4ywx2mdy0n	11	Cheikh Sidate DIOP	Assistant en Passation des Marchés	CELLULE PASSATION DE MARCHES	161	\N	78 639 02 01	11	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000lrw4ybp2rie11	12	El Hadji Alassane DIALLO	Chargé de la Communication / Responsable Cellule COM	CELLULE COMMUNICATION	114	33 849 17 68	78 638 29 19	12	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000mrw4ymgucl6hx	13	Amy Collé SENE	Chargée du Multimédia	CELLULE COMMUNICATION	138	\N	78 620 00 92	13	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000nrw4ymvyrn26p	14	Ousseynou TOURE	Conseiller Technique	CELLULE COMMUNICATION	\N	\N	77 545 46 06	14	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000orw4y3ug0h9a4	15	Idrissa CAMARA	Directeur Adm. & Financier	DIRECTION ADMINISTRATIVE & FINANCIERE	135	33 849 27 11	77 450 44 72	15	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000prw4y5ttudiiq	16	Kadia GADIAGA	Assistante de Programme / SP DAF	DIRECTION ADMINISTRATIVE & FINANCIERE	140	33 849 17 45	78 162 17 02	16	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000qrw4ywlems2dw	17	Amadou Gallo SARR	Chargé de Projets Financiers	DIRECTION ADMINISTRATIVE & FINANCIERE	150	33 849 17 46	77 529 33 35	17	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000rrw4y9ktalwoj	18	Ndèye Aïssatou FAYE	Assistante Administrative	DIRECTION ADMINISTRATIVE & FINANCIERE	151	33 849 17 69	77 333 95 40	18	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000srw4y528iqswx	19	Mame Toga NGOM	Responsable RH	DIRECTION ADMINISTRATIVE & FINANCIERE	145	\N	77 740 83 90	19	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000trw4yo5g2jioh	20	Oumou M FALL	Assistante Administrative	DIRECTION ADMINISTRATIVE & FINANCIERE	139	\N	78 462 17 84	20	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000urw4yz2t8b9fi	21	Cheikh Saadbou SEYE	Comptable PROGEP / SERRP	DIRECTION ADMINISTRATIVE & FINANCIERE	129	\N	77 272 72 10	21	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000vrw4ybn4pdjzm	22	Diégui BA	Assistant Administrative	DIRECTION ADMINISTRATIVE & FINANCIERE	141	\N	78 180 94 98	22	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbr000wrw4y2ti2zuu2	23	Insa DIOP	Chef Comptable	DIRECTION ADMINISTRATIVE & FINANCIERE	132	\N	77 277 23 24	23	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs000xrw4y6fvaci0s	24	Aminata SOW	Comptable	DIRECTION ADMINISTRATIVE & FINANCIERE	128	\N	77 403 81 21	24	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs000yrw4yf9azqzy1	25	Bintou NDAO	Assistante Comptable	DIRECTION ADMINISTRATIVE & FINANCIERE	167	\N	78 140 95 09	25	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs000zrw4yhbc9jy2c	26	Saliou SENE	Réceptionniste	DIRECTION ADMINISTRATIVE & FINANCIERE	160	\N	77 529 33 41	26	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0010rw4ydmv6vw6f	27	Moustapha SAKHO	Chauffeur DG	DIRECTION ADMINISTRATIVE & FINANCIERE	160	\N	77 802 72 64	27	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0011rw4y33b4psp5	28	Oumar NIANG	Chauffeur	DIRECTION ADMINISTRATIVE & FINANCIERE	160	\N	78 638 02 04	28	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0012rw4y75k5ngj3	29	Chérif SALL	Chauffeur	DIRECTION ADMINISTRATIVE & FINANCIERE	160	\N	78 639 07 92	29	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0013rw4y8ewzp5xh	30	Abdoulaye LO	Chauffeur	DIRECTION ADMINISTRATIVE & FINANCIERE	160	\N	78 459 78 50	30	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0014rw4y7utgqjgi	31	Abdoulaye MANGASSA	Chauffeur	DIRECTION ADMINISTRATIVE & FINANCIERE	160	\N	78 183 26 47	31	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0015rw4ywv3mj3le	32	Marème Ndiaye	Responsable Informatique	DIRECTION ADMINISTRATIVE & FINANCIERE	143	33 849 17 46	78 180 94 01	32	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0016rw4y7iusmv8s	33	El Hadji Amadou Lamine DIENE	Assistant Informatique	DIRECTION ADMINISTRATIVE & FINANCIERE	143	33 849 17 46	77 356 02 50	33	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0017rw4y4elfjllk	34	Pierre Bernard Albert COLY	DRCIDC	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	148	33 849 27 14	77 529 33 19	34	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0018rw4y10167k35	35	Bintou DIENG	Secrétaire de Direction	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	146	33 849 17 43	78 016 14 20	35	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0019rw4yimcn48aa	36	Mamadou NDIAYE	Chargé de Projets Financiers Senior / Coordonnateur CdM Ass	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	158	33 849 17 86	77 529 33 26	36	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001arw4yqmyb6yrw	37	Diatta DIAGNE	Chargé de Projets Financiers	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	137	\N	78 638 10 64	37	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001brw4y2bzo56i8	38	Alboury GUEYE	Assistant de Programme	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	154	\N	78 639 02 03	38	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001crw4ydevpzcmo	39	Papa Mamadou CISSE	Assistant Technique / Facilitateur Sociale SERRP et PROGEP 2	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	153	33 849 27 16	78 711 91 69	39	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001drw4yxh4ro0up	40	Samba SENE	Assistante de Programme	DIRECTION DU RENFORCEMENT DES CAPACITES INSTITUTIONNELLES ET DU DEVELOPPEMENT DES COMPETENCES	141	\N	78 162 16 29	40	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001erw4ybolimbeu	41	Lamine DOUMBOUYA	Expert Hydraulicien / Coordonnateur SERRP	DIRECTION TECHNIQUE	123	33 849 27 13	77 333 97 14	41	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001frw4yi69n2ef2	42	Adji Awa Ly BA	Secrétaire de Direction	DIRECTION TECHNIQUE	133	33 849 17 44	78 183 25 65	42	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001grw4youhaailn	43	Mamadou TALL	Directeur Technique / Coordonnateur PROGEP2	DIRECTION TECHNIQUE	155	33 849 17 70	77 740 95 33	43	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001hrw4yzv2lk9ug	44	Papa Aldiouma CISSE	Chargé de Projets Techniques Senior / Coordonnateur ADEM 2	DIRECTION TECHNIQUE	147	\N	77 740 95 34	44	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001irw4ywpxtq36z	45	Serigne Mbacké NDOYE	Chargé de Projets Techniques Senior	DIRECTION TECHNIQUE	162	\N	78 638 10 62	45	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001jrw4yzinqrjuj	46	Amadou Diouldé DIALLO	Expert Urbain SERRP / PROGEP 2	DIRECTION TECHNIQUE	103	\N	78 183 25 64	46	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001krw4yp1sm12cg	47	Khady Manel FALL	Assistante de Programme SERRP PROGEP 2	DIRECTION TECHNIQUE	157	33 849 17 85	77 740 82 97	47	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001lrw4y8wc2jesn	48	Papa Alassane SARR	Chargé de Projets Techniques	DIRECTION TECHNIQUE	110	\N	77 328 41 96	48	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001mrw4ygp9phai1	49	Awa NDIAYE	Responsable Cellule GES	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	152	\N	78 183 25 84	49	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001nrw4yor2wlbcq	50	Marie Solange NDIONE	Expert Social SERRP	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	154	\N	77 555 51 79	50	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001orw4y5t7lzccq	51	Marie DIOH	Expert en Intermédiation Sociale SERRP / PROGEP 2	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	SL	CGES	78 183 25 65	51	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001prw4y90tnczma	52	Insa FALL	Expert en Sauvegarde Environnementale SERRP	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	SL	CGES	77 543 63 27	52	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001qrw4yxp3dqyqg	53	Ousmane NDIAYE	Expert Social SERRP	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	SL	\N	78 473 68 09	53	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001rrw4yomp55i9u	54	Mandaw GUEYE	Assistant à la coordination locale SERRP	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	SL	\N	77 248 12 45	54	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001srw4ykfcei5hm	55	Alphousseyni SANE	Ingénieur Génie Civil SERRP	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	SL	\N	77 556 86 79	55	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001trw4yrjzh7na0	56	Ndiaté KANE	Assistante de Programme	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	159	\N	78 183 25 56	56	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001urw4yxr74711l	57	Abdoul ANNE	Expert en Gouvernance Inst. et Financière PACASEN	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	\N	\N	77 414 68 68	57	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001vrw4ytx3eigsn	58	Mouhamed SOW	Expert Urbain PACASEN	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	\N	\N	77 659 48 48	58	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001wrw4ypzwv4p0z	59	Ndeye SAGNE	Expert Social PACASEN	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	117	\N	77 203 39 81	59	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001xrw4yi3abr2ly	60	Moustapha Samb DIAYELA	Expert Social PROGEP2	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	102	\N	77 114 26 12	60	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001yrw4y1liih0ww	61	Saliou KAMARA	Expert HSE PROGEP 2	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	\N	\N	77 109 74 20	61	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs001zrw4yz7cdvkt0	62	Ndèye Aida BOYE	Ingénieur Génie Civil PROGEP 2	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	\N	\N	77 108 99 51	62	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0020rw4yj2owtgcw	63	Ndèye Diariètou MBAYE	Expert SIG / Base de données PROGEP 2	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	\N	\N	77 109 01 55	63	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
cmolxghbs0021rw4y1mbrhvw7	64	Aly TOUNKARA	Expert Hydraulicien de Conception PROGEP 2	CELLULE GESTION ENVIRONNEMENTALE & SOCIALE	KM	\N	78 109 73 28	64	2026-04-30 20:19:32.151	2026-04-30 20:19:32.151
\.


--
-- Data for Name: Room; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Room" (id, name, capacity, location, equipment, "openFrom", "openTo", status, "createdAt", "updatedAt") FROM stdin;
cmon1i1u60009itqpsjts5dyl	SALLE A 1	10	étage	["wifi","télé","prise courant"]	08:00	19:00	ACTIVE	2026-05-01 15:00:30.03	2026-05-01 15:00:30.03
cmon1iz19000aitqpcvtj9re7	Salle B 1	20	Bâtiment	["télé","wifi","eau"]	08:00	20:00	ACTIVE	2026-05-01 15:01:13.053	2026-05-01 15:01:13.053
\.


--
-- Data for Name: RoomBooking; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RoomBooking" (id, "roomId", "meetingId", "userId", date, "startTime", "endTime", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt", "avatarUrl", "isDeleted", "twoFactorEnabled", "twoFactorSecret", "directionId") FROM stdin;
cmmo3suxw0000p1np0eron6et	Admin User	admin@example.com	$2b$12$mnkE8URK7d8/vf0uY6r/6eQW9KJcW68LWukSZrEFq2U5B3Q6V0iAy	SUPER_ADMIN	t	2026-03-12 23:33:15.042	2026-04-30 13:05:50.085	/uploads/avatars/cmmo3suxw0000p1np0eron6et.webp	f	f	OZVXOODBGJIDY2CTJYYTGQS5KE4EA3L3	cmn9jawvp000aw1vtj8tfmc3y
cmomtfazz0000jmo56gafwtru	Demo Admin	demo@adm.sn	$2b$10$tZP5mmy/iA3Kz7XEqm45/ed5H0QY5pMZzI..jgAKroYSkn3BBih/6	ADMIN	t	2026-05-01 11:14:24.979	2026-05-01 11:14:24.979	\N	f	f	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
f887b840-5894-486a-8f75-2f20fc7a7f93	8f9369edf32b65abd102f351a3b76203c03f5f005cdf07063d5b1a5687d4aa32	2026-03-12 23:33:05.202212+00	20260312233304_init_postgres	\N	\N	2026-03-12 23:33:04.984557+00	1
4f4b7469-6069-43c3-b8af-9293d92fdf9f	122cfd98a90416f45c83ba81862222d3bdfe67032995440e8c414b271868f226	2026-03-13 12:35:11.448777+00	20260313123511_add_user_avatar_url	\N	\N	2026-03-13 12:35:11.422154+00	1
af4f4e00-7401-45db-812f-e1c72f22cc99	291818ba72e2ef2b602f6225c6addbcec80776030ff2658b7f5842fc18b4d358	2026-03-14 16:11:17.502046+00	20260314161117_add_missions	\N	\N	2026-03-14 16:11:17.314211+00	1
05194dca-b2d9-4619-9f49-e383e1c6b1cd	ce8c9891b3106bc00cfa0f48693ecb38c50fa708b75fa11595c54aad70769b41	\N	20260312091500_add_direction_project_models	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260312091500_add_direction_project_models\n\nDatabase error code: 42P07\n\nDatabase error:\nERREUR: la relation « Direction » existe déjà\n\nDbError { severity: "ERREUR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "la relation « Direction » existe déjà", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1162), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260312091500_add_direction_project_models"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260312091500_add_direction_project_models"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	\N	2026-03-27 20:08:09.559215+00	0
\.


--
-- Name: AppSetting AppSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppSetting"
    ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY (key);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Backup Backup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Backup"
    ADD CONSTRAINT "Backup_pkey" PRIMARY KEY (id);


--
-- Name: DeviceToken DeviceToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceToken"
    ADD CONSTRAINT "DeviceToken_pkey" PRIMARY KEY (id);


--
-- Name: DirectMessage DirectMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectMessage"
    ADD CONSTRAINT "DirectMessage_pkey" PRIMARY KEY (id);


--
-- Name: DirectionDiscussionMember DirectionDiscussionMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionDiscussionMember"
    ADD CONSTRAINT "DirectionDiscussionMember_pkey" PRIMARY KEY (id);


--
-- Name: DirectionDiscussion DirectionDiscussion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionDiscussion"
    ADD CONSTRAINT "DirectionDiscussion_pkey" PRIMARY KEY (id);


--
-- Name: DirectionMessage DirectionMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionMessage"
    ADD CONSTRAINT "DirectionMessage_pkey" PRIMARY KEY (id);


--
-- Name: Direction Direction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Direction"
    ADD CONSTRAINT "Direction_pkey" PRIMARY KEY (id);


--
-- Name: Invitation Invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invitation"
    ADD CONSTRAINT "Invitation_pkey" PRIMARY KEY (id);


--
-- Name: MeetingFile MeetingFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MeetingFile"
    ADD CONSTRAINT "MeetingFile_pkey" PRIMARY KEY (id);


--
-- Name: MeetingMessage MeetingMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MeetingMessage"
    ADD CONSTRAINT "MeetingMessage_pkey" PRIMARY KEY (id);


--
-- Name: Meeting Meeting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Meeting"
    ADD CONSTRAINT "Meeting_pkey" PRIMARY KEY (id);


--
-- Name: MissionAssignment MissionAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MissionAssignment"
    ADD CONSTRAINT "MissionAssignment_pkey" PRIMARY KEY (id);


--
-- Name: MissionFile MissionFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MissionFile"
    ADD CONSTRAINT "MissionFile_pkey" PRIMARY KEY (id);


--
-- Name: Mission Mission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PasswordHistory PasswordHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordHistory"
    ADD CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY (id);


--
-- Name: PlanningEvent PlanningEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanningEvent"
    ADD CONSTRAINT "PlanningEvent_pkey" PRIMARY KEY (id);


--
-- Name: Planning Planning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Planning"
    ADD CONSTRAINT "Planning_pkey" PRIMARY KEY (id);


--
-- Name: ProjectFile ProjectFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectFile"
    ADD CONSTRAINT "ProjectFile_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: RepertoireContact RepertoireContact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RepertoireContact"
    ADD CONSTRAINT "RepertoireContact_pkey" PRIMARY KEY (id);


--
-- Name: RoomBooking RoomBooking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoomBooking"
    ADD CONSTRAINT "RoomBooking_pkey" PRIMARY KEY (id);


--
-- Name: Room Room_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Backup_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Backup_startedAt_idx" ON public."Backup" USING btree ("startedAt");


--
-- Name: Backup_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Backup_status_idx" ON public."Backup" USING btree (status);


--
-- Name: DeviceToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DeviceToken_token_key" ON public."DeviceToken" USING btree (token);


--
-- Name: DeviceToken_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeviceToken_userId_idx" ON public."DeviceToken" USING btree ("userId");


--
-- Name: DirectMessage_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectMessage_parentId_idx" ON public."DirectMessage" USING btree ("parentId");


--
-- Name: DirectMessage_receiverId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectMessage_receiverId_createdAt_idx" ON public."DirectMessage" USING btree ("receiverId", "createdAt");


--
-- Name: DirectMessage_receiverId_senderId_isRead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectMessage_receiverId_senderId_isRead_idx" ON public."DirectMessage" USING btree ("receiverId", "senderId", "isRead");


--
-- Name: DirectMessage_senderId_receiverId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectMessage_senderId_receiverId_createdAt_idx" ON public."DirectMessage" USING btree ("senderId", "receiverId", "createdAt");


--
-- Name: DirectionDiscussionMember_discussionId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DirectionDiscussionMember_discussionId_userId_key" ON public."DirectionDiscussionMember" USING btree ("discussionId", "userId");


--
-- Name: DirectionDiscussionMember_userId_joinedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectionDiscussionMember_userId_joinedAt_idx" ON public."DirectionDiscussionMember" USING btree ("userId", "joinedAt");


--
-- Name: DirectionDiscussion_directionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DirectionDiscussion_directionId_key" ON public."DirectionDiscussion" USING btree ("directionId");


--
-- Name: DirectionMessage_directionId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectionMessage_directionId_createdAt_idx" ON public."DirectionMessage" USING btree ("directionId", "createdAt");


--
-- Name: DirectionMessage_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectionMessage_parentId_idx" ON public."DirectionMessage" USING btree ("parentId");


--
-- Name: DirectionMessage_senderId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DirectionMessage_senderId_createdAt_idx" ON public."DirectionMessage" USING btree ("senderId", "createdAt");


--
-- Name: Direction_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Direction_code_key" ON public."Direction" USING btree (code);


--
-- Name: Direction_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Direction_name_key" ON public."Direction" USING btree (name);


--
-- Name: Invitation_meetingId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invitation_meetingId_userId_key" ON public."Invitation" USING btree ("meetingId", "userId");


--
-- Name: MeetingFile_meetingId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MeetingFile_meetingId_createdAt_idx" ON public."MeetingFile" USING btree ("meetingId", "createdAt");


--
-- Name: MeetingMessage_meetingId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MeetingMessage_meetingId_createdAt_idx" ON public."MeetingMessage" USING btree ("meetingId", "createdAt");


--
-- Name: MeetingMessage_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MeetingMessage_parentId_idx" ON public."MeetingMessage" USING btree ("parentId");


--
-- Name: Meeting_directionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Meeting_directionId_idx" ON public."Meeting" USING btree ("directionId");


--
-- Name: Meeting_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Meeting_projectId_idx" ON public."Meeting" USING btree ("projectId");


--
-- Name: MissionAssignment_missionId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MissionAssignment_missionId_userId_key" ON public."MissionAssignment" USING btree ("missionId", "userId");


--
-- Name: MissionFile_missionId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MissionFile_missionId_createdAt_idx" ON public."MissionFile" USING btree ("missionId", "createdAt");


--
-- Name: Mission_directionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Mission_directionId_idx" ON public."Mission" USING btree ("directionId");


--
-- Name: Mission_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Mission_projectId_idx" ON public."Mission" USING btree ("projectId");


--
-- Name: PasswordHistory_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordHistory_userId_createdAt_idx" ON public."PasswordHistory" USING btree ("userId", "createdAt");


--
-- Name: PlanningEvent_directionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlanningEvent_directionId_idx" ON public."PlanningEvent" USING btree ("directionId");


--
-- Name: PlanningEvent_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlanningEvent_projectId_idx" ON public."PlanningEvent" USING btree ("projectId");


--
-- Name: Planning_userId_weekStart_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Planning_userId_weekStart_key" ON public."Planning" USING btree ("userId", "weekStart");


--
-- Name: ProjectFile_projectId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectFile_projectId_createdAt_idx" ON public."ProjectFile" USING btree ("projectId", "createdAt");


--
-- Name: Project_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_code_key" ON public."Project" USING btree (code);


--
-- Name: Project_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_createdById_idx" ON public."Project" USING btree ("createdById");


--
-- Name: Project_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_name_key" ON public."Project" USING btree (name);


--
-- Name: Project_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_status_idx" ON public."Project" USING btree (status);


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: RepertoireContact_directionLabel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RepertoireContact_directionLabel_idx" ON public."RepertoireContact" USING btree ("directionLabel");


--
-- Name: RepertoireContact_ordre_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RepertoireContact_ordre_idx" ON public."RepertoireContact" USING btree (ordre);


--
-- Name: RoomBooking_meetingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RoomBooking_meetingId_key" ON public."RoomBooking" USING btree ("meetingId");


--
-- Name: Room_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Room_name_key" ON public."Room" USING btree (name);


--
-- Name: User_directionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_directionId_idx" ON public."User" USING btree ("directionId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Backup Backup_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Backup"
    ADD CONSTRAINT "Backup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DeviceToken DeviceToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceToken"
    ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectMessage DirectMessage_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectMessage"
    ADD CONSTRAINT "DirectMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."DirectMessage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DirectMessage DirectMessage_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectMessage"
    ADD CONSTRAINT "DirectMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectMessage DirectMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectMessage"
    ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectionDiscussionMember DirectionDiscussionMember_discussionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionDiscussionMember"
    ADD CONSTRAINT "DirectionDiscussionMember_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES public."DirectionDiscussion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectionDiscussionMember DirectionDiscussionMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionDiscussionMember"
    ADD CONSTRAINT "DirectionDiscussionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectionDiscussion DirectionDiscussion_directionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionDiscussion"
    ADD CONSTRAINT "DirectionDiscussion_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES public."Direction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectionMessage DirectionMessage_directionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionMessage"
    ADD CONSTRAINT "DirectionMessage_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES public."Direction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DirectionMessage DirectionMessage_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionMessage"
    ADD CONSTRAINT "DirectionMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."DirectionMessage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DirectionMessage DirectionMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DirectionMessage"
    ADD CONSTRAINT "DirectionMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invitation Invitation_meetingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invitation"
    ADD CONSTRAINT "Invitation_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES public."Meeting"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invitation Invitation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invitation"
    ADD CONSTRAINT "Invitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MeetingFile MeetingFile_meetingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MeetingFile"
    ADD CONSTRAINT "MeetingFile_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES public."Meeting"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MeetingFile MeetingFile_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MeetingFile"
    ADD CONSTRAINT "MeetingFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MeetingMessage MeetingMessage_meetingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MeetingMessage"
    ADD CONSTRAINT "MeetingMessage_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES public."Meeting"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MeetingMessage MeetingMessage_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MeetingMessage"
    ADD CONSTRAINT "MeetingMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."MeetingMessage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MeetingMessage MeetingMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MeetingMessage"
    ADD CONSTRAINT "MeetingMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Meeting Meeting_directionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Meeting"
    ADD CONSTRAINT "Meeting_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES public."Direction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Meeting Meeting_organizerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Meeting"
    ADD CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Meeting Meeting_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Meeting"
    ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Meeting Meeting_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Meeting"
    ADD CONSTRAINT "Meeting_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MissionAssignment MissionAssignment_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MissionAssignment"
    ADD CONSTRAINT "MissionAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public."Mission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MissionAssignment MissionAssignment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MissionAssignment"
    ADD CONSTRAINT "MissionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MissionFile MissionFile_missionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MissionFile"
    ADD CONSTRAINT "MissionFile_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES public."Mission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MissionFile MissionFile_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MissionFile"
    ADD CONSTRAINT "MissionFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Mission Mission_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Mission Mission_directionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES public."Direction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Mission Mission_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Mission"
    ADD CONSTRAINT "Mission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasswordHistory PasswordHistory_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordHistory"
    ADD CONSTRAINT "PasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlanningEvent PlanningEvent_directionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanningEvent"
    ADD CONSTRAINT "PlanningEvent_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES public."Direction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PlanningEvent PlanningEvent_planningId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanningEvent"
    ADD CONSTRAINT "PlanningEvent_planningId_fkey" FOREIGN KEY ("planningId") REFERENCES public."Planning"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlanningEvent PlanningEvent_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanningEvent"
    ADD CONSTRAINT "PlanningEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PlanningEvent PlanningEvent_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlanningEvent"
    ADD CONSTRAINT "PlanningEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Planning Planning_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Planning"
    ADD CONSTRAINT "Planning_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectFile ProjectFile_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectFile"
    ADD CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectFile ProjectFile_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectFile"
    ADD CONSTRAINT "ProjectFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoomBooking RoomBooking_meetingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoomBooking"
    ADD CONSTRAINT "RoomBooking_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES public."Meeting"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RoomBooking RoomBooking_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoomBooking"
    ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoomBooking RoomBooking_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoomBooking"
    ADD CONSTRAINT "RoomBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_directionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES public."Direction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict eDew0QVLsoROcfvd9LG1l91FURNT9p7wq5tcWZJQz1mOiHkRn6dmWyfuucQxn4S

