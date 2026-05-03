--
-- PostgreSQL database dump
--

\restrict Ld7vEPk6fYcfV1DGE6NCHDXY1CKJZIwepEhqRiqg9GnPAYkET2jHCfG7EcM1yiT

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
cmmo3tmm80003o21qrndfrdfw	cmmo3sw3o0003p1nppenw0vmn	LOGIN	User	cmmo3sw3o0003p1nppenw0vmn	::1	\N	2026-03-12 23:33:50.911
cmmo3z3oc000925fvwtdnzc5b	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	\N	2026-03-12 23:38:06.301
cmmo41f9p000d25fvjycho56o	cmmo3sxa90006p1npcmnoc8dt	LOGIN	User	cmmo3sxa90006p1npcmnoc8dt	::1	\N	2026-03-12 23:39:54.637
cmmo4ctwr0003htg3vojgr0q1	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	\N	2026-03-12 23:48:46.827
cmmo4nv8e000312gnpgcc7i0o	cmmo3sxa90006p1npcmnoc8dt	LOGIN	User	cmmo3sxa90006p1npcmnoc8dt	::1	Connexion de responsable4@example.com	2026-03-12 23:57:21.758
cmmo4ptsp0003lvr2wo46kfgx	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-12 23:58:53.209
cmmo4ssxu000dlvr274u3txmx	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmmo4sswp0005lvr2qs2c0fi5	::1	Réunion "TEST TETSE" créée	2026-03-13 00:01:12.066
cmmo4togy000flvr2xuqd8w3g	cmmo3suxw0000p1np0eron6et	MEETING_UPDATED	Meeting	cmmo4sswp0005lvr2qs2c0fi5	::1	Réunion "TEST TETSE" modifiée (horaire/salle)	2026-03-13 00:01:52.93
cmmo4ucil000jlvr2369nceyr	cmmo3suxw0000p1np0eron6et	MEETING_UPDATED	Meeting	cmmo4sswp0005lvr2qs2c0fi5	::1	Réunion "TEST TETSE" modifiée (horaire/salle)	2026-03-13 00:02:24.094
cmmo4wbzc000fak15v61qihsf	cmmo3sxa90006p1npcmnoc8dt	LOGIN	User	cmmo3sxa90006p1npcmnoc8dt	::1	Connexion de responsable4@example.com	2026-03-13 00:03:56.713
cmmo4wr9s000pak159cfuflk2	cmmo3sxa90006p1npcmnoc8dt	MEETING_CANCELLED	Meeting	cmmo44zkc000f25fvcxaavyfo	::1	Réunion "TESTE" annulée	2026-03-13 00:04:16.529
cmmo4wu59000tak15tkw9t3b7	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmmo4sswp0005lvr2qs2c0fi5	\N	Convocations réunion "TEST TETSE" envoyées	2026-03-13 00:04:20.253
cmmom81yz0003ruosw6v390p4	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 08:08:57.083
cmmom92kt0007ruosej2ist2i	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 08:09:44.525
cmmommfpf0009ruos6l2mefb2	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3svr60002p1npg39ix3rb	::1	Mot de passe réinitialisé pour dg@example.com	2026-03-13 08:20:08.066
cmmommik4000bruosco8ibhp6	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3svr60002p1npg39ix3rb	::1	Mot de passe réinitialisé pour dg@example.com	2026-03-13 08:20:11.764
cmmonkj6j0003r25v0wc1hl69	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 08:46:38.875
cmmonlaco0007r25v11ep55xq	cmmo3svr60002p1npg39ix3rb	LOGIN	User	cmmo3svr60002p1npg39ix3rb	::1	Connexion de dg@example.com	2026-03-13 08:47:14.089
cmmonyxsp00032h1edhihqlg4	cmmo3svr60002p1npg39ix3rb	MEETING_CREATED	Meeting	cmmonyxrn00012h1eb9y2mh4y	::1	Réunion "TEST " créée	2026-03-13 08:57:51.001
cmmonz3rs00072h1e8z9hknuv	cmmo3svr60002p1npg39ix3rb	MEETING_SENT	Meeting	cmmonyxrn00012h1eb9y2mh4y	::1	Convocations réunion "TEST " envoyées	2026-03-13 08:57:58.744
cmmoo5x3f0007wlvx1ezlv2dl	cmmo3svr60002p1npg39ix3rb	MEETING_PARTICIPANTS_ADDED	Meeting	cmmonyxrn00012h1eb9y2mh4y	::1	2 participant(s) ajouté(s)	2026-03-13 09:03:16.684
cmmoo9c1v000bwlvx2ogd5j3h	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 09:05:56.035
cmmot9cxn00028jo7ftng60ys	cmmo3suxw0000p1np0eron6et	CREATE_USER	User	cmmot9cwj00008jo77uui1yor	::1	Utilisateur alhusseinkhouma0@gmail.com créé	2026-03-13 11:25:55.259
cmmotaqku0003an2ficg3fkrg	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-13 11:26:59.598
cmmovl6oh00039wszkul11cxe	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 12:31:06.256
cmmozx86h0003xnvotf1gpz5k	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 14:32:26.537
cmmozzr050007xnvor9tl6j6v	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-13 14:34:24.245
cmmp01s0x000gxnvor81anb9d	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmmp01rza0009xnvoupogf5ih	::1	Réunion "TESTETE A" créée	2026-03-13 14:35:58.882
cmmp029tq000sxnvozpndl2i7	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmmp01rza0009xnvoupogf5ih	::1	Convocations réunion "TESTETE A" envoyées	2026-03-13 14:36:21.951
cmmp063j8000xxnvo2xdzpslz	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-13 14:39:20.42
cmmqj4isj0003g3pet4bwfvam	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 16:17:45.763
cmmqj6lyr000gg3pezx2q551b	cmmo3suxw0000p1np0eron6et	MISSION_CREATED	Mission	cmmqj6eu50005g3pealoydma1	::1	Mission ADM créée	2026-03-14 16:19:23.187
cmmqjq0ir0003btgmgrj5w3zz	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 16:34:28.516
cmmql59f80003q3ok590vv3hm	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-14 17:14:19.509
cmmqlgi9l00037by4vd5aoq2s	cmmot9cwj00008jo77uui1yor	PLANNING_SUBMITTED	Planning	cmmqlgapx00017by4wcyj9dyp	::1	Planning cmmqlgapx00017by4wcyj9dyp soumis	2026-03-14 17:23:04.185
cmmqlmlq10003snjkclb37el5	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 17:27:48.602
cmmqm1hsa0003h5j21pr4kdu9	cmmo3suxw0000p1np0eron6et	PLANNING_ADMIN_CREATE	Planning	cmmqm1hqj0001h5j2vd8wdbam	::1	Planning créé par admin pour alhusseinkhouma0@gmail.com	2026-03-14 17:39:23.338
cmmqm201u0007h5j2ntr6e4y9	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-14 17:39:47.01
cmmqmfhpv0003hgk8w7npamfe	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 17:50:16.436
cmmqmg9wu0005hgk8i0n9w9e9	cmmo3suxw0000p1np0eron6et	SEND_RESET_LINK	User	cmmot9cwj00008jo77uui1yor	::1	Lien de réinitialisation envoyé à alhusseinkhouma0@gmail.com	2026-03-14 17:50:52.974
cmmqos4k70003vcmbetrfzp3k	cmmo3suxw0000p1np0eron6et	PLANNING_EVENT_CREATED	PlanningEvent	cmmqos4jm0001vcmb8s0hcgf4	::1	Événement ajouté par admin sur planning cmmqm1hqj0001h5j2vd8wdbam	2026-03-14 18:56:05.143
cmmqsaddr0003swm2ymyx4691	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-14 20:34:15.232
cmmt8sjg000036z3z5ijyp7mh	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-16 13:51:49.103
cmmtb5sif00076z3zsk2wt1sm	cmmo3sw3o0003p1nppenw0vmn	LOGIN	User	cmmo3sw3o0003p1nppenw0vmn	::1	Connexion de responsable1@example.com	2026-03-16 14:58:06.615
cmmtb6hri000b6z3zopkd1r43	cmmo3sxa90006p1npcmnoc8dt	LOGIN	User	cmmo3sxa90006p1npcmnoc8dt	::1	Connexion de responsable4@example.com	2026-03-16 14:58:39.342
cmmtb874c000k6z3za3xa570l	cmmo3sxa90006p1npcmnoc8dt	MEETING_CREATED	Meeting	cmmtb872p000d6z3zuc4zios4	::1	Réunion "TEST" créée	2026-03-16 14:59:58.86
cmmtb9pow000w6z3zh21od9nm	cmmo3sxa90006p1npcmnoc8dt	MEETING_SENT	Meeting	cmmtb872p000d6z3zuc4zios4	::1	Convocations réunion "TEST" envoyées	2026-03-16 15:01:09.584
cmmtbbcu400106z3ze1hu7d7h	cmmo3sw3o0003p1nppenw0vmn	LOGIN	User	cmmo3sw3o0003p1nppenw0vmn	::1	Connexion de responsable1@example.com	2026-03-16 15:02:26.237
cmmtbdg06001a6z3zgkk4o33s	cmmo3sw3o0003p1nppenw0vmn	MISSION_CREATED	Mission	cmmtbdcai00126z3zlvrpy0yo	::1	Mission MISSION X créée	2026-03-16 15:04:03.654
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
cmn7gwiar0010130k94ilbxj7	cmmo3sw3o0003p1nppenw0vmn	LOGIN	User	cmmo3sw3o0003p1nppenw0vmn	::1	Connexion de responsable1@example.com	2026-03-26 12:47:37.636
cmn7gx7yd0014130kwk5vvxso	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_ADDED	MeetingFile	cmn7gx7y90012130khy3rj7gz	::1	Fichier "apple-touch-icon (2).png" ajouté (IMAGE)	2026-03-26 12:48:10.886
cmn7gxav80018130kdgu1brgl	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_ADDED	MeetingFile	cmn7gxaus0016130k7a5o9bv0	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" ajouté (DOCUMENT)	2026-03-26 12:48:14.66
cmn7gxdyy001c130krw5nx1nt	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_ADDED	MeetingFile	cmn7gxdyu001a130k0cklpk83	::1	Fichier "ACFrOgA9829-GqIBwt_l1bnlf5Ek9CQbNfpRXGMFyxc29DD0MjjCJE0KCJ4_vRckdq2r5_Irc4-jrLOyUgWp_spwNq3VyAPr-Kczs0VYZ5XJBkmXYMj6XKIH7WmYbhUWOU7qCuWdlCpBjVNAt1tWzYRrSqgcLqlcQsvUjEqckw== (1).pdf" ajouté (REPORT)	2026-03-26 12:48:18.682
cmn7hkfvw001k130kxy8t0wdo	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_DELETED	MeetingFile	cmn7gxdyu001a130k0cklpk83	::1	Fichier "ACFrOgA9829-GqIBwt_l1bnlf5Ek9CQbNfpRXGMFyxc29DD0MjjCJE0KCJ4_vRckdq2r5_Irc4-jrLOyUgWp_spwNq3VyAPr-Kczs0VYZ5XJBkmXYMj6XKIH7WmYbhUWOU7qCuWdlCpBjVNAt1tWzYRrSqgcLqlcQsvUjEqckw== (1).pdf" supprimé	2026-03-26 13:06:14.253
cmn7hn32o001q130kdrle3x38	cmmo3sw3o0003p1nppenw0vmn	PLANNING_SUBMITTED	Planning	cmn7hgp1e001g130kyuq0qjux	::1	Planning cmn7hgp1e001g130kyuq0qjux soumis	2026-03-26 13:08:17.617
cmn7hns1g001y130kt50je1z8	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 13:08:49.972
cmn7hor4b0020130kbofnp39k	cmmo3suxw0000p1np0eron6et	PLANNING_CONSOLIDATED	Planning	cmn7hgp1e001g130kyuq0qjux	::1	Planning cmn7hgp1e001g130kyuq0qjux consolidé	2026-03-26 13:09:35.436
cmn7hov8m0024130ks6cyo2iv	cmmo3suxw0000p1np0eron6et	PLANNING_VALIDATED	Planning	cmn7hgp1e001g130kyuq0qjux	::1	Planning cmn7hgp1e001g130kyuq0qjux validé	2026-03-26 13:09:40.775
cmn7hpfoi002a130ky39vbg5z	cmmo3sw3o0003p1nppenw0vmn	LOGIN	User	cmmo3sw3o0003p1nppenw0vmn	::1	Connexion de responsable1@example.com	2026-03-26 13:10:07.267
cmn7l0ggh00031p3odq7rind1	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 14:42:40.337
cmn7l0omm00051p3oqpkfaxat	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : 2fa_enabled	2026-03-26 14:42:50.927
cmn7l143k00091p3onyfd7ffc	cmmo3sw3o0003p1nppenw0vmn	LOGIN	User	cmmo3sw3o0003p1nppenw0vmn	::1	Connexion de responsable1@example.com	2026-03-26 14:43:10.976
cmn7l2edj000b1p3o47j190fr	cmmo3sw3o0003p1nppenw0vmn	2FA_ENABLED	User	cmmo3sw3o0003p1nppenw0vmn	::1	2FA activée par l'utilisateur	2026-03-26 14:44:10.952
cmn7l4rhb000h1p3ocecr6qq9	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-26 14:46:01.247
cmn7l83sk000l1p3o3kz8cbgu	cmmo3suxw0000p1np0eron6et	MEETING_FILE_ADDED	MeetingFile	cmn7l83sa000j1p3o4r67677p	::1	Fichier "Gemini_Generated_Image_v37ry1v37ry1v37r.png" ajouté (IMAGE)	2026-03-26 14:48:37.172
cmn7lpoyn000646tus8mq9mpc	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmn7lpoxm000146tuwhf71n06	::1	Réunion "TEST CONFLIT" créée	2026-03-26 15:02:17.759
cmn7lr4bj000e46tu9bp6nzbz	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmn7lpoxm000146tuwhf71n06	::1	Convocations réunion "TEST CONFLIT" envoyées	2026-03-26 15:03:24.319
cmn7luv8h000m46tuwyjl9z4v	cmmo3suxw0000p1np0eron6et	MEETING_FILE_ADDED	MeetingFile	cmn7luv8a000k46tu00yz2kvf	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" ajouté (DOCUMENT)	2026-03-26 15:06:19.17
cmn7lvssf000s46tuoqha8r2j	cmmo3suxw0000p1np0eron6et	MEETING_CANCELLED	Meeting	cmn7lpoxm000146tuwhf71n06	::1	Réunion "TEST CONFLIT" annulée	2026-03-26 15:07:02.655
cmn7mss8m000b7a2w3guw0c5e	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_ADDED	MeetingFile	cmn7mss8b00097a2wdzzhvk8h	::1	Fichier "ALhUSSEINkHOUMA_CV_INGENIEUR_LOGICIEL.pdf" ajouté (REPORT)	2026-03-26 15:32:41.59
cmn7mt7mv000d7a2wmuhcfmv0	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_DELETED	MeetingFile	cmn7mss8b00097a2wdzzhvk8h	::1	Fichier "ALhUSSEINkHOUMA_CV_INGENIEUR_LOGICIEL.pdf" supprimé	2026-03-26 15:33:01.544
cmn7mzild0001w6i2ucsrkuax	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_DELETED	MeetingFile	cmn7gxaus0016130k7a5o9bv0	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" supprimé	2026-03-26 15:37:55.681
cmn7mzmch0003w6i2f32om1a1	cmmo3sw3o0003p1nppenw0vmn	MEETING_FILE_DELETED	MeetingFile	cmn7gx7y90012130khy3rj7gz	::1	Fichier "apple-touch-icon (2).png" supprimé	2026-03-26 15:38:00.546
cmn7nlfe80001gqq73tzyw1zq	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : integrated_visio_enabled	2026-03-26 15:54:57.968
cmn7o19lt000dloz1eiuagtd2	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : direct_messages_enabled	2026-03-26 16:07:16.961
cmn7o1guf000floz1438c0pxc	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : direct_messages_enabled	2026-03-26 16:07:26.342
cmn7ojda10001136npxjxokk9	cmmo3suxw0000p1np0eron6et	PLANNING_SUBMITTED	Planning	cmmqm1hqj0001h5j2vd8wdbam	::1	Planning cmmqm1hqj0001h5j2vd8wdbam soumis par l'administration (responsable: cmmot9cwj00008jo77uui1yor)	2026-03-26 16:21:21.529
cmn7ojh250007136n108bnra1	cmmo3suxw0000p1np0eron6et	PLANNING_DELETED	Planning	cmmqm1hqj0001h5j2vd8wdbam	::1	Planning supprimé (semaine du 2026-03-23)	2026-03-26 16:21:26.429
cmn7okmnv0009136nlvtez1rl	cmmo3sw3o0003p1nppenw0vmn	MEETING_UPDATED	Meeting	cmmo3x0vv000325fvzt6a05on	::1	Réunion "MEET DEV" modifiée	2026-03-26 16:22:20.347
cmn7okvv0000e136n3c1mzk18	cmmo3sw3o0003p1nppenw0vmn	MEETING_PARTICIPANTS_ADDED	Meeting	cmmo3x0vv000325fvzt6a05on	::1	1 participant(s) ajouté(s)	2026-03-26 16:22:32.268
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
cmn92bywa0003eggqsza3bgmb	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-27 15:35:17.098
cmn94cq160003lglk52f7l9jv	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmot9cwj00008jo77uui1yor	::1	Mot de passe réinitialisé pour alhusseinkhouma0@gmail.com	2026-03-27 16:31:51.499
cmn94d2940007lglkt34l108h	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-27 16:32:07.337
cmn952hey000314komjpb0bc2	cmmot9cwj00008jo77uui1yor	PLANNING_DELETED	Planning	cmn952b8f000114kovpm0mfmq	::1	Planning supprimé (semaine du 2026-03-23)	2026-03-27 16:51:53.386
cmn9f81nr0003ue5fcl6wqgyz	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-27 21:36:09.063
cmn9fmixs000due5fy7ppcpya	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-27 21:47:24.64
cmn9fp6cn000hue5f4z47mcss	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-27 21:49:28.295
cmn9h1w2j0003rousecbfvmib	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-27 22:27:21.115
cmn9jk0j1000gw1vtyegevnnr	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-27 23:37:25.933
cmn9jyivs0011w1vtxhpycqgl	cmmo3suxw0000p1np0eron6et	MISSION_CANCELLED	Mission	cmmqj6eu50005g3pealoydma1	::1	Mission ADM annulée	2026-03-27 23:48:42.904
cmn9k09lk0007lcns9g8f3heu	cmmo3suxw0000p1np0eron6et	MEETING_CREATED	Meeting	cmn9k09l20001lcns7xwbirzb	::1	Réunion "DEMARRAGE PROJET" créée	2026-03-27 23:50:04.185
cmn9k16hy000hlcnseuqkp1wl	cmmo3suxw0000p1np0eron6et	MEETING_SENT	Meeting	cmn9k09l20001lcns7xwbirzb	::1	Convocations réunion "DEMARRAGE PROJET" envoyées	2026-03-27 23:50:46.822
cmn9k3p3p000tlcns6si9q92m	cmmot9cwj00008jo77uui1yor	MEETING_FILE_ADDED	MeetingFile	cmn9k3p3j000rlcnsoywayhep	::1	Fichier "Design sans titre (1).png" ajouté (IMAGE)	2026-03-27 23:52:44.245
cmn9k4koy000vlcnsd5wyzxwx	cmmo3suxw0000p1np0eron6et	MEETING_FILE_DELETED	MeetingFile	cmn8uz2fp0007hgyfmw55g64y	::1	Fichier "RÃ©sumÃ© exÃ©cutif.pdf" supprimé	2026-03-27 23:53:25.186
cmnbtdrys00033448clgrie1m	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-29 13:48:03.412
cmnbtqrsk000934483t6te4vj	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-29 13:58:09.716
cmnbu6ywf0003oclykihljsvv	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-29 14:10:45.423
cmnbu7d400005ocly5o99umd6	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1774793463816.png	2026-03-29 14:11:03.841
cmnbu7e7a0007oclyc9o97rc8	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-03-29 14:11:05.255
cmnbuhk5500031202dzshl6x3	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-29 14:18:59.513
cmnbuzrzw0003mvm0o2rsad44	cmmo3suxw0000p1np0eron6et	BACKUP_CREATED	Backup	cmnbuzppl0001mvm00foxazxv	::1	Sauvegarde backup_2026-03-29T14-33-06.sql	2026-03-29 14:33:09.5
cmndf45410003fatlkq5enttr	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-30 16:44:11.618
cmneavz1g0003f1ui9p8lhapt	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 07:33:38.212
cmneb8gei000gf1uiar77cazg	cmmo3suxw0000p1np0eron6et	MISSION_CREATED	Mission	cmneb8bqp0005f1uit2x84wvc	::1	Mission GESTION VENTE EN GROS créée	2026-03-31 07:43:20.586
cmneb9d6c000kf1uiwzzovneu	cmmo3suxw0000p1np0eron6et	MISSION_FILE_ADDED	MissionFile	cmneb9d64000if1ui9w91k99a	::1	Fichier "gp-64 (Site Web).png" ajouté (IMAGE)	2026-03-31 07:44:03.061
cmneb9sbn000of1ui261qbcvh	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-31 07:44:22.691
cmnebbjst000sf1ui62d70o5z	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 07:45:44.957
cmnebd7hu000yf1uil7x1rs0b	cmmot9cwj00008jo77uui1yor	MEETING_CREATED	Meeting	cmnebd7h4000uf1uiepw78wty	::1	Réunion "Premier reunion" créée	2026-03-31 07:47:02.323
cmnebeb2q0014f1uikjkhjk6g	cmmot9cwj00008jo77uui1yor	MEETING_SENT	Meeting	cmnebd7h4000uf1uiepw78wty	::1	Convocations réunion "Premier reunion" envoyées	2026-03-31 07:47:53.618
cmnebhypt001af1uio73wb3nm	cmmo3swhb0004p1npbgv6f66x	LOGIN	User	cmmo3swhb0004p1npbgv6f66x	::1	Connexion de responsable2@example.com	2026-03-31 07:50:44.225
cmnebk41g001kf1uivuihjizt	cmmo3swhb0004p1npbgv6f66x	MEETING_FILE_ADDED	MeetingFile	cmnebk41c001if1uii0wiw4tf	::1	Fichier "gp-64 (Site Web).png" ajouté (IMAGE)	2026-03-31 07:52:24.436
cmnebprme00054cq1xdwb13vw	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-31 07:56:48.279
cmnebte9i000f4cq1ce3wxvkq	cmmot9cwj00008jo77uui1yor	MEETING_COMPLETED	Meeting	cmnebd7h4000uf1uiepw78wty	::1	Réunion "Premier reunion" terminée	2026-03-31 07:59:37.59
cmnecyy4z0005fum253hjj8b1	cmmot9cwj00008jo77uui1yor	PLANNING_SUBMITTED	Planning	cmn8v31oe000hhgyfi19o47vh	::1	Planning cmn8v31oe000hhgyfi19o47vh soumis	2026-03-31 08:31:56.243
cmned01ch000dfum2q3jp7er7	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 08:32:47.057
cmned1vog000ffum27y531vny	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3svdj0001p1npkybbwako	::1	Mot de passe réinitialisé pour mansour.bocoum@example.com	2026-03-31 08:34:13.024
cmned2f0c000jfum2wbmm2oji	cmmo3svdj0001p1npkybbwako	LOGIN	User	cmmo3svdj0001p1npkybbwako	::1	Connexion de mansour.bocoum@example.com	2026-03-31 08:34:38.077
cmned2m3v000lfum2cdwxfitl	cmmo3svdj0001p1npkybbwako	PLANNING_CONSOLIDATED	Planning	cmn8v31oe000hhgyfi19o47vh	::1	Planning cmn8v31oe000hhgyfi19o47vh consolidé	2026-03-31 08:34:47.276
cmned3gq7000pfum2l7qrsvcx	cmmo3suxw0000p1np0eron6et	PLANNING_VALIDATED	Planning	cmn8v31oe000hhgyfi19o47vh	::1	Planning cmn8v31oe000hhgyfi19o47vh validé	2026-03-31 08:35:26.96
cmnedxojs000rm1twkdmztojv	cmmo3svdj0001p1npkybbwako	LOGIN	User	cmmo3svdj0001p1npkybbwako	::1	Connexion de mansour.bocoum@example.com	2026-03-31 08:58:56.777
cmneel5jb000136ri5kd4dk8u	cmmo3suxw0000p1np0eron6et	MEETING_REOPENED	Meeting	cmn7gsvqw0009130kj9dnmxy2	::1	Réunion "TEST" rouverte (statut SENT)	2026-03-31 09:17:11.879
cmneeqgl50003qr9dliwxba28	cmmo3svdj0001p1npkybbwako	LOGIN	User	cmmo3svdj0001p1npkybbwako	::1	Connexion de mansour.bocoum@example.com	2026-03-31 09:21:19.481
cmnehy5hp0003g59ny14y0nm9	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 10:51:17.197
cmnejicxe0003g36g78u8ck3z	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-31 11:34:59.57
cmnejtk6h000n8c5us3t7oy37	cmmo3svr60002p1npg39ix3rb	LOGIN	User	cmmo3svr60002p1npg39ix3rb	::1	Connexion de dg@example.com	2026-03-31 11:43:42.185
cmneju5ln000z8c5ul8f4b719	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-31 11:44:09.948
cmnejws5g001h8c5u0ygci240	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 11:46:12.485
cmnem5abq000lo5vb1je54esg	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-03-31 12:48:48.518
cmnem5off000po5vbi9p8hjau	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-31 12:49:06.795
cmnem9wy1000to5vbif2803ll	cmmot9cwj00008jo77uui1yor	LOGIN	User	cmmot9cwj00008jo77uui1yor	::1	Connexion de alhusseinkhouma0@gmail.com	2026-03-31 12:52:24.458
cmnmanfc20003unitkndbsx5p	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-05 21:49:08.835
cmnmaobqw0007unitye5ni2sb	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-05 21:49:50.84
cmolhlelz0003a3505nru7zle	cmmo3sw3o0003p1nppenw0vmn	LOGIN_2FA	User	cmmo3sw3o0003p1nppenw0vmn	::1	Connexion 2FA réussie	2026-04-30 12:55:28.055
cmolhyz4p0005atqh7gs41iih	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-30 13:06:01.177
cmolj2vcy0002mrqrddkp0cz9	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1777556222511.png	2026-04-30 13:37:02.531
cmolj2wu40004mrqrjcd1xdki	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-04-30 13:37:04.444
cmolvnror000340r4xl73nf14	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-30 19:29:12.939
cmolvz7ke000w40r4v267kbuq	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-04-30 19:38:06.735
cmolxu5dq0006hjp6keackwqf	cmmo3suxw0000p1np0eron6et	CREATE_USER	User	cmolxu5bz0001hjp688nfthe4	::1	Utilisateur amina@yopmail.com créé (en attente d'activation)	2026-04-30 20:30:09.854
cmolxxfe6000ahjp6kwymknap	cmolxu5bz0001hjp688nfthe4	LOGIN	User	cmolxu5bz0001hjp688nfthe4	::1	Connexion de amina@yopmail.com	2026-04-30 20:32:42.799
cmolxylqc000hhjp6vdf2ftc6	cmolxu5bz0001hjp688nfthe4	MISSION_CREATED	Mission	cmolxyiiu000chjp6qhxuyqno	::1	Mission FORMATION IA créée	2026-04-30 20:33:37.668
cmolxyv0c000lhjp6dndmymrj	cmolxu5bz0001hjp688nfthe4	MISSION_FILE_ADDED	MissionFile	cmolxyv05000jhjp6z0hea4lc	::1	Fichier "Repertoire_ADM_2026 (2).pdf" ajouté (DOCUMENT)	2026-04-30 20:33:49.693
cmomtfg6z000310sk8sm6aple	cmomtfazz0000jmo56gafwtru	LOGIN	User	cmomtfazz0000jmo56gafwtru	::1	Connexion de demo@adm.sn	2026-05-01 11:14:31.739
cmomvnmcr0003aov9vtvtn9yc	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 12:16:52.203
cmomvrn1w0007aov9obeiv1i1	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 12:19:59.732
cmomw5zca000baov9ronzgqs0	cmmo3suxw0000p1np0eron6et	BACKUP_CREATED	Backup	cmomw5x7m0009aov9qobndxaz	::1	Sauvegarde backup_2026-05-01T12-31-06.sql	2026-05-01 12:31:08.842
cmomw8axg000daov9sae60a8f	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-05-01 12:32:57.173
cmomw8d44000faov9cfx6vtbp	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_LOGO_UPDATED	AppSetting	app_logo_url	::1	/uploads/branding/app_logo_1777638779986.png	2026-05-01 12:33:00.005
cmomw8e4m000haov9li0uxcwl	cmmo3suxw0000p1np0eron6et	ADMIN_SETTINGS_UPDATED	AppSetting	global	::1	Paramètres mis à jour : app_name, app_contact_email, app_contact_phone, app_contact_address, app_footer_text, app_logo_url	2026-05-01 12:33:01.318
cmomw9nfb000jaov9havco059	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmolxu5bz0001hjp688nfthe4	::1	Mot de passe réinitialisé pour amina@yopmail.com	2026-05-01 12:34:00.023
cmomw9yfc000naov91oj51r6d	cmolxu5bz0001hjp688nfthe4	LOGIN	User	cmolxu5bz0001hjp688nfthe4	::1	Connexion de amina@yopmail.com	2026-05-01 12:34:14.28
cmomwg3ey000raov9itb4s856	cmolxu5bz0001hjp688nfthe4	MISSION_CREATED	Mission	cmomwg3er000paov9jbu1euam	::1	Mission 1 MAI créée	2026-05-01 12:39:00.682
cmomwhv7n0011aov9y7fgrl1g	cmolxu5bz0001hjp688nfthe4	MEETING_CREATED	Meeting	cmomwhv78000taov95p97cwo9	::1	Réunion "Presentation Projet" créée	2026-05-01 12:40:23.364
cmomwpc680015aov9mo0m1a2g	cmolxu5bz0001hjp688nfthe4	LOGIN	User	cmolxu5bz0001hjp688nfthe4	::1	Connexion de amina@yopmail.com	2026-05-01 12:46:11.937
cmomwpwn40017aov9dtc9zngo	cmolxu5bz0001hjp688nfthe4	MEETING_UPDATED	Meeting	cmomwhv78000taov95p97cwo9	::1	Réunion "Presentation Projet" modifiée (horaire/salle)	2026-05-01 12:46:38.465
cmomwqvpv001baov9zu2zvw8q	cmolxu5bz0001hjp688nfthe4	LOGIN	User	cmolxu5bz0001hjp688nfthe4	::1	Connexion de amina@yopmail.com	2026-05-01 12:47:23.923
cmomwrcbx001paov9ea814lzy	cmolxu5bz0001hjp688nfthe4	MEETING_SENT	Meeting	cmomwhv78000taov95p97cwo9	::1	Convocations réunion "Presentation Projet" envoyées	2026-05-01 12:47:45.453
cmomwsb69001taov9yng2tbd1	cmolxu5bz0001hjp688nfthe4	LOGIN	User	cmolxu5bz0001hjp688nfthe4	::1	Connexion de amina@yopmail.com	2026-05-01 12:48:30.609
cmomwt8qb001xaov90l2tmrof	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 12:49:14.1
cmomwtyb8001zaov94vshiw03	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmot9cwj00008jo77uui1yor	::1	Mot de passe réinitialisé pour alhusseinkhouma0@gmail.com	2026-05-01 12:49:47.252
cmomwuj5e0021aov90mxe35mw	cmmo3suxw0000p1np0eron6et	ADMIN_RESET_PASSWORD	User	cmmo3sxn00007p1npldvr5svn	::1	Mot de passe réinitialisé pour responsable5@example.com	2026-05-01 12:50:14.258
cmomwv2vg0025aov9s1aa0ihe	cmmo3sxn00007p1npldvr5svn	LOGIN	User	cmmo3sxn00007p1npldvr5svn	::1	Connexion de responsable5@example.com	2026-05-01 12:50:39.82
cmon19c8u0003itqpu4s2c578	cmmo3suxw0000p1np0eron6et	LOGIN	User	cmmo3suxw0000p1np0eron6et	::1	Connexion de admin@example.com	2026-05-01 14:53:43.614
\.


--
-- Data for Name: Backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Backup" (id, "fileName", "relativePath", "sizeBytes", status, "errorMessage", kind, "startedAt", "finishedAt", "createdById") FROM stdin;
cmnbuzppl0001mvm00foxazxv	backup_2026-03-29T14-33-06.sql	backups\\backup_2026-03-29T14-33-06.sql	124045	SUCCESS	\N	MANUAL	2026-03-29 14:33:06.534	2026-03-29 14:33:07.368	cmmo3suxw0000p1np0eron6et
cmomw5x7m0009aov9qobndxaz	backup_2026-05-01T12-31-06.sql	backups\\backup_2026-05-01T12-31-06.sql	182061	SUCCESS	\N	MANUAL	2026-05-01 12:31:06.082	2026-05-01 12:31:06.786	cmmo3suxw0000p1np0eron6et
cmon1g48u0005itqprqzw7e56	backup_2026-05-01T14-58-59.sql	backups\\backup_2026-05-01T14-58-59.sql	\N	PENDING	\N	MANUAL	2026-05-01 14:58:59.838	\N	cmmo3suxw0000p1np0eron6et
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
cmn7nz5e20001loz1w7gl9nuo	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	salut	2026-03-26 16:05:38.187	\N	\N	t	\N	\N	\N
cmn7nzgio0003loz1xwlni8u5	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	tu vas bien ?	2026-03-26 16:05:52.609	\N	\N	t	\N	\N	\N
cmnedp1c1000hm1twqozg8md9	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	bien recu , merci	2026-03-31 08:52:13.442	\N	\N	t	\N	\N	\N
cmn7nzlxh0005loz1mok5uto5	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	super alors	2026-03-26 16:05:59.622	\N	\N	t	\N	\N	\N
cmn8v22tl000fhgyfx4wz2etz	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	bjr	2026-03-27 12:11:38.314	\N	\N	t	\N	\N	\N
cmn7nzoz50007loz16rin6ht7	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	\N	2026-03-26 16:06:03.569	Gemini_Generated_Image_v37ry1v37ry1v37r.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774541163541.png	t	image/png	1402921	\N
cmn9if1e70001w1vt184fwl9p	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	salut	2026-03-27 23:05:34.16	\N	\N	t	\N	\N	\N
cmn7nzy1c0009loz1ow7hiym8	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	je vois c bien	2026-03-26 16:06:15.313	\N	\N	t	\N	\N	\N
cmn7nte150001beveleafd9jo	cmmo3sw3o0003p1nppenw0vmn	cmmo3svr60002p1npg39ix3rb	salut	2026-03-26 16:01:09.449	\N	\N	t	\N	\N	\N
cmn7o077r000bloz1i11fzp9b	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	\N	2026-03-26 16:06:27.208	ALhUSSEINkHOUMA_CV_INGENIEUR_LOGICIEL.pdf	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774541187199.pdf	t	application/pdf	105314	\N
cmn9ifc2g0005w1vt65x8hqsm	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	salut	2026-03-27 23:05:47.993	\N	\N	t	\N	\N	\N
cmn7o4glv0001jdnv7otz40j6	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	dcr	2026-03-26 16:09:46.003	\N	\N	t	\N	\N	\N
cmn9fu1cy000jue5fyu2k650e	cmmot9cwj00008jo77uui1yor	cmmo3sw3o0003p1nppenw0vmn	cc	2026-03-27 21:53:15.107	\N	\N	t	\N	\N	\N
cmn7oe8xm0003jdnvhdgx2y6f	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	ah d'accord c bien pourtout	2026-03-26 16:17:22.618	\N	\N	t	\N	\N	cmn7o077r000bloz1i11fzp9b
cmn9itka40007w1vtlke6f1ya	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	tu vas bien ???	2026-03-27 23:16:51.82	\N	\N	t	\N	\N	\N
cmn7p81xl0003hta1ph2hfh2q	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	salut	2026-03-26 16:40:33.225	\N	\N	t	\N	\N	\N
cmn7p8bfw0005hta1wrvcfkqg	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	ca va tu vs bien	2026-03-26 16:40:45.549	\N	\N	t	\N	\N	\N
cmn7pdr220001bmkb5byls3fv	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	salut	2026-03-26 16:44:59.066	\N	\N	t	\N	\N	\N
cmn7pj1x50003bmkbyq35w4fs	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	ca va	2026-03-26 16:49:06.425	\N	\N	t	\N	\N	\N
cmn7pja1h0005bmkbwznhia3b	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	ah d'accord	2026-03-26 16:49:16.949	\N	\N	t	\N	\N	\N
cmn92j7wj0005eggqxncvjp8n	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	sa	2026-03-27 15:40:55.363	\N	\N	t	\N	\N	\N
cmn94ajsb0001lglkjjuffc4q	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	salut	2026-03-27 16:30:10.088	\N	\N	t	\N	\N	\N
cmn9fd3p10009ue5fpjcwqxtf	cmmot9cwj00008jo77uui1yor	cmmo3sxa90006p1npcmnoc8dt	salut	2026-03-27 21:40:04.981	\N	\N	f	\N	\N	\N
cmn94duvs0001o4hx54ezl0rf	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	ah d'accord alors	2026-03-27 16:32:44.44	TDR-TableauDevenement (1).docx	/uploads/direct-messages/dm_cmmot9cwj00008jo77uui1yor_1774629164423.docx	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	46280	\N
cmn9f958x0005ue5f7yyjzbrq	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	\N	2026-03-27 21:37:00.369	Design sans titre.png	/uploads/direct-messages/dm_cmmot9cwj00008jo77uui1yor_1774647420324.png	t	image/png	1990137	\N
cmn9fd3l80007ue5fz10vvda2	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salut	2026-03-27 21:40:04.844	\N	\N	t	\N	\N	\N
cmn9fu1sf000nue5fjilhj10b	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	ah dcr	2026-03-27 21:53:15.663	\N	\N	t	\N	\N	\N
cmn9fu20n000pue5fprqk08co	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	oui cav	2026-03-27 21:53:15.959	\N	\N	t	\N	\N	\N
cmn9h4ltv0005rousmdzgr3es	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	nn	2026-03-27 22:29:27.811	\N	\N	t	\N	\N	cmn9fu20n000pue5fprqk08co
cmn9jku68000iw1vtfzlztery	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salut	2026-03-27 23:38:04.352	\N	\N	t	\N	\N	\N
cmn9jla8n000mw1vt5cr9c13t	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	desl je me suis trompé	2026-03-27 23:38:25.175	\N	\N	t	\N	\N	\N
cmn9jlrw6000qw1vtqu97jjr5	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	dcr	2026-03-27 23:38:48.055	\N	\N	t	\N	\N	\N
cmn9jlp0s000ow1vtfslh3x5z	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	ah d'accord	2026-03-27 23:38:44.332	\N	\N	t	\N	\N	\N
cmn9ksm7c00011oq66a74e87o	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	salut	2026-03-28 00:12:06.889	\N	\N	t	\N	\N	\N
cmn9kt7y500031oq6j4s9jepl	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	tu dors pas ?	2026-03-28 00:12:35.069	\N	\N	t	\N	\N	\N
cmn9kvnxo00051oq6c2mp60ll	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	non	2026-03-28 00:14:29.1	\N	\N	t	\N	\N	\N
cmn9kvxi900071oq6iez3ld0b	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	pourquoi?	2026-03-28 00:14:41.506	\N	\N	t	\N	\N	\N
cmn9kw4ko00091oq64tgj7x94	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	rien	2026-03-28 00:14:50.664	\N	\N	t	\N	\N	\N
cmn9kwcgg000b1oq6uq0qa9vi	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	dcr	2026-03-28 00:15:00.88	\N	\N	t	\N	\N	\N
cmn9l2pao00011072jsiovut4	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salut	2026-03-28 00:19:57.456	\N	\N	t	\N	\N	\N
cmn9l2ydb00031072m855u5sx	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	tu fais quoi la ?	2026-03-28 00:20:09.215	\N	\N	t	\N	\N	\N
cmn9l30et00051072rw4h6dnk	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	rien	2026-03-28 00:20:11.861	\N	\N	t	\N	\N	\N
cmn9l33ur000710727iyu96kv	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	ah dcr	2026-03-28 00:20:16.324	\N	\N	t	\N	\N	\N
cmn9l36yv00091072o2cx622d	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	\N	2026-03-28 00:20:20.36	TDR-TableauDevenement.docx	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774657220352.docx	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	46280	\N
cmnedm3dt000fm1twl4p33z7b	cmmo3svdj0001p1npkybbwako	cmmo3suxw0000p1np0eron6et	\N	2026-03-31 08:49:56.13	png-transparent-prisma-hd-logo.png	/uploads/direct-messages/dm_cmmo3svdj0001p1npkybbwako_1774946996122.png	t	image/png	8056	\N
cmn9l43r4000b1072f0gmkwiy	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	dcr	2026-03-28 00:21:02.848	\N	\N	t	\N	\N	\N
cmnedp45y000jm1twe38p73t8	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	et pour le document	2026-03-31 08:52:17.111	\N	\N	t	\N	\N	\N
cmnedpiee000nm1tw9mp1oj44	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	bien recu	2026-03-31 08:52:35.558	\N	\N	t	\N	\N	\N
cmnedp8su000lm1twnprzt40z	cmmo3svdj0001p1npkybbwako	cmmo3suxw0000p1np0eron6et	\N	2026-03-31 08:52:23.118	developpeur_full_stack_sprinb_boot.pdf	/uploads/direct-messages/dm_cmmo3svdj0001p1npkybbwako_1774947143066.pdf	t	application/pdf	4265478	\N
cmn9l4vv8000j1072t3yiefyo	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	boy demal teud	2026-03-28 00:21:39.284	\N	\N	t	\N	\N	\N
cmn9l50wj000l1072znxa73we	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	dcr	2026-03-28 00:21:45.811	\N	\N	t	\N	\N	cmn9l4vv8000j1072t3yiefyo
cmnei1l1q0005g59nsxpzxfl4	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	salut	2026-03-31 10:53:57.326	\N	\N	f	\N	\N	\N
cmnei4a0y0007g59nkgvswhd2	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	salut	2026-03-31 10:56:03.01	\N	\N	f	\N	\N	\N
cmnbtr2um000b3448kpqu50rz	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salam	2026-03-29 13:58:24.046	\N	\N	t	\N	\N	\N
cmnei7tkm0009g59nph0bsm6b	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	\N	2026-03-31 10:58:48.31	Git-logo.svg.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774954728288.png	f	image/png	33170	\N
cmnbtreue000d3448j3zcyh6k	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	tu vas bien	2026-03-29 13:58:39.59	\N	\N	t	\N	\N	\N
cmnei7tks000bg59ng0cxk2h1	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	\N	2026-03-31 10:58:48.316	1702883458156.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774954728303.png	f	image/png	15869	\N
cmnbtrto2000f34489mqiw4ai	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	oui ca va	2026-03-29 13:58:58.802	\N	\N	t	\N	\N	\N
cmnbts0ov000h34487q71g2ws	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	c quoi le souci	2026-03-29 13:59:07.904	\N	\N	t	\N	\N	\N
cmnei7tks000dg59n2u34mwl4	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	\N	2026-03-31 10:58:48.316	1718341193276.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774954728305.png	f	image/png	38755	\N
cmnbtsedj000j34486gt3x85n	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	je sais pas dit le moi	2026-03-29 13:59:25.639	\N	\N	t	\N	\N	\N
cmnei7tks000fg59nego2afd5	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	\N	2026-03-31 10:58:48.317	Ionic-logo-landscape.svg.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774954728307.png	f	image/png	35904	\N
cmnei7tkt000hg59ncv819b35	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	\N	2026-03-31 10:58:48.317	laravel.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774954728308.png	f	image/png	4504	\N
cmnebs1zd00074cq11kdeajwa	cmmot9cwj00008jo77uui1yor	cmmo3swhb0004p1npbgv6f66x	Salam bro	2026-03-31 07:58:35.018	\N	\N	t	\N	\N	\N
cmnejo5a7000zg36ggtef4wkn	cmmot9cwj00008jo77uui1yor	cmmo3svr60002p1npg39ix3rb	saaaa	2026-03-31 11:39:29.599	\N	\N	t	\N	\N	\N
cmnebsi9l000b4cq1l3rn5fx0	cmmot9cwj00008jo77uui1yor	cmmo3swhb0004p1npbgv6f66x	Oui c ava	2026-03-31 07:58:56.122	\N	\N	t	\N	\N	cmnebsai600094cq17rrfc9s4
cmnebsai600094cq17rrfc9s4	cmmo3swhb0004p1npbgv6f66x	cmmot9cwj00008jo77uui1yor	ca av tu vas bien	2026-03-31 07:58:46.063	\N	\N	t	\N	\N	\N
cmnebolx400014cq1vnu5eagg	cmmo3swhb0004p1npbgv6f66x	cmmo3suxw0000p1np0eron6et	salam	2026-03-31 07:55:54.233	\N	\N	t	\N	\N	\N
cmneded6x0001m1twh1aagyoc	cmmo3suxw0000p1np0eron6et	cmmo3swhb0004p1npbgv6f66x	salam bro	2026-03-31 08:43:55.593	\N	\N	f	\N	\N	\N
cmn9if5sh0003w1vtcnjxblfk	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	tuvas bien	2026-03-27 23:05:39.857	\N	\N	t	\N	\N	\N
cmnbtqbkd000534489bbn1plx	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	Salam	2026-03-29 13:57:48.686	\N	\N	t	\N	\N	\N
cmnedemz20003m1twixfns3f4	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	salut fils	2026-03-31 08:44:08.27	\N	\N	t	\N	\N	\N
cmnedex0z0007m1twgzh5ae7z	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	ca va tu vas bien	2026-03-31 08:44:21.299	\N	\N	t	\N	\N	\N
cmnema4dh0013o5vbku33yj3j	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salam	2026-03-31 12:52:34.085	\N	\N	t	\N	\N	\N
cmnedeswf0005m1twsp7y17yq	cmmo3svdj0001p1npkybbwako	cmmo3suxw0000p1np0eron6et	salu bro	2026-03-31 08:44:15.951	\N	\N	t	\N	\N	\N
cmnedf1b80009m1twb20b6tnb	cmmo3svdj0001p1npkybbwako	cmmo3suxw0000p1np0eron6et	oui c ava	2026-03-31 08:44:26.852	\N	\N	t	\N	\N	\N
cmnedf5h5000bm1twsp2t5qeq	cmmo3svdj0001p1npkybbwako	cmmo3suxw0000p1np0eron6et	ah super alors	2026-03-31 08:44:32.249	\N	\N	t	\N	\N	\N
cmnemapip0015o5vbiq9cu4jy	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	salut	2026-03-31 12:53:01.489	\N	\N	t	\N	\N	\N
cmnedlv1r000dm1tws8nvhgj3	cmmo3suxw0000p1np0eron6et	cmmo3svdj0001p1npkybbwako	bro envoie moi le fiche svp	2026-03-31 08:49:45.327	\N	\N	t	\N	\N	\N
cmnembi5k0017o5vbrwd0poh8	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	C AV A	2026-03-31 12:53:38.6	\N	\N	t	\N	\N	\N
cmnemc09y001ho5vbkxjy2ide	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	salut bro	2026-03-31 12:54:02.087	\N	\N	f	\N	\N	\N
cmnembnc90019o5vbf1woh9ey	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 12:53:45.322	ECX-1909_Hero_MySQL_600x400@2x-1.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774961625287.png	t	image/png	115867	\N
cmnembncf001bo5vbiuv6q9vc	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 12:53:45.328	postgresql-logo.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774961625318.png	t	image/png	34309	\N
cmnembs2w001do5vbndeh8f5a	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	REGARDE CA	2026-03-31 12:53:51.464	\N	\N	t	\N	\N	\N
cmnembw1m001fo5vb4mmo9q6p	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	j'ai vu	2026-03-31 12:53:56.602	\N	\N	t	\N	\N	cmnembncf001bo5vbiuv6q9vc
cmnemqvlr002co5vbemqg3sxu	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	salam	2026-03-31 13:05:35.871	\N	\N	t	\N	\N	\N
cmnemr2qw002eo5vbmebkq217	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salt	2026-03-31 13:05:45.128	\N	\N	t	\N	\N	\N
cmnemspij0034o5vbz43evmb3	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	booyyyyyyyyyyyyyyyyyyyyyyy	2026-03-31 13:07:01.292	\N	\N	t	\N	\N	\N
cmnemrday002mo5vbp1dv2t4f	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	ah super ca	2026-03-31 13:05:58.811	\N	\N	t	\N	\N	\N
cmnemr9ai002go5vb72c3vzcd	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 13:05:53.611	laravel.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774962353605.png	t	image/png	4504	\N
cmnemr9aj002io5vbhriyokz1	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 13:05:53.611	Ionic-logo-landscape.svg.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774962353604.png	t	image/png	35904	\N
cmnemr9aj002ko5vby95ejci9	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 13:05:53.611	odoo.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774962353607.png	t	image/png	6119	\N
cmnemrllh002oo5vbwpbnee34	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	dcr alors	2026-03-31 13:06:09.557	\N	\N	t	\N	\N	cmnemrday002mo5vbp1dv2t4f
cmnemyv1y0001hnm8lc6p7ev5	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	ah dcr	2026-03-31 13:11:48.406	\N	\N	t	\N	\N	cmnemrllh002oo5vbwpbnee34
cmnemz89j0003hnm85gag1qtv	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	ssss	2026-03-31 13:12:05.528	\N	\N	t	\N	\N	\N
cmnenl96j000zhnm8xn5r4kzs	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	dcr supprimer moi tes message la	2026-03-31 13:29:13.148	\N	\N	t	\N	\N	\N
cmnenlbxf0011hnm8nla123tk	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	okay	2026-03-31 13:29:16.707	\N	\N	t	\N	\N	\N
cmnenli910013hnm8s7sablo3	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	dcr	2026-03-31 13:29:24.902	\N	\N	t	\N	\N	\N
cmn9ito0d0009w1vtkxh0hviq	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	\N	2026-03-27 23:16:56.654	developpeur_full_stack_sprinb_boot.pdf	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774653416600.pdf	t	application/pdf	4265478	\N
cmn9fu1od000lue5fdq4sqpoo	cmmot9cwj00008jo77uui1yor	cmmo3sw3o0003p1nppenw0vmn	ca va	2026-03-27 21:53:15.517	\N	\N	t	\N	\N	\N
cmn9jl15p000kw1vto75hobv1	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	salut	2026-03-27 23:38:13.406	\N	\N	t	\N	\N	\N
cmolho4j20005a350udb3exuc	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	ah dcr	2026-04-30 12:57:34.958	\N	\N	t	\N	\N	\N
cmolw4orx001840r4t3jmlh1n	cmmo3suxw0000p1np0eron6et	cmmo3swu20005p1nphypodze0	salut	2026-04-30 19:42:22.317	\N	\N	f	\N	\N	\N
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
cmnejiwk60006g36grbnflpvb	cmnejiwiz0005g36gejdoihiw	cmmot9cwj00008jo77uui1yor	2026-03-31 11:35:25.014
cmnejiwk60007g36guifehduz	cmnejiwiz0005g36gejdoihiw	cmmo3svr60002p1npg39ix3rb	2026-03-31 11:35:25.014
cmnemop67001qo5vb049esku4	cmnejiwiz0005g36gejdoihiw	cmmo3suxw0000p1np0eron6et	2026-03-31 13:03:54.223
cmolxu5dg0004hjp6w7x1dvr7	cmolxu5cx0003hjp6i2b5tv2b	cmolxu5bz0001hjp688nfthe4	2026-04-30 20:30:09.845
\.


--
-- Data for Name: DirectionMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DirectionMessage" (id, "directionId", "senderId", body, "createdAt", "fileName", "fileUrl", "mimeType", size, "parentId") FROM stdin;
cmnejj376000hg36gnuqsa9s4	cmn9jawvp000aw1vtj8tfmc3y	cmmot9cwj00008jo77uui1yor	salam tout le monde	2026-03-31 11:35:33.619	\N	\N	\N	\N	\N
cmnejmu3b000rg36gms4owrsq	cmn9jawvp000aw1vtj8tfmc3y	cmmot9cwj00008jo77uui1yor	saaaa	2026-03-31 11:38:28.44	\N	\N	\N	\N	\N
cmnejmycf000xg36gf8wnkni4	cmn9jawvp000aw1vtj8tfmc3y	cmmot9cwj00008jo77uui1yor	sssss	2026-03-31 11:38:33.951	\N	\N	\N	\N	\N
cmnejr82y00058c5uz9b77azv	cmn9jawvp000aw1vtj8tfmc3y	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 11:41:53.194	1718341193276.png	/uploads/direction-messages/dir_cmmot9cwj00008jo77uui1yor_1774957313109.png	image/png	38755	\N
cmnejr84h000b8c5u052r5g1u	cmn9jawvp000aw1vtj8tfmc3y	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 11:41:53.25	Git-logo.svg.png	/uploads/direction-messages/dir_cmmot9cwj00008jo77uui1yor_1774957313098.png	image/png	33170	\N
cmnejr871000h8c5um8i7omhj	cmn9jawvp000aw1vtj8tfmc3y	cmmot9cwj00008jo77uui1yor	\N	2026-03-31 11:41:53.341	1702883458156.png	/uploads/direction-messages/dir_cmmot9cwj00008jo77uui1yor_1774957313106.png	image/png	15869	\N
cmnejuhxs001d8c5u9dsillwi	cmn9jawvp000aw1vtj8tfmc3y	cmmo3svr60002p1npg39ix3rb	salut	2026-03-31 11:44:25.937	\N	\N	\N	\N	\N
cmnem3vop000ho5vbcuh0ss3y	cmn9jawvp000aw1vtj8tfmc3y	cmmo3svr60002p1npg39ix3rb	salut	2026-03-31 12:47:42.89	\N	\N	\N	\N	\N
cmnemrt0a002vo5vbi6a3afea	cmn9jawvp000aw1vtj8tfmc3y	cmmo3suxw0000p1np0eron6et	salam a tous	2026-03-31 13:06:19.162	\N	\N	\N	\N	\N
cmnems3uv0032o5vb0ikms3en	cmn9jawvp000aw1vtj8tfmc3y	cmmot9cwj00008jo77uui1yor	salam bro	2026-03-31 13:06:33.224	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Invitation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invitation" (id, "meetingId", "userId", status, "sentAt", "respondedAt", "createdAt") FROM stdin;
cmmo4sswp0007lvr275p95fxo	cmmo4sswp0005lvr2qs2c0fi5	cmmo3sxn00007p1npldvr5svn	PENDING	2026-03-13 00:04:20.245	\N	2026-03-13 00:01:12.025
cmn9k09l20004lcns8356sx8o	cmn9k09l20001lcns7xwbirzb	cmmo3svdj0001p1npkybbwako	ACCEPTED	2026-03-27 23:50:46.804	2026-03-31 09:14:14.649	2026-03-27 23:50:04.166
cmmo4sswp0009lvr29wi5iaj0	cmmo4sswp0005lvr2qs2c0fi5	cmmo3swu20005p1nphypodze0	PENDING	2026-03-13 00:04:20.245	\N	2026-03-13 00:01:12.025
cmmo4sswp000alvr2tmfsxwxl	cmmo4sswp0005lvr2qs2c0fi5	cmmo3swhb0004p1npbgv6f66x	PENDING	2026-03-13 00:04:20.245	\N	2026-03-13 00:01:12.025
cmmo4sswp0008lvr2qzpzfxip	cmmo4sswp0005lvr2qs2c0fi5	cmmo3sxa90006p1npcmnoc8dt	ACCEPTED	2026-03-13 00:04:20.245	2026-03-13 00:04:24.116	2026-03-13 00:01:12.025
cmmoo5ti70000wlvxmcagaw6r	cmmonyxrn00012h1eb9y2mh4y	cmmo3svdj0001p1npkybbwako	PENDING	\N	\N	2026-03-13 09:03:12.032
cmmp01rza000bxnvoc2frxuq2	cmmp01rza0009xnvoupogf5ih	cmmo3svr60002p1npg39ix3rb	PENDING	2026-03-13 14:36:21.913	\N	2026-03-13 14:35:58.822
cmmp01rza000dxnvop1r4sxej	cmmp01rza0009xnvoupogf5ih	cmmo3svdj0001p1npkybbwako	PENDING	2026-03-13 14:36:21.913	\N	2026-03-13 14:35:58.822
cmmp01rza000exnvoysjrnx2q	cmmp01rza0009xnvoupogf5ih	cmmo3sw3o0003p1nppenw0vmn	PENDING	2026-03-13 14:36:21.913	\N	2026-03-13 14:35:58.822
cmmp01rza000cxnvo7z7tbb2a	cmmp01rza0009xnvoupogf5ih	cmmot9cwj00008jo77uui1yor	ACCEPTED	2026-03-13 14:36:21.913	2026-03-13 14:39:40.713	2026-03-13 14:35:58.822
cmmtb872p000f6z3zsbtgpgb0	cmmtb872p000d6z3zuc4zios4	cmmo3svr60002p1npg39ix3rb	PENDING	2026-03-16 15:01:09.554	\N	2026-03-16 14:59:58.801
cmmtb872p000g6z3zhcwnn26t	cmmtb872p000d6z3zuc4zios4	cmmo3svdj0001p1npkybbwako	PENDING	2026-03-16 15:01:09.554	\N	2026-03-16 14:59:58.801
cmmtb872p000h6z3zzbk4gjtd	cmmtb872p000d6z3zuc4zios4	cmmot9cwj00008jo77uui1yor	PENDING	2026-03-16 15:01:09.554	\N	2026-03-16 14:59:58.801
cmmtb872p000i6z3z1zeupca0	cmmtb872p000d6z3zuc4zios4	cmmo3sw3o0003p1nppenw0vmn	PENDING	2026-03-16 15:01:09.554	\N	2026-03-16 14:59:58.801
cmmw3ypk4000bez94hbvmotjc	cmmw3ypk40009ez94hsy51nu9	cmmot9cwj00008jo77uui1yor	PENDING	2026-03-18 14:00:16.366	\N	2026-03-18 13:59:57.413
cmmo4sswp000blvr2tavw82sx	cmmo4sswp0005lvr2qs2c0fi5	cmmo3sw3o0003p1nppenw0vmn	ACCEPTED	2026-03-13 00:04:20.245	2026-03-26 12:49:09.364	2026-03-13 00:01:12.025
cmmoo5ti70001wlvx40y58hhu	cmmonyxrn00012h1eb9y2mh4y	cmmo3sw3o0003p1nppenw0vmn	ACCEPTED	\N	2026-03-26 13:06:02.987	2026-03-13 09:03:12.032
cmn7lpoxn000446tua0eno2n9	cmn7lpoxm000146tuwhf71n06	cmmo3swhb0004p1npbgv6f66x	PENDING	2026-03-26 15:03:24.299	\N	2026-03-26 15:02:17.723
cmn7lpoxn000346tucb44ev4f	cmn7lpoxm000146tuwhf71n06	cmmo3sw3o0003p1nppenw0vmn	ACCEPTED	2026-03-26 15:03:24.299	2026-03-26 15:05:53.638	2026-03-26 15:02:17.723
cmn7okub8000a136nkabl9teo	cmmo3x0vv000325fvzt6a05on	cmmot9cwj00008jo77uui1yor	ACCEPTED	\N	2026-03-26 16:22:57.073	2026-03-26 16:22:30.26
cmn7gsvqw000c130kg6e4uova	cmn7gsvqw0009130kj9dnmxy2	cmmot9cwj00008jo77uui1yor	ACCEPTED	2026-03-26 12:45:12.051	2026-03-27 21:54:33.779	2026-03-26 12:44:48.44
cmn9k09l20005lcnswa851mre	cmn9k09l20001lcns7xwbirzb	cmmo3sw3o0003p1nppenw0vmn	PENDING	2026-03-27 23:50:46.804	\N	2026-03-27 23:50:04.166
cmn9k09l20003lcns8jzx20iv	cmn9k09l20001lcns7xwbirzb	cmmot9cwj00008jo77uui1yor	ACCEPTED	2026-03-27 23:50:46.804	2026-03-27 23:51:35.436	2026-03-27 23:50:04.166
cmomwhv78000vaov9c97lpttz	cmomwhv78000taov95p97cwo9	cmmo3sw3o0003p1nppenw0vmn	PENDING	2026-05-01 12:47:45.443	\N	2026-05-01 12:40:23.348
cmnebd7h4000wf1uibh5rmy8t	cmnebd7h4000uf1uiepw78wty	cmmo3swhb0004p1npbgv6f66x	ACCEPTED	2026-03-31 07:47:53.596	2026-03-31 07:50:55.939	2026-03-31 07:47:02.296
cmn7gsvqw000b130ky9zogokj	cmn7gsvqw0009130kj9dnmxy2	cmmo3svdj0001p1npkybbwako	ACCEPTED	2026-03-26 12:45:12.051	2026-03-31 09:03:40.559	2026-03-26 12:44:48.44
cmomwhv78000waov96hvl7dv1	cmomwhv78000taov95p97cwo9	cmmo3swhb0004p1npbgv6f66x	PENDING	2026-05-01 12:47:45.443	\N	2026-05-01 12:40:23.348
cmomwhv78000xaov9itnn75ak	cmomwhv78000taov95p97cwo9	cmmo3swu20005p1nphypodze0	PENDING	2026-05-01 12:47:45.443	\N	2026-05-01 12:40:23.348
cmomwhv78000yaov9pme1hf41	cmomwhv78000taov95p97cwo9	cmmo3sxa90006p1npcmnoc8dt	PENDING	2026-05-01 12:47:45.443	\N	2026-05-01 12:40:23.348
cmomwhv78000zaov9n0iuxiwd	cmomwhv78000taov95p97cwo9	cmmo3sxn00007p1npldvr5svn	PENDING	2026-05-01 12:47:45.443	\N	2026-05-01 12:40:23.348
\.


--
-- Data for Name: Meeting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Meeting" (id, title, agenda, "organizerId", "roomId", "startTime", "endTime", status, "orderOfDay", attachments, "createdAt", "updatedAt", "meetingLink", "directionId", "projectId") FROM stdin;
cmn9k09l20001lcns7xwbirzb	DEMARRAGE PROJET	TESTE PROJET	cmmo3suxw0000p1np0eron6et	cmmp046d8000txnvof8s2ztet	2026-04-10 00:00:00	2026-04-30 00:00:00	COMPLETED	\N	\N	2026-03-27 23:50:04.166	2026-04-30 07:00:00.078	\N	cmn9jawvp000aw1vtj8tfmc3y	cmn9jtuw6000tw1vtec7ayogn
cmomwhv78000taov95p97cwo9	Presentation Projet	Projet : GP	cmolxu5bz0001hjp688nfthe4	cmmo3sxne000ap1npvo2sif1m	2026-05-01 10:00:00.1	2026-05-02 16:00:00.1	SENT	\N	\N	2026-05-01 12:40:23.348	2026-05-01 12:47:45.445	\N	cmolxghax0000rw4yt5k984kg	cmn9jtuw6000tw1vtec7ayogn
cmmo44zkc000f25fvcxaavyfo	TESTE	YUP	cmmo3sxa90006p1npcmnoc8dt	cmmo3sxnf000bp1npckr3dy00	2026-03-12 12:00:00	2026-03-12 19:00:00	CANCELLED	\N	\N	2026-03-12 23:42:40.909	2026-03-13 00:04:16.498	\N	\N	\N
cmn7lpoxm000146tuwhf71n06	TEST CONFLIT	TEST CONFLIT	cmmo3suxw0000p1np0eron6et	cmmo3sxnc0009p1npornnr929	2026-03-27 13:00:00	2026-03-27 13:30:00	CANCELLED	\N	\N	2026-03-26 15:02:17.723	2026-03-26 15:07:02.626	\N	\N	\N
cmnebd7h4000uf1uiepw78wty	Premier reunion	DEMARRAGE	cmmot9cwj00008jo77uui1yor	cmmo3sxnf000bp1npckr3dy00	2026-03-31 08:00:00	2026-04-01 20:00:00	COMPLETED	\N	\N	2026-03-31 07:47:02.296	2026-03-31 07:59:37.55	\N	cmn9jawvp000aw1vtj8tfmc3y	cmn9jtuw6000tw1vtec7ayogn
cmmo4sswp0005lvr2qs2c0fi5	TEST TETSE	TESTETE	cmmo3suxw0000p1np0eron6et	cmmo3sxne000ap1npvo2sif1m	2026-03-12 20:00:00	2026-03-12 23:58:00	COMPLETED	\N	\N	2026-03-13 00:01:12.025	2026-03-31 08:10:00.042	\N	\N	\N
cmmonyxrn00012h1eb9y2mh4y	TEST 	ON TESTE LE CAENDRIER	cmmo3svr60002p1npg39ix3rb	cmmo3sxne000ap1npvo2sif1m	2026-03-13 08:00:00	2026-03-13 10:00:00	COMPLETED	\N	\N	2026-03-13 08:57:50.963	2026-03-31 08:10:00.042	\N	\N	\N
cmmp01rza0009xnvoupogf5ih	TESTETE A	TESTET PRO	cmmo3suxw0000p1np0eron6et	cmmo3sxne000ap1npvo2sif1m	2026-03-13 00:00:00	2026-03-13 03:00:00	COMPLETED	\N	\N	2026-03-13 14:35:58.822	2026-03-31 08:10:00.042	\N	\N	\N
cmmtb872p000d6z3zuc4zios4	TEST	TEST	cmmo3sxa90006p1npcmnoc8dt	cmmo3sxne000ap1npvo2sif1m	2026-03-16 09:00:00	2026-03-16 20:00:00	COMPLETED	\N	\N	2026-03-16 14:59:58.801	2026-03-31 08:10:00.042	\N	\N	\N
cmmw3ypk40009ez94hsy51nu9	TEST MERCREDI	TEST DE L'APPLICation	cmmo3suxw0000p1np0eron6et	cmmo3sxnf000bp1npckr3dy00	2026-03-18 17:00:00	2026-03-18 20:00:00	COMPLETED	\N	\N	2026-03-18 13:59:57.413	2026-03-31 08:10:00.042	\N	\N	\N
cmmo3x0vv000325fvzt6a05on	MEET DEV	DEVELOPPMENT	cmmo3sw3o0003p1nppenw0vmn	cmmo3sxnf000bp1npckr3dy00	2026-03-12 08:00:00	2026-03-12 10:00:00	COMPLETED	\N	\N	2026-03-12 23:36:29.372	2026-03-31 08:10:00.042	https://meet.google.com/ecm-dvoo-ehw	\N	\N
cmn7gsvqw0009130kj9dnmxy2	TEST	TEST FICHIER	cmmo3suxw0000p1np0eron6et	cmmo3sxnf000bp1npckr3dy00	2026-03-26 16:00:00	2026-03-31 09:47:11.794	COMPLETED	\N	\N	2026-03-26 12:44:48.44	2026-03-31 09:50:00.045	\N	\N	\N
\.


--
-- Data for Name: MeetingFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MeetingFile" (id, "meetingId", "uploadedById", kind, "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
cmn7luv8a000k46tu00yz2kvf	cmn7lpoxm000146tuwhf71n06	cmmo3suxw0000p1np0eron6et	DOCUMENT	RÃ©sumÃ© exÃ©cutif.pdf	/uploads/meetings/cmn7lpoxm000146tuwhf71n06_1774537579142.pdf	application/pdf	72578	2026-03-26 15:06:19.162
cmn9k3p3j000rlcnsoywayhep	cmn9k09l20001lcns7xwbirzb	cmmot9cwj00008jo77uui1yor	IMAGE	Design sans titre (1).png	/uploads/meetings/cmn9k09l20001lcns7xwbirzb_1774655564210.png	image/png	1415220	2026-03-27 23:52:44.24
cmnebk41c001if1uii0wiw4tf	cmnebd7h4000uf1uiepw78wty	cmmo3swhb0004p1npbgv6f66x	IMAGE	gp-64 (Site Web).png	/uploads/meetings/cmnebd7h4000uf1uiepw78wty_1774943544416.png	image/png	1098438	2026-03-31 07:52:24.432
\.


--
-- Data for Name: MeetingMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MeetingMessage" (id, "meetingId", "senderId", body, "createdAt", "parentId") FROM stdin;
cmn7masuc0001cfqf0i6oi1p2	cmmtb872p000d6z3zuc4zios4	cmmo3sw3o0003p1nppenw0vmn	sa	2026-03-26 15:18:42.534	\N
cmn7mcgpz0003cfqfgjax5y3t	cmmtb872p000d6z3zuc4zios4	cmmo3sw3o0003p1nppenw0vmn	ddddddd	2026-03-26 15:20:00.167	\N
cmn7mfn6h00017a2wcn3ksj8i	cmmo4sswp0005lvr2qs2c0fi5	cmmo3sw3o0003p1nppenw0vmn	salam a tout	2026-03-26 15:22:28.506	\N
cmn7mgg3100037a2wfqrb61ho	cmmo4sswp0005lvr2qs2c0fi5	cmmo3suxw0000p1np0eron6et	salut ca va	2026-03-26 15:23:05.965	\N
cmn7mhcsz00057a2w3rl7fw3u	cmmo4sswp0005lvr2qs2c0fi5	cmmo3suxw0000p1np0eron6et	ca va toi	2026-03-26 15:23:48.372	cmn7mfn6h00017a2wcn3ksj8i
cmn7mkkmi00077a2weyx5bcdk	cmmo4sswp0005lvr2qs2c0fi5	cmmo3sw3o0003p1nppenw0vmn	hum	2026-03-26 15:26:18.475	\N
cmn7n3hjj0001utsf74jo10td	cmmo4sswp0005lvr2qs2c0fi5	cmmo3suxw0000p1np0eron6et	Bonjour,\nLes flux d’intégration entre nos systèmes et l’API CCBM SHOP, ainsi que les différentes étapes du traitement des commandes, ont été ajoutés.\nMerci de bien vouloir y jeter un œil et de me faire part de vos retours si nécessaire.	2026-03-26 15:41:00.943	\N
cmn7n3uzr0003utsf7slft6yt	cmmo4sswp0005lvr2qs2c0fi5	cmmo3suxw0000p1np0eron6et	c'est vrai	2026-03-26 15:41:18.376	cmn7n3hjj0001utsf74jo10td
cmn7oo5e30001rfkd6nb4oofn	cmmo3x0vv000325fvzt6a05on	cmmo3sw3o0003p1nppenw0vmn	saaaa	2026-03-26 16:25:04.587	\N
cmn7p7p2i0001hta1t8ic78j6	cmmo3x0vv000325fvzt6a05on	cmmo3sw3o0003p1nppenw0vmn	saaa	2026-03-26 16:40:16.555	\N
cmn8uzlil000bhgyfh5l7uthi	cmn7gsvqw0009130kj9dnmxy2	cmmo3suxw0000p1np0eron6et	Bonjour à tous	2026-03-27 12:09:42.573	\N
cmn8uzrc8000dhgyfxse4ngmy	cmn7gsvqw0009130kj9dnmxy2	cmmo3suxw0000p1np0eron6et	salut	2026-03-27 12:09:50.12	cmn8uzlil000bhgyfh5l7uthi
cmn9jemj6000cw1vt98kaxqfn	cmmo3x0vv000325fvzt6a05on	cmmo3suxw0000p1np0eron6et	slaut	2026-03-27 23:33:14.514	\N
cmn9k1c6f000jlcns0br2mrkr	cmn9k09l20001lcns7xwbirzb	cmmo3suxw0000p1np0eron6et	salut	2026-03-27 23:50:54.183	\N
cmn9k2crp000nlcnszdqn7euc	cmn9k09l20001lcns7xwbirzb	cmmot9cwj00008jo77uui1yor	salam frere	2026-03-27 23:51:41.605	\N
cmn9k341r000plcns6zam0scy	cmn9k09l20001lcns7xwbirzb	cmmo3suxw0000p1np0eron6et	nakamou	2026-03-27 23:52:16.959	\N
cmnebik8d001ef1uirk4c1kk3	cmnebd7h4000uf1uiepw78wty	cmmo3swhb0004p1npbgv6f66x	salam a tous	2026-03-31 07:51:12.109	\N
cmnebirhv001gf1uilfksa6b2	cmnebd7h4000uf1uiepw78wty	cmmot9cwj00008jo77uui1yor	Salut	2026-03-31 07:51:21.523	cmnebik8d001ef1uirk4c1kk3
cmneehhyu000xm1twq3vhl0pk	cmn9k09l20001lcns7xwbirzb	cmmo3svdj0001p1npkybbwako	salam a tous	2026-03-31 09:14:21.367	\N
\.


--
-- Data for Name: Mission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Mission" (id, title, description, location, "startTime", "endTime", "createdById", status, "createdAt", "updatedAt", "directionId", "projectId") FROM stdin;
cmmtbdcai00126z3zlvrpy0yo	MISSION X	TEST	DAKAR	2026-03-16 09:00:00.758	2026-03-16 12:00:00.759	cmmo3sw3o0003p1nppenw0vmn	CONFIRMED	2026-03-16 15:03:58.842	2026-03-16 15:03:58.842	\N	\N
cmmw40fsc000lez94blp2404f	MISSION X	TEST MISSION	DAKAR	2026-03-18 09:00:00.4	2026-03-19 15:00:00.4	cmmo3suxw0000p1np0eron6et	CONFIRMED	2026-03-18 14:01:18.06	2026-03-18 14:03:56.075	\N	\N
cmmqj6eu50005g3pealoydma1	ADM	Mission ADM	Saint Louis	2026-03-14 09:00:00.211	2026-04-11 12:00:00.2	cmmo3suxw0000p1np0eron6et	CANCELLED	2026-03-14 16:19:13.949	2026-03-27 23:48:37.289	\N	\N
cmneb8bqp0005f1uit2x84wvc	GESTION VENTE EN GROS	PROJET DE VENTE EN GROS EN LIGNE	DAKAR	2026-03-31 09:00:00.412	2026-03-31 12:00:00.412	cmmo3suxw0000p1np0eron6et	CONFIRMED	2026-03-31 07:43:14.545	2026-03-31 07:43:14.545	cmn9jawvp000aw1vtj8tfmc3y	cmn9jtuw6000tw1vtec7ayogn
cmolxyiiu000chjp6qhxuyqno	FORMATION IA	\N	DAKAR	2026-04-30 09:00:00.305	2026-04-30 12:00:00.305	cmolxu5bz0001hjp688nfthe4	CONFIRMED	2026-04-30 20:33:33.51	2026-04-30 20:33:33.51	\N	\N
cmomwg3er000paov9jbu1euam	1 MAI	Fête du travail	Dakar	2026-05-01 12:00:00.5	2026-05-02 12:00:00.5	cmolxu5bz0001hjp688nfthe4	CONFIRMED	2026-05-01 12:39:00.676	2026-05-01 12:39:00.676	cmolxghbf0006rw4yer944plk	\N
\.


--
-- Data for Name: MissionAssignment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MissionAssignment" (id, "missionId", "userId", "createdAt") FROM stdin;
cmmqj6ev00006g3pe380sokz0	cmmqj6eu50005g3pealoydma1	cmmo3svr60002p1npg39ix3rb	2026-03-14 16:19:13.98
cmmqj6ev00007g3pevbnvnyyj	cmmqj6eu50005g3pealoydma1	cmmot9cwj00008jo77uui1yor	2026-03-14 16:19:13.98
cmmqj6ev00008g3pemq2b3miy	cmmqj6eu50005g3pealoydma1	cmmo3svdj0001p1npkybbwako	2026-03-14 16:19:13.98
cmmtbdcbf00136z3znbveufjx	cmmtbdcai00126z3zlvrpy0yo	cmmo3swhb0004p1npbgv6f66x	2026-03-16 15:03:58.875
cmmtbdcbf00146z3zsjgdl299	cmmtbdcai00126z3zlvrpy0yo	cmmo3swu20005p1nphypodze0	2026-03-16 15:03:58.875
cmmw43tpu0015ez94r23bwmkk	cmmw40fsc000lez94blp2404f	cmmo3svr60002p1npg39ix3rb	2026-03-18 14:03:56.083
cmmw43tpu0016ez94zkaedfag	cmmw40fsc000lez94blp2404f	cmmo3svdj0001p1npkybbwako	2026-03-18 14:03:56.083
cmmw43tpu0017ez945xwxlqhh	cmmw40fsc000lez94blp2404f	cmmot9cwj00008jo77uui1yor	2026-03-18 14:03:56.083
cmneb8bqx0006f1uiww777hbl	cmneb8bqp0005f1uit2x84wvc	cmmo3svr60002p1npg39ix3rb	2026-03-31 07:43:14.554
cmneb8bqx0007f1uiuawjjgh7	cmneb8bqp0005f1uit2x84wvc	cmmo3svdj0001p1npkybbwako	2026-03-31 07:43:14.554
cmneb8bqx0008f1ui9a20l1jt	cmneb8bqp0005f1uit2x84wvc	cmmot9cwj00008jo77uui1yor	2026-03-31 07:43:14.554
cmolxyij2000dhjp6dxrrhh07	cmolxyiiu000chjp6qhxuyqno	cmmot9cwj00008jo77uui1yor	2026-04-30 20:33:33.518
\.


--
-- Data for Name: MissionFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MissionFile" (id, "missionId", "uploadedById", kind, "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
cmn7gunzl000s130kdoitnl33	cmmqj6eu50005g3pealoydma1	cmmo3suxw0000p1np0eron6et	DOCUMENT	RÃ©sumÃ© exÃ©cutif.pdf	/uploads/missions/cmmqj6eu50005g3pealoydma1_1774529171693.pdf	application/pdf	72578	2026-03-26 12:46:11.698
cmneb9d64000if1ui9w91k99a	cmneb8bqp0005f1uit2x84wvc	cmmo3suxw0000p1np0eron6et	IMAGE	gp-64 (Site Web).png	/uploads/missions/cmneb8bqp0005f1uit2x84wvc_1774943043031.png	image/png	1098438	2026-03-31 07:44:03.052
cmolxyv05000jhjp6z0hea4lc	cmolxyiiu000chjp6qhxuyqno	cmolxu5bz0001hjp688nfthe4	DOCUMENT	Repertoire_ADM_2026 (2).pdf	/uploads/missions/cmolxyiiu000chjp6qhxuyqno_1777581229621.pdf	application/pdf	41204	2026-04-30 20:33:49.685
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "userId", type, title, body, link, "isRead", "createdAt") FROM stdin;
cmmo4ur3n000nlvr28rriyzdv	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:02:42.995
cmmo4vjmz0001ak15kjgr8pkh	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:03:19.978
cmmo4w6vq0009ak15lc62lppj	cmmo3swu20005p1nphypodze0	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:03:50.102
cmmo4wb9f000bak15j2h21ecf	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:55.779
cmmo4we31000hak15yv27we7t	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:59.437
cmmo4wmux000lak15jkxd1dol	cmmo3swu20005p1nphypodze0	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:04:10.809
cmmo4wpot000nak15xa6bab2m	cmmo3swu20005p1nphypodze0	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:04:14.477
cmmo4v2pv000plvr2iwyyt7bw	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:02:58.052
cmmo4wihq000jak15ucefhtn0	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:04:05.15
cmmo4wyg6000xak15tfo9cfk1	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:04:25.83
cmmo4x1b9000zak15aufrl6il	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:04:29.542
cmmo4vv9b0003ak152rht2nip	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:35.04
cmmtbdfzu00186z3z2fgibnbw	cmmo3swu20005p1nphypodze0	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 16/03/2026 à DAKAR.	/missions/cmmtbdcai00126z3zlvrpy0yo	f	2026-03-16 15:04:03.642
cmmp0264x000mxnvov2oz2nsm	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 14:36:17.169
cmmtb9o7o000s6z3zr1so3lcj	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	t	2026-03-16 15:01:07.668
cmmqj6iyg000cg3ped7cgdjxz	cmmot9cwj00008jo77uui1yor	MISSION_CREATED	Nouvelle mission assignée	Mission « ADM » le 14/03/2026 à Saint Louis.	/missions/cmmqj6eu50005g3pealoydma1	t	2026-03-14 16:19:19.288
cmmtorz1a000vs3fmqxalfzhj	cmmot9cwj00008jo77uui1yor	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	t	2026-03-16 21:19:16.51
cmmtorz0r000ps3fmw6567ne6	cmmo3swu20005p1nphypodze0	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	f	2026-03-16 21:19:16.492
cmmtorz0w000rs3fmeb26bpql	cmmo3sxa90006p1npcmnoc8dt	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	f	2026-03-16 21:19:16.497
cmmtorz15000ts3fm84vnl8hf	cmmo3sxn00007p1npldvr5svn	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	f	2026-03-16 21:19:16.505
cmmtbddu400166z3z1sy4094n	cmmo3swhb0004p1npbgv6f66x	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 16/03/2026 à DAKAR.	/missions/cmmtbdcai00126z3zlvrpy0yo	t	2026-03-16 15:04:00.844
cmmtorz0m000ns3fmkuanz7ch	cmmo3swhb0004p1npbgv6f66x	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	t	2026-03-16 21:19:16.486
cmmoo5vgk0003wlvx7zbwec1a	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TEST 	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 09:03:14.564
cmmtb9ml9000q6z3z0qs14y9x	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	t	2026-03-16 15:01:05.565
cmmp027u7000oxnvo5xywho2q	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 14:36:19.376
cmmqj6lwn000eg3peiu00d0gg	cmmo3svdj0001p1npkybbwako	MISSION_CREATED	Nouvelle mission assignée	Mission « ADM » le 14/03/2026 à Saint Louis.	/missions/cmmqj6eu50005g3pealoydma1	t	2026-03-14 16:19:23.111
cmmqlgke500057by48eoveoh3	cmmo3svdj0001p1npkybbwako	PLANNING_SUBMITTED	Nouveau planning soumis	undefined a soumis son planning	/plannings/cmmqlgapx00017by4wcyj9dyp	t	2026-03-14 17:23:06.941
cmmw40j8t000sez94al33x7eb	cmmo3svdj0001p1npkybbwako	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 19/03/2026 à DAKAR.	/missions/cmmw40fsc000lez94blp2404f	t	2026-03-18 14:01:22.541
cmmtb9kuc000o6z3zukz37h6m	cmmo3svr60002p1npg39ix3rb	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	t	2026-03-16 15:01:03.3
cmmp023q0000kxnvoyvmyu6if	cmmo3svr60002p1npg39ix3rb	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 14:36:14.04
cmmqj6hh3000ag3pe5hgyx4w9	cmmo3svr60002p1npg39ix3rb	MISSION_CREATED	Nouvelle mission assignée	Mission « ADM » le 14/03/2026 à Saint Louis.	/missions/cmmqj6eu50005g3pealoydma1	t	2026-03-14 16:19:17.367
cmmtnejw40007s3fmp303ww6t	cmmo3svr60002p1npg39ix3rb	PLANNING_SUBMITTED	Planning en attente de validation	Un planning est prêt pour validation	/plannings/cmmqlgapx00017by4wcyj9dyp	t	2026-03-16 20:40:50.74
cmmw40hpy000qez942ir9ueig	cmmo3svr60002p1npg39ix3rb	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 19/03/2026 à DAKAR.	/missions/cmmw40fsc000lez94blp2404f	t	2026-03-18 14:01:20.565
cmmo4wu4z000rak15h45mh4ji	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:04:20.244
cmmo4w2gq0007ak15eb8pvdw1	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:44.378
cmmo4vznc0005ak15neh6ue72	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:40.727
cmn7gyh2z001e130ko40gkt3y	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST TETSE"	/meetings	t	2026-03-26 12:49:09.372
cmn7lubjl000i46tud80coqqd	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST CONFLIT"	/meetings	t	2026-03-26 15:05:53.65
cmn9fvq3t000rue5fpg6yokf4	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de alhusseinkhouma0@gmail.com	alhusseinkhouma0@gmail.com (alhusseinkhouma0@gmail.com) a accepté votre réunion "TEST"	/meetings/cmn7gsvqw0009130kj9dnmxy2	t	2026-03-27 21:54:33.833
cmmqlgket00077by4j7d0v9qy	cmmot9cwj00008jo77uui1yor	PLANNING_SUBMITTED	Planning soumis	Votre planning a été soumis avec succès et est en attente de consolidation	/plannings/cmmqlgapx00017by4wcyj9dyp	t	2026-03-14 17:23:06.965
cmmtnest6000bs3fm0dikmvz1	cmmot9cwj00008jo77uui1yor	PLANNING_VALIDATED	Planning validé	Votre planning a été validé par le Directeur Général	/plannings/cmmqlgapx00017by4wcyj9dyp	t	2026-03-16 20:41:02.298
cmmw3z45q000hez94k51ig7zw	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : TEST MERCREDI	Vous êtes convoqué(e) le 18/03/2026	/meetings	t	2026-03-18 14:00:16.334
cmmw40l86000uez94at9g07jf	cmmot9cwj00008jo77uui1yor	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 19/03/2026 à DAKAR.	/missions/cmmw40fsc000lez94blp2404f	t	2026-03-18 14:01:25.111
cmmw43hl90012ez948dlf5fxy	cmmot9cwj00008jo77uui1yor	MEETING_SCHEDULE_UPDATED	Modification : TEST MERCREDI	L'horaire ou le lieu de la réunion "TEST MERCREDI" a été modifié.	/meetings/cmmw3ypk40009ez94hsy51nu9	t	2026-03-18 14:03:40.365
cmmw440qf001dez94idw1c8zi	cmmot9cwj00008jo77uui1yor	MISSION_UPDATED	Mission modifiée	La mission « MISSION X » a été modifiée. Lieu : DAKAR.	/missions/cmmw40fsc000lez94blp2404f	t	2026-03-18 14:04:05.176
cmn7gtdyn000k130k05zqbkzs	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 26/03/2026	/meetings	t	2026-03-26 12:45:12.047
cmn7okvt1000c136ng7gtuj3p	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : MEET DEV	Vous êtes convoqué(e) le 12/03/2026 (Visio disponible)	/meetings	t	2026-03-26 16:22:32.198
cmn7ojf1o0005136n1dmli10x	cmmot9cwj00008jo77uui1yor	PLANNING_SUBMITTED	Planning soumis	Votre planning a été soumis par l'administration et est en attente de consolidation.	/plannings/cmmqm1hqj0001h5j2vd8wdbam	t	2026-03-26 16:21:23.821
cmmw44wrw001lez94kta1llrl	cmmot9cwj00008jo77uui1yor	MEETING_SCHEDULE_UPDATED	Modification : TEST MERCREDI	L'horaire ou le lieu de la réunion "TEST MERCREDI" a été modifié.	/meetings/cmmw3ypk40009ez94hsy51nu9	t	2026-03-18 14:04:46.701
cmn9k12f6000blcnsy5penrhm	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : DEMARRAGE PROJET	Vous êtes convoqué(e) le 10/04/2026 (Salle: TEST 11)	/meetings	t	2026-03-27 23:50:41.538
cmn9jyhfs000xw1vt31eddpv3	cmmot9cwj00008jo77uui1yor	MISSION_CANCELLED	Mission annulée	La mission « ADM » (Saint Louis) a été annulée.	\N	t	2026-03-27 23:48:41.033
cmn9k281b000llcnsipknv7le	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de alhusseinkhouma0@gmail.com	alhusseinkhouma0@gmail.com (alhusseinkhouma0@gmail.com) a accepté votre réunion "DEMARRAGE PROJET"	/meetings/cmn9k09l20001lcns7xwbirzb	t	2026-03-27 23:51:35.471
cmn9k5q8a000xlcns2ggmi2p3	cmmot9cwj00008jo77uui1yor	ADMIN_BROADCAST	TEST	SALAM JE TESTE	\N	t	2026-03-27 23:54:19.018
cmn7lr4ar000c46tu3jd73u3g	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST CONFLIT	Vous êtes convoqué(e) le 27/03/2026	/meetings	t	2026-03-26 15:03:24.291
cmn7gtci2000i130kojrxdfew	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 26/03/2026	/meetings	t	2026-03-26 12:45:10.154
cmmoo5x2h0005wlvx0ncfc9fn	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST 	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 09:03:16.649
cmmp029ro000qxnvooyidymrh	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 14:36:21.876
cmmtb9pnt000u6z3za1f0jxm6	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	t	2026-03-16 15:01:09.545
cmmtoryzp000ls3fmj4pmarqe	cmmo3sw3o0003p1nppenw0vmn	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	t	2026-03-16 21:19:16.453
cmmw43vlz0019ez94ydp5y150	cmmo3svr60002p1npg39ix3rb	MISSION_UPDATED	Mission modifiée	La mission « MISSION X » a été modifiée. Lieu : DAKAR.	/missions/cmmw40fsc000lez94blp2404f	t	2026-03-18 14:03:58.535
cmneb8ddy000af1uioovyyl1h	cmmo3svr60002p1npg39ix3rb	MISSION_CREATED	Nouvelle mission assignée	Mission « GESTION VENTE EN GROS » le 31/03/2026 à DAKAR.	/missions/cmneb8bqp0005f1uit2x84wvc	t	2026-03-31 07:43:16.677
cmn9jyg4m000vw1vtxuqfsv9p	cmmo3svr60002p1npg39ix3rb	MISSION_CANCELLED	Mission annulée	La mission « ADM » (Saint Louis) a été annulée.	\N	t	2026-03-27 23:48:39.334
cmn7hor4f0022130kjwage5ez	cmmo3svr60002p1npg39ix3rb	PLANNING_SUBMITTED	Planning en attente de validation	Un planning est prêt pour validation	/plannings/cmn7hgp1e001g130kyuq0qjux	t	2026-03-26 13:09:35.439
cmn7hk780001i130kkuikzv91	cmmo3svr60002p1npg39ix3rb	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST "	/meetings	t	2026-03-26 13:06:03.025
cmn7hn4wa001u130k0xh1g3kt	cmmo3sw3o0003p1nppenw0vmn	PLANNING_SUBMITTED	Planning soumis	Votre planning a été soumis avec succès et est en attente de consolidation	/plannings/cmn7hgp1e001g130kyuq0qjux	t	2026-03-26 13:08:19.978
cmn7hownx0026130kgw50tjg4	cmmo3sw3o0003p1nppenw0vmn	PLANNING_VALIDATED	Planning validé	Votre planning a été validé par le Directeur Général	/plannings/cmn7hgp1e001g130kyuq0qjux	t	2026-03-26 13:09:42.621
cmneb8gdb000ef1uic5pn3mvu	cmmot9cwj00008jo77uui1yor	MISSION_CREATED	Nouvelle mission assignée	Mission « GESTION VENTE EN GROS » le 31/03/2026 à DAKAR.	/missions/cmneb8bqp0005f1uit2x84wvc	t	2026-03-31 07:43:20.543
cmned2m42000nfum25wacr754	cmmo3svr60002p1npg39ix3rb	PLANNING_SUBMITTED	Planning en attente de validation	Un planning est prêt pour validation	/plannings/cmn8v31oe000hhgyfi19o47vh	t	2026-03-31 08:34:47.283
cmnebeb110012f1ui4pnnk7a4	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : Premier reunion	Vous êtes convoqué(e) le 31/03/2026 (Salle: Salle Boardroom)	/meetings	t	2026-03-31 07:47:53.557
cmn7lvss1000q46tu0n5eauja	cmmo3swhb0004p1npbgv6f66x	MEETING_CANCELLED	Réunion annulée : TEST CONFLIT	La réunion du 27/03/2026 a été annulée	/meetings	t	2026-03-26 15:07:02.641
cmnebi7s7001cf1ui77mewikx	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Réponse de responsable2@example.com	responsable2@example.com (responsable2@example.com) a accepté votre réunion "Premier reunion"	/meetings/cmnebd7h4000uf1uiepw78wty	t	2026-03-31 07:50:55.975
cmnebte9b000d4cq1zbrr8ob3	cmmo3swhb0004p1npbgv6f66x	MEETING_COMPLETED	Réunion terminée : Premier reunion	La réunion "Premier reunion" a été marquée comme terminée.	/meetings/cmnebd7h4000uf1uiepw78wty	t	2026-03-31 07:59:37.583
cmnecyzo30009fum2xgzldksl	cmmot9cwj00008jo77uui1yor	PLANNING_SUBMITTED	Planning soumis	Votre planning a été soumis avec succès et est en attente de consolidation	/plannings/cmn8v31oe000hhgyfi19o47vh	t	2026-03-31 08:31:58.227
cmn7lr1fn000a46tu95vxx809	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST CONFLIT	Vous êtes convoqué(e) le 27/03/2026	/meetings	t	2026-03-26 15:03:20.579
cmn7lvsrv000o46tu2tebxwaf	cmmo3sw3o0003p1nppenw0vmn	MEETING_CANCELLED	Réunion annulée : TEST CONFLIT	La réunion du 27/03/2026 a été annulée	/meetings	t	2026-03-26 15:07:02.635
cmmw43yyv001bez944y9nihch	cmmo3svdj0001p1npkybbwako	MISSION_UPDATED	Mission modifiée	La mission « MISSION X » a été modifiée. Lieu : DAKAR.	/missions/cmmw40fsc000lez94blp2404f	t	2026-03-18 14:04:02.887
cmn7hn4v8001s130k8r4knsir	cmmo3svdj0001p1npkybbwako	PLANNING_SUBMITTED	Nouveau planning soumis	undefined a soumis son planning	/plannings/cmn7hgp1e001g130kyuq0qjux	t	2026-03-26 13:08:19.941
cmn7ojf0l0003136ny8gc8kcv	cmmo3svdj0001p1npkybbwako	PLANNING_SUBMITTED	Nouveau planning soumis	Ousseynou KHOUMA — soumis par l'administration	/plannings/cmmqm1hqj0001h5j2vd8wdbam	t	2026-03-26 16:21:23.781
cmn9jyiuy000zw1vt87xlxxqh	cmmo3svdj0001p1npkybbwako	MISSION_CANCELLED	Mission annulée	La mission « ADM » (Saint Louis) a été annulée.	\N	t	2026-03-27 23:48:42.874
cmn9k158f000dlcnsz6xx0ge6	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : DEMARRAGE PROJET	Vous êtes convoqué(e) le 10/04/2026 (Salle: TEST 11)	/meetings	t	2026-03-27 23:50:45.183
cmnecyzmo0007fum2h7nskvoz	cmmo3svdj0001p1npkybbwako	PLANNING_SUBMITTED	Nouveau planning soumis	undefined a soumis son planning	/plannings/cmn8v31oe000hhgyfi19o47vh	t	2026-03-31 08:31:58.176
cmneb8ewv000cf1ui3r1qah61	cmmo3svdj0001p1npkybbwako	MISSION_CREATED	Nouvelle mission assignée	Mission « GESTION VENTE EN GROS » le 31/03/2026 à DAKAR.	/missions/cmneb8bqp0005f1uit2x84wvc	t	2026-03-31 07:43:18.654
cmneehcu7000vm1twdp467z2h	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de mansour.bocoum@example.com	mansour.bocoum@example.com (mansour.bocoum@example.com) a accepté votre réunion "DEMARRAGE PROJET"	/meetings/cmn9k09l20001lcns7xwbirzb	t	2026-03-31 09:14:14.72
cmnee3rk2000tm1twwvxttja8	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de mansour.bocoum@example.com	mansour.bocoum@example.com (mansour.bocoum@example.com) a accepté votre réunion "TEST"	/meetings/cmn7gsvqw0009130kj9dnmxy2	t	2026-03-31 09:03:40.61
cmned3i24000rfum2qhce1ucd	cmmot9cwj00008jo77uui1yor	PLANNING_VALIDATED	Planning validé	Votre planning a été validé par le Directeur Général	/plannings/cmn8v31oe000hhgyfi19o47vh	t	2026-03-31 08:35:28.684
cmn9k16h9000flcnsfohnv3ek	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : DEMARRAGE PROJET	Vous êtes convoqué(e) le 10/04/2026 (Salle: TEST 11)	/meetings	t	2026-03-27 23:50:46.798
cmolxylpz000fhjp69nh2ejvu	cmmot9cwj00008jo77uui1yor	MISSION_CREATED	Nouvelle mission assignée	Mission « FORMATION IA » le 30/04/2026 à DAKAR.	/missions/cmolxyiiu000chjp6qhxuyqno	f	2026-04-30 20:33:37.656
cmomwr5mt001faov9axi464u6	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : Presentation Projet	Vous êtes convoqué(e) le 01/05/2026 (Salle: Salle Conférence)	/meetings	f	2026-05-01 12:47:36.774
cmomwr6zs001haov9va75idvo	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : Presentation Projet	Vous êtes convoqué(e) le 01/05/2026 (Salle: Salle Conférence)	/meetings	f	2026-05-01 12:47:38.537
cmomwr8iw001jaov9r281pjlh	cmmo3swu20005p1nphypodze0	MEETING_CONVOCATION	Convocation : Presentation Projet	Vous êtes convoqué(e) le 01/05/2026 (Salle: Salle Conférence)	/meetings	f	2026-05-01 12:47:40.52
cmomwra5x001laov9ny3b5dsf	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : Presentation Projet	Vous êtes convoqué(e) le 01/05/2026 (Salle: Salle Conférence)	/meetings	f	2026-05-01 12:47:42.645
cmomwrcbj001naov9kl3qsyg3	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : Presentation Projet	Vous êtes convoqué(e) le 01/05/2026 (Salle: Salle Conférence)	/meetings	t	2026-05-01 12:47:45.439
\.


--
-- Data for Name: PasswordHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordHistory" (id, "userId", "passwordHash", "createdAt") FROM stdin;
cmnebhdsv0016f1uim66d6sub	cmmo3swhb0004p1npbgv6f66x	$2b$12$ldoTtJ7PO3rRyBBum.8Vcuc.ivy6p5XdNchKyX/YE/LzDgPo4lTQC	2026-03-31 07:50:17.12
cmnejsun6000j8c5uztxazb7u	cmmo3svr60002p1npg39ix3rb	$2b$12$fL1WsfVQ5Egnnbsrq/3.kOMAGaNg14mP5tgTJLbeOmirXMaUVg6yi	2026-03-31 11:43:09.091
cmolhyqke0001atqhuza0qgs6	cmmo3suxw0000p1np0eron6et	$2b$12$mnkE8URK7d8/vf0uY6r/6eQW9KJcW68LWukSZrEFq2U5B3Q6V0iAy	2026-04-30 13:05:50.079
\.


--
-- Data for Name: Planning; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Planning" (id, "userId", "weekStart", "submittedAt", "consolidatedAt", "validatedAt", "returnedAt", status, "returnComment", "createdAt", "updatedAt") FROM stdin;
cmmo3vsdq000125fvs9onehwu	cmmo3sw3o0003p1nppenw0vmn	2026-03-12 23:35:31.662	\N	\N	\N	\N	DRAFT	\N	2026-03-12 23:35:31.695	2026-03-12 23:35:31.695
cmmtne8w90001s3fmbyxfpnf5	cmmo3sxn00007p1npldvr5svn	2026-03-16 00:00:00	\N	\N	\N	\N	DRAFT	\N	2026-03-16 20:40:36.49	2026-03-16 20:40:36.49
cmmqlgapx00017by4wcyj9dyp	cmmot9cwj00008jo77uui1yor	2026-03-09 00:00:00	2026-03-14 17:23:04.145	2026-03-16 20:40:50.709	2026-03-16 20:41:00.194	\N	VALIDATED	\N	2026-03-14 17:22:54.405	2026-03-16 20:41:00.203
cmn7hgp1e001g130kyuq0qjux	cmmo3sw3o0003p1nppenw0vmn	2026-03-23 00:00:00	2026-03-26 13:08:17.555	2026-03-26 13:09:35.43	2026-03-26 13:09:40.738	\N	VALIDATED	\N	2026-03-26 13:03:19.49	2026-03-26 13:09:40.74
cmn8v31oe000hhgyfi19o47vh	cmmot9cwj00008jo77uui1yor	2026-03-30 00:00:00	2026-03-31 08:31:56.235	2026-03-31 08:34:47.244	2026-03-31 08:35:26.927	\N	VALIDATED	\N	2026-03-27 12:12:23.487	2026-03-31 08:35:26.928
\.


--
-- Data for Name: PlanningEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanningEvent" (id, "planningId", title, type, "startTime", "endTime", "roomId", destination, description, "createdAt", "directionId", "projectId") FROM stdin;
cmn7hlkqm001m130kgaqcv0eq	cmn7hgp1e001g130kyuq0qjux	TEST	FORMATION	2026-03-23 09:00:00	2026-03-23 10:00:00	cmmo3sxnf000bp1npckr3dy00	test	\N	2026-03-26 13:07:07.198	\N	\N
cmn7hmqlb001o130kz8s4h3wf	cmn7hgp1e001g130kyuq0qjux	TEST MISSION	MISSION	2026-03-27 09:00:00	2026-03-28 10:00:00	cmmo3sxnf000bp1npckr3dy00	\N	\N	2026-03-26 13:08:01.439	\N	\N
cmnecye0r0003fum2s3xn6cyb	cmn8v31oe000hhgyfi19o47vh	Formation IA	FORMATION	2026-03-30 09:00:00	2026-03-30 10:00:00	cmmo3sxnf000bp1npckr3dy00	\N	FORMATION SUR IA POUR LES PERSONNELS	2026-03-31 08:31:30.171	cmn9jawvp000aw1vtj8tfmc3y	cmn9jtuw6000tw1vtec7ayogn
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, name, code, description, "isActive", "createdAt", "updatedAt", "createdById", status) FROM stdin;
cmn9jtuw6000tw1vtec7ayogn	Premier projet	C00012	TEST PREMIER PROJET	t	2026-03-27 23:45:05.19	2026-03-31 08:29:59.691	\N	ACTIVE
\.


--
-- Data for Name: ProjectFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProjectFile" (id, "projectId", "uploadedById", "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
cmnecmuzi0001fum2sx6wafwt	cmn9jtuw6000tw1vtec7ayogn	cmmot9cwj00008jo77uui1yor	cahier_des_charges.docx	/uploads/project-files/cmn9jtuw6000tw1vtec7ayogn_1774945352274.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	29726	2026-03-31 08:22:32.285
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RefreshToken" (id, "userId", token, "expiresAt", "isRevoked", "createdAt") FROM stdin;
cmmo3tmlx0001o21qznfw7hm9	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzMzNTg0MzAsImV4cCI6MTc3Mzk2MzIzMH0.rhU_jbAOJhhh0i41i0jV1TDFURwjET4j3dOhbtV1FS0	2026-03-19 23:33:50.897	t	2026-03-12 23:33:50.899
cmmotaqjl0001an2fojxzuhkv	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM0MDEyMTksImV4cCI6MTc3NDAwNjAxOX0.Eq2SPzbQfiIZnAyifu7iKEwkVqSYG6jI4Jg1SiXfzIU	2026-03-20 11:26:59.551	t	2026-03-13 11:26:59.553
cmmo41f8o000b25fvx30n767g	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzMzNTg3OTQsImV4cCI6MTc3Mzk2MzU5NH0.MkHaea8y4wkyPBIsui1EC4O1AR3CJ8ttjCmPycxKVKs	2026-03-19 23:39:54.589	t	2026-03-12 23:39:54.601
cmmo4nv81000112gnxiwcs1l9	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzMzNTk4NDEsImV4cCI6MTc3Mzk2NDY0MX0.0tgp-wXyx-L-D4xPJ71yoH94jSANc_8_U8D-dgp8m-g	2026-03-19 23:57:21.74	t	2026-03-12 23:57:21.743
cmmo4wbyg000dak15b5tiy8vd	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzMzNjAyMzYsImV4cCI6MTc3Mzk2NTAzNn0.PrsxMU_Mm1xBaS2Llocqi2jpsdBa1eDshuvBrXhoUPU	2026-03-20 00:03:56.678	t	2026-03-13 00:03:56.681
cmmonlabs0005r25v3273tdrt	cmmo3svr60002p1npg39ix3rb	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3ZyNjAwMDJwMW5wZzM5aXgzcmIiLCJpYXQiOjE3NzMzOTE2MzQsImV4cCI6MTc3Mzk5NjQzNH0.0cZ3CJ0Rd4ShP2GKVu44wkmNUSEKVPZYujLZ_P26Sl0	2026-03-20 08:47:14.056	t	2026-03-13 08:47:14.057
cmmo3z3ng000725fv2x12mz5p	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTg2ODYsImV4cCI6MTc3Mzk2MzQ4Nn0.3lxbgRJAXgzgTzuc0VgEP9KHi7KE_PZ4kVvBau55rKE	2026-03-19 23:38:06.261	t	2026-03-12 23:38:06.268
cmmo4ctvv0001htg30r0xfts1	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTkzMjYsImV4cCI6MTc3Mzk2NDEyNn0.PCYw4Mde_R315yMKpLb5fcS2L5DqwiE6AiivNJpVam8	2026-03-19 23:48:46.794	t	2026-03-12 23:48:46.796
cmmo4ptse0001lvr2dm86yiul	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTk5MzMsImV4cCI6MTc3Mzk2NDczM30.MpXRy8PZBBzbIaJTIrGhNGKEiMid3ytUalxFTxvWGCU	2026-03-19 23:58:53.187	t	2026-03-12 23:58:53.199
cmmtb5si400056z3zx9imn833	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzM2NzMwODYsImV4cCI6MTc3NDI3Nzg4Nn0.Hhej_hbP5sKfYhJuji1pC30WriKT4p5hFX_Iy2f_89o	2026-03-23 14:58:06.602	t	2026-03-16 14:58:06.604
cmmtb6hr900096z3zoio14gh9	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzM2NzMxMTksImV4cCI6MTc3NDI3NzkxOX0.vfx6DXmEW_qRrT1dp2huOXMGadCic51rbb7tTaGWaII	2026-03-23 14:58:39.33	t	2026-03-16 14:58:39.333
cmmtbbctu000y6z3zu66c4cb6	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzM2NzMzNDYsImV4cCI6MTc3NDI3ODE0Nn0.z1hiok2CiU0p9NeCeF4EaG36lvcPO-gNrFAJWydcOoQ	2026-03-23 15:02:26.225	t	2026-03-16 15:02:26.226
cmmp063i6000vxnvoqshk67us	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM0MTI3NjAsImV4cCI6MTc3NDAxNzU2MH0.ZriuGjzdKGcw1N5mmKcaqwTLibJn1w6Ru8rYamWoeVE	2026-03-20 14:39:20.38	t	2026-03-13 14:39:20.382
cmmql59ey0001q3oksrnmg26p	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM1MDg0NTksImV4cCI6MTc3NDExMzI1OX0.Si7auiHnsMdMEUOalVHgrGOftoTInF1ccP5s7t1D7JU	2026-03-21 17:14:19.496	t	2026-03-14 17:14:19.498
cmmqm200s0005h5j2p7sj4g3h	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM1MDk5ODYsImV4cCI6MTc3NDExNDc4Nn0.pmPAvRW2c_MrlLhTcdc-UUqswuR1h1XIqwu-gOeV3JM	2026-03-21 17:39:46.97	t	2026-03-14 17:39:46.972
cmn92byvz0001eggqqle7qepy	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2MjU3MTcsImV4cCI6MTc3NTIzMDUxN30.3Ruh4uykGgRukcuz-GXfBuPhDaDQj6kpmMzl_fiwBxE	2026-04-03 15:35:17.086	t	2026-03-27 15:35:17.088
cmn94d2850005lglkorxa2nqp	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2MjkxMjcsImV4cCI6MTc3NTIzMzkyN30.vTYQmrcnJmPS8-Ak8WbdAm1i1VOJOc7Ws_hPXWk_h5o	2026-04-03 16:32:07.299	t	2026-03-27 16:32:07.302
cmn9f81mq0001ue5f18n93b52	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2NDczNjksImV4cCI6MTc3NTI1MjE2OX0.ughilC2NaAR8US7LUWIZEjyyqjJvfBSAEemWQ2WfbGI	2026-04-03 21:36:09.019	t	2026-03-27 21:36:09.021
cmn7gwian000y130kui2smrrx	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MjkyNTcsImV4cCI6MTc3NTEzNDA1N30.SUY7zhEyiFchYvoaeIOOXtzVGJsibjMEQnezrrO0CiQ	2026-04-02 12:47:37.63	t	2026-03-26 12:47:37.632
cmn7hpfod0028130kpzdaf3du	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MzA2MDcsImV4cCI6MTc3NTEzNTQwN30.4uvQbhzmvN7BhIw7GgwtzrVfdQ-7a77fShwuRxVd3EI	2026-04-02 13:10:07.26	t	2026-03-26 13:10:07.261
cmn7l142b00071p3ojuswqwgw	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MzYxOTAsImV4cCI6MTc3NTE0MDk5MH0.l8-ED1oE_6fWQKMAFHWKI5XDqlPudqCrAqdMP1tfmt8	2026-04-02 14:43:10.929	t	2026-03-26 14:43:10.931
cmn7l340i000d1p3ouc95t65f	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MzYyODQsImV4cCI6MTc3NTE0MTA4NH0.SoF4a5eyySc_9d3glpnbupoyEdPeMx7RQAeqQY5zxmQ	2026-04-02 14:44:44.173	t	2026-03-26 14:44:44.178
cmn7ltqyf000g46tukpddugg6	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1Mzc1MjYsImV4cCI6MTc3NTE0MjMyNn0.gsB8n24hFJK7gpxJTtv1Ad_xgxkPTsO3HHcXmoTdYo8	2026-04-02 15:05:26.964	t	2026-03-26 15:05:26.968
cmn9fmiwk000bue5fmlqq35hp	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2NDgwNDQsImV4cCI6MTc3NTI1Mjg0NH0.9r9NOG6D1okRPTQSf9nR0hAgXdwZIzIgEVKipCzY_C8	2026-04-03 21:47:24.595	t	2026-03-27 21:47:24.596
cmn9jk0hz000ew1vt3555rvmc	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2NTQ2NDUsImV4cCI6MTc3NTI1OTQ0NX0.9-UsSuRh-mkwjlnmi-PrAUKxCOUrLUxymzILNi51EPA	2026-04-03 23:37:25.894	t	2026-03-27 23:37:25.896
cmneb9saq000mf1ui6mdyo1pw	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ5NDMwNjIsImV4cCI6MTc3NTU0Nzg2Mn0.TFBuFeQ0xu3M9VGeU8pIiZL6Cp1Zm2Aa-diVgBuEoZI	2026-04-07 07:44:22.657	t	2026-03-31 07:44:22.658
cmnbtqrsd00073448j3h5g3l8	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ3OTI2ODksImV4cCI6MTc3NTM5NzQ4OX0.QLnQWsZNDIxgcxD2iCnvVBUKVDUR7hNGCWzsQlRw64c	2026-04-05 13:58:09.708	t	2026-03-29 13:58:09.709
cmnebprm800034cq1tyms1sq3	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ5NDM4MDgsImV4cCI6MTc3NTU0ODYwOH0.weqt2Hx_zrIKDLuci8Mlu8zjztPkeh4xLPX8aotT4hE	2026-04-07 07:56:48.271	t	2026-03-31 07:56:48.272
cmnejicwv0001g36gf5nrklzd	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ5NTY4OTksImV4cCI6MTc3NTU2MTY5OX0.S-Jv2B8lhBg1HYXWgZLQwx4oO6GY8Itz6meOU6QXRvU	2026-04-07 11:34:59.544	t	2026-03-31 11:34:59.547
cmnebhyow0018f1ui10uq5jet	cmmo3swhb0004p1npbgv6f66x	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3doYjAwMDRwMW5wYmd2NmY2NngiLCJpYXQiOjE3NzQ5NDM0NDQsImV4cCI6MTc3NTU0ODI0NH0.dDVsDm_ybPTJEaMUZFuRUwBvIWuEbs2uQAiVCnIvOck	2026-04-07 07:50:44.191	t	2026-03-31 07:50:44.192
cmned2ezi000hfum2o4ls20c4	cmmo3svdj0001p1npkybbwako	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3ZkajAwMDFwMW5wa3liYndha28iLCJpYXQiOjE3NzQ5NDYwNzgsImV4cCI6MTc3NTU1MDg3OH0.4AX2F5KNaLWaWU9InPmVtLshohXSVN7JJO1I7QtprV8	2026-04-07 08:34:38.045	t	2026-03-31 08:34:38.046
cmnedxoio000pm1twa3gw44uk	cmmo3svdj0001p1npkybbwako	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3ZkajAwMDFwMW5wa3liYndha28iLCJpYXQiOjE3NzQ5NDc1MzYsImV4cCI6MTc3NTU1MjMzNn0.x3heeILQnTMMCZUHxsTGlTJ9RMDgBJMdtsZQYX4oi-Q	2026-04-07 08:58:56.735	t	2026-03-31 08:58:56.737
cmneeqgk60001qr9dq28z23pe	cmmo3svdj0001p1npkybbwako	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3ZkajAwMDFwMW5wa3liYndha28iLCJpYXQiOjE3NzQ5NDg4NzksImV4cCI6MTc3NTU1MzY3OX0.QFuh3hOxBqlTYsw0ihpBCYvjq9tmK6NfeQjhFQmZxDA	2026-04-07 09:21:19.446	f	2026-03-31 09:21:19.447
cmneju5li000x8c5uqzfr9gmx	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ5NTc0NDksImV4cCI6MTc3NTU2MjI0OX0.rETyGdcml-enqTxPI3GHrbUddr6v0oKbo15vaBpaDvU	2026-04-07 11:44:09.941	t	2026-03-31 11:44:09.943
cmnejtk5g000l8c5u87d1cdri	cmmo3svr60002p1npg39ix3rb	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3ZyNjAwMDJwMW5wZzM5aXgzcmIiLCJpYXQiOjE3NzQ5NTc0MjIsImV4cCI6MTc3NTU2MjIyMn0.rdDqFN_iGpRTzXDD9Qvthvpt-MaaSu9566KOxipyugQ	2026-04-07 11:43:42.147	t	2026-03-31 11:43:42.148
cmnem5of8000no5vbddh1bu0k	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ5NjEzNDYsImV4cCI6MTc3NTU2NjE0Nn0.5Xra6uI3s2XueyQxsfE698fYxOad47kEd3fUQpS8pDA	2026-04-07 12:49:06.787	t	2026-03-31 12:49:06.788
cmn9fp6b9000fue5f6mdklw6w	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2NDgxNjgsImV4cCI6MTc3NTI1Mjk2OH0.OjnRMG6OkxPd5dTxeswhoBGhNvStXtFd9X-l_bnYAzA	2026-04-03 21:49:28.242	t	2026-03-27 21:49:28.245
cmnem9wxx000ro5vb3o09xisi	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ5NjE1NDQsImV4cCI6MTc3NTU2NjM0NH0._F-oNSDc6qiaOTcaxJdTk_LfeKGY78Swk05eumh3Sps	2026-04-07 12:52:24.453	t	2026-03-31 12:52:24.453
cmolhleky0001a350twydqw9y	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3Nzc1NTM3MjgsImV4cCI6MTc3ODE1ODUyOH0.FATFlQjyV5Ies3b2PiC1EYKKbCPZASgsCEZWgdVQBzs	2026-05-07 12:55:28.013	t	2026-04-30 12:55:28.015
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
cmomw9yei000laov94fsebfbe	cmolxu5bz0001hjp688nfthe4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtb2x4dTViejAwMDFoanA2ODhuZnRoZTQiLCJpYXQiOjE3Nzc2Mzg4NTQsImV4cCI6MTc3ODI0MzY1NH0.gsGTAgdjP2MDQw9x1ZUagd-yWZmUdMgKuQhbArJ8VFQ	2026-05-08 12:34:14.249	t	2026-05-01 12:34:14.25
cmomtfg69000110skadc9n8wm	cmomtfazz0000jmo56gafwtru	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtb210ZmF6ejAwMDBqbW81NmdhZnd0cnUiLCJpYXQiOjE3Nzc2MzQwNzEsImV4cCI6MTc3ODIzODg3MX0.ZY2l7DQh9ZnuQq1ZgrVMfbADhmqOf2RQ2ERU85bUZfE	2026-05-08 11:14:31.709	f	2026-05-01 11:14:31.711
cmomvnmbu0001aov9dligwpxe	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc2Mzc4MTIsImV4cCI6MTc3ODI0MjYxMn0.VuBB6GNfyk22xKY2dykDR77Cws1lz0_hweCMC3AbsjA	2026-05-08 12:16:52.165	t	2026-05-01 12:16:52.166
cmolxxfd20008hjp62jwbn49h	cmolxu5bz0001hjp688nfthe4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtb2x4dTViejAwMDFoanA2ODhuZnRoZTQiLCJpYXQiOjE3Nzc1ODExNjIsImV4cCI6MTc3ODE4NTk2Mn0.f_rvw9V3ok-N0P6jZuI3w8VuUovz2yPR9tJFZJr5BjU	2026-05-07 20:32:42.757	t	2026-04-30 20:32:42.758
cmomvrn1r0005aov9m50nwylk	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc2Mzc5OTksImV4cCI6MTc3ODI0Mjc5OX0.N5EJii5AnPTF0EBNZHJ_9qqtV_oY6wMVTVMaNCo4L7g	2026-05-08 12:19:59.726	t	2026-05-01 12:19:59.727
cmomwpc5s0013aov967fqynro	cmolxu5bz0001hjp688nfthe4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtb2x4dTViejAwMDFoanA2ODhuZnRoZTQiLCJpYXQiOjE3Nzc2Mzk1NzEsImV4cCI6MTc3ODI0NDM3MX0.eMDi9oGDHUKpmAytJkYjjkKrskwjU7ihLPn7-m07YVs	2026-05-08 12:46:11.919	t	2026-05-01 12:46:11.92
cmomwqvpr0019aov9gz7xtn9i	cmolxu5bz0001hjp688nfthe4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtb2x4dTViejAwMDFoanA2ODhuZnRoZTQiLCJpYXQiOjE3Nzc2Mzk2NDMsImV4cCI6MTc3ODI0NDQ0M30.0MN4FGyVeLHqvsJ6PLkEB3YWMTqwJYbXm8HOTYTNVw8	2026-05-08 12:47:23.918	t	2026-05-01 12:47:23.919
cmomwsb5d001raov9l151eqw7	cmolxu5bz0001hjp688nfthe4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtb2x4dTViejAwMDFoanA2ODhuZnRoZTQiLCJpYXQiOjE3Nzc2Mzk3MTAsImV4cCI6MTc3ODI0NDUxMH0.NuZHPG0Bsy2P93hM9KeSsiYRiTZ-Ekq_lJT2B---Y-o	2026-05-08 12:48:30.576	t	2026-05-01 12:48:30.577
cmomwt8pg001vaov9ro63eavv	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3Nzc2Mzk3NTQsImV4cCI6MTc3ODI0NDU1NH0.WU4Z-xCHvfiS8UlcFtndzS6dktQNAQ9NrnJZwh_MAk8	2026-05-08 12:49:14.067	t	2026-05-01 12:49:14.068
cmomwv2vc0023aov9spo3eyfi	cmmo3sxn00007p1npldvr5svn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3huMDAwMDdwMW5wbGR2cjVzdm4iLCJpYXQiOjE3Nzc2Mzk4MzksImV4cCI6MTc3ODI0NDYzOX0.oTI7IKnn6HJE_QWdgCT1Ptm3i_5plxpasOWdRzcHNzE	2026-05-08 12:50:39.815	t	2026-05-01 12:50:39.816
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
cmmo3sxne000ap1npvo2sif1m	Salle Conférence	20	Etage 3, Bâtiment A	["projecteur","ecran","tableau","wifi"]	08:00	19:00	ACTIVE	2026-03-12 23:33:18.554	2026-03-12 23:33:18.554
cmmo3sxnf000bp1npckr3dy00	Salle Boardroom	20	Etage 3, Bâtiment A	["projecteur","ecran","tableau","wifi","cafe"]	08:00	19:00	ACTIVE	2026-03-12 23:33:18.556	2026-03-12 23:55:10.815
cmmo3sxn80008p1npyocxtene	Salle Réunion A	20	Etage 3, Bâtiment A	["projecteur","ecran","tableau","wifi"]	08:00	19:00	DISABLED	2026-03-12 23:33:18.548	2026-03-12 23:59:14.858
cmmo3sxnh000cp1npkt70jvud	Salle Formation	20	Etage 3, Bâtiment A	["projecteur","ecran","tableau","wifi"]	08:00	19:00	DISABLED	2026-03-12 23:33:18.557	2026-03-12 23:59:20.089
cmmp046d8000txnvof8s2ztet	TEST 11	12	ESPACE	["wifi","tele","cafe"]	08:00	19:00	ACTIVE	2026-03-13 14:37:50.69	2026-03-13 14:37:50.69
cmmo3sxnc0009p1npornnr929	Salle Réunion B	20	Etage 3, Bâtiment A	["projecteur","ecran","tableau","wifi"]	08:00	19:00	ACTIVE	2026-03-12 23:33:18.553	2026-03-13 14:38:14.043
\.


--
-- Data for Name: RoomBooking; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RoomBooking" (id, "roomId", "meetingId", "userId", date, "startTime", "endTime", status, "createdAt") FROM stdin;
cmmo456ah000h25fv4iubc8n2	cmmo3sxnf000bp1npckr3dy00	cmmo44zkc000f25fvcxaavyfo	cmmo3sxa90006p1npcmnoc8dt	2026-03-12 12:00:00	12:00	19:00	CANCELLED	2026-03-12 23:42:49.626
cmn7lqwt3000846tui0vhzhbq	cmmo3sxnc0009p1npornnr929	cmn7lpoxm000146tuwhf71n06	cmmo3suxw0000p1np0eron6et	2026-03-27 13:00:00	13:00	13:30	CANCELLED	2026-03-26 15:03:14.584
cmnebe9m60010f1uinh7s40ei	cmmo3sxnf000bp1npckr3dy00	cmnebd7h4000uf1uiepw78wty	cmmot9cwj00008jo77uui1yor	2026-03-31 08:00:00	08:00	20:00	CANCELLED	2026-03-31 07:47:51.726
cmmo3xnct000525fv34oqgfu1	cmmo3sxnf000bp1npckr3dy00	cmmo3x0vv000325fvzt6a05on	cmmo3sw3o0003p1nppenw0vmn	2026-03-12 08:00:00	08:00	10:00	CANCELLED	2026-03-12 23:36:58.493
cmmo4ts6v000hlvr2ov1iw1nf	cmmo3sxne000ap1npvo2sif1m	cmmo4sswp0005lvr2qs2c0fi5	cmmo3suxw0000p1np0eron6et	2026-03-12 20:00:00	20:00	23:58	CANCELLED	2026-03-13 00:01:57.751
cmmonz3ra00052h1etu8axhvd	cmmo3sxne000ap1npvo2sif1m	cmmonyxrn00012h1eb9y2mh4y	cmmo3svr60002p1npg39ix3rb	2026-03-13 08:00:00	08:00	10:00	CANCELLED	2026-03-13 08:57:58.727
cmmp021jo000ixnvoe6vu840a	cmmo3sxne000ap1npvo2sif1m	cmmp01rza0009xnvoupogf5ih	cmmo3suxw0000p1np0eron6et	2026-03-13 00:00:00	00:00	03:00	CANCELLED	2026-03-13 14:36:11.22
cmmtb9j63000m6z3zsubsoetw	cmmo3sxne000ap1npvo2sif1m	cmmtb872p000d6z3zuc4zios4	cmmo3sxa90006p1npcmnoc8dt	2026-03-16 09:00:00	09:00	20:00	CANCELLED	2026-03-16 15:01:01.131
cmmw3z125000fez94tjslxxon	cmmo3sxnf000bp1npckr3dy00	cmmw3ypk40009ez94hsy51nu9	cmmo3suxw0000p1np0eron6et	2026-03-18 17:00:00	17:00	20:00	CANCELLED	2026-03-18 14:00:12.318
cmn7gt9o0000g130kuig6vg5k	cmmo3sxnf000bp1npckr3dy00	cmn7gsvqw0009130kj9dnmxy2	cmmo3suxw0000p1np0eron6et	2026-03-26 16:00:00	16:00	22:00	CANCELLED	2026-03-26 12:45:06.48
cmn9k10l90009lcnskmbf7171	cmmp046d8000txnvof8s2ztet	cmn9k09l20001lcns7xwbirzb	cmmo3suxw0000p1np0eron6et	2026-04-10 00:00:00	00:00	00:00	CANCELLED	2026-03-27 23:50:39.165
cmomwr3w8001daov9jlng7q5s	cmmo3sxne000ap1npvo2sif1m	cmomwhv78000taov95p97cwo9	cmolxu5bz0001hjp688nfthe4	2026-05-01 10:00:00.1	10:00	16:00	CONFIRMED	2026-05-01 12:47:34.52
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt", "avatarUrl", "isDeleted", "twoFactorEnabled", "twoFactorSecret", "directionId") FROM stdin;
cmmo3swu20005p1nphypodze0	Responsable 3	responsable3@example.com	$2b$12$zKw7Ib2TMndmAkmyr34zf.bc8gz1T8AA31qVvi.OaKLdciX690GxG	RESPONSABLE	t	2026-03-12 23:33:17.498	2026-03-12 23:33:17.498	\N	f	f	\N	\N
cmmo3sxa90006p1npcmnoc8dt	Responsable 4	responsable4@example.com	$2b$12$mfRGKGV2beUTKSj3BiuARuu/P/EYyXNzUv2fFzkr2Duzs7jpVmr5i	RESPONSABLE	t	2026-03-12 23:33:18.081	2026-03-12 23:33:18.081	\N	f	f	\N	\N
cmmo3suxw0000p1np0eron6et	Admin User	admin@example.com	$2b$12$mnkE8URK7d8/vf0uY6r/6eQW9KJcW68LWukSZrEFq2U5B3Q6V0iAy	SUPER_ADMIN	t	2026-03-12 23:33:15.042	2026-04-30 13:05:50.085	/uploads/avatars/cmmo3suxw0000p1np0eron6et.webp	f	f	OZVXOODBGJIDY2CTJYYTGQS5KE4EA3L3	cmn9jawvp000aw1vtj8tfmc3y
cmomtfazz0000jmo56gafwtru	Demo Admin	demo@adm.sn	$2b$10$tZP5mmy/iA3Kz7XEqm45/ed5H0QY5pMZzI..jgAKroYSkn3BBih/6	ADMIN	t	2026-05-01 11:14:24.979	2026-05-01 11:14:24.979	\N	f	f	\N	\N
cmolxu5bz0001hjp688nfthe4	Aminata	amina@yopmail.com	$2b$12$k1HBIL6v5ZdyC4hw3ivR5.m95MpPD6RzFyQKw08kJQXMqSBWLXjL6	CONSOLIDATEUR	t	2026-04-30 20:30:09.792	2026-05-01 12:33:58.202	\N	f	f	\N	cmolxghbk0008rw4yrddm0efv
cmmot9cwj00008jo77uui1yor	Amina KHOUMA	alhusseinkhouma0@gmail.com	$2b$12$fb2rD8j./AZWoMXxWRy3xeKeODBPCh5qabXpNtxRYAfO.CjSCzCRW	RESPONSABLE	t	2026-03-13 11:25:55.219	2026-05-01 12:49:45.427	/uploads/avatars/cmmot9cwj00008jo77uui1yor.png	f	f	\N	cmn9jawvp000aw1vtj8tfmc3y
cmmo3sxn00007p1npldvr5svn	Responsable 5	responsable5@example.com	$2b$12$b2UM1aqaBuw85bVNpik4WObGPKKo7hc5SsOsnMThCaekfFuzN7zQq	RESPONSABLE	t	2026-03-12 23:33:18.54	2026-05-01 12:50:12.481	\N	f	f	\N	\N
cmmo3sw3o0003p1nppenw0vmn	Responsable 1	responsable1@example.com	$2b$12$ct2eztYLzJyqd7m0cvDbJuU3eTPT5fUWfK8tVl8bC3yKImv/WRFJi	RESPONSABLE	t	2026-03-12 23:33:16.549	2026-03-26 14:45:15.574	/uploads/avatars/cmmo3sw3o0003p1nppenw0vmn.png	f	t	KFKFQYZSGA4EOR26O4XVIYKFI54WO5KJ	\N
cmmo3swhb0004p1npbgv6f66x	Responsable 2	responsable2@example.com	$2b$12$ldoTtJ7PO3rRyBBum.8Vcuc.ivy6p5XdNchKyX/YE/LzDgPo4lTQC	RESPONSABLE	t	2026-03-12 23:33:17.039	2026-03-31 07:50:17.127	\N	f	f	\N	\N
cmmo3svdj0001p1npkybbwako	Mansour BOCOUM	mansour.bocoum@example.com	$2b$12$ZKhR9qNs52bXSZIFgtvn0u4bIv762UyeNjUV1eugf0PHGtFABykrK	CONSOLIDATEUR	t	2026-03-12 23:33:15.607	2026-03-31 08:34:11.273	\N	f	f	\N	\N
cmmo3svr60002p1npg39ix3rb	Directeur General	dg@example.com	$2b$12$fL1WsfVQ5Egnnbsrq/3.kOMAGaNg14mP5tgTJLbeOmirXMaUVg6yi	DG	t	2026-03-12 23:33:16.098	2026-03-31 12:28:17.468	\N	f	f	\N	cmn9jawvp000aw1vtj8tfmc3y
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

\unrestrict Ld7vEPk6fYcfV1DGE6NCHDXY1CKJZIwepEhqRiqg9GnPAYkET2jHCfG7EcM1yiT

