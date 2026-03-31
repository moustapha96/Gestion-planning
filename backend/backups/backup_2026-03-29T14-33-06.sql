--
-- PostgreSQL database dump
--

\restrict KwTqwk32ihxayve0XPyNs2QQHnRaQK3v7XkgbTzhvhu393IY4GV9tc9N0rg0EDq

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

ALTER TABLE IF EXISTS ONLY public."RoomBooking" DROP CONSTRAINT IF EXISTS "RoomBooking_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."RoomBooking" DROP CONSTRAINT IF EXISTS "RoomBooking_roomId_fkey";
ALTER TABLE IF EXISTS ONLY public."RoomBooking" DROP CONSTRAINT IF EXISTS "RoomBooking_meetingId_fkey";
ALTER TABLE IF EXISTS ONLY public."RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
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
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_senderId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_receiverId_fkey";
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_parentId_fkey";
ALTER TABLE IF EXISTS ONLY public."DeviceToken" DROP CONSTRAINT IF EXISTS "DeviceToken_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Backup" DROP CONSTRAINT IF EXISTS "Backup_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."Room_name_key";
DROP INDEX IF EXISTS public."RoomBooking_meetingId_key";
DROP INDEX IF EXISTS public."RefreshToken_token_key";
DROP INDEX IF EXISTS public."Project_name_key";
DROP INDEX IF EXISTS public."Project_code_key";
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
ALTER TABLE IF EXISTS ONLY public."RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_pkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_pkey";
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
ALTER TABLE IF EXISTS ONLY public."DirectMessage" DROP CONSTRAINT IF EXISTS "DirectMessage_pkey";
ALTER TABLE IF EXISTS ONLY public."DeviceToken" DROP CONSTRAINT IF EXISTS "DeviceToken_pkey";
ALTER TABLE IF EXISTS ONLY public."Backup" DROP CONSTRAINT IF EXISTS "Backup_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE IF EXISTS ONLY public."AppSetting" DROP CONSTRAINT IF EXISTS "AppSetting_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."RoomBooking";
DROP TABLE IF EXISTS public."Room";
DROP TABLE IF EXISTS public."RefreshToken";
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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "twoFactorSecret" text
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
app_logo_url	/uploads/branding/app_logo_1774793463816.png	2026-03-29 14:11:05.222
app_contact_address	Dakar	2026-03-29 14:11:05.222
app_contact_email	contact@gp.com	2026-03-29 14:11:05.221
app_contact_phone	3380002020	2026-03-29 14:11:05.221
app_name	GP	2026-03-29 14:11:05.221
app_footer_text	© 2026 GP - Tous droits réservés	2026-03-29 14:11:05.25
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
\.


--
-- Data for Name: Backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Backup" (id, "fileName", "relativePath", "sizeBytes", status, "errorMessage", kind, "startedAt", "finishedAt", "createdById") FROM stdin;
cmnbuzppl0001mvm00foxazxv	backup_2026-03-29T14-33-06.sql	backups\\backup_2026-03-29T14-33-06.sql	\N	PENDING	\N	MANUAL	2026-03-29 14:33:06.534	\N	cmmo3suxw0000p1np0eron6et
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
cmn7nte150001beveleafd9jo	cmmo3sw3o0003p1nppenw0vmn	cmmo3svr60002p1npg39ix3rb	salut	2026-03-26 16:01:09.449	\N	\N	f	\N	\N	\N
cmn7nz5e20001loz1w7gl9nuo	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	salut	2026-03-26 16:05:38.187	\N	\N	t	\N	\N	\N
cmn7nzgio0003loz1xwlni8u5	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	tu vas bien ?	2026-03-26 16:05:52.609	\N	\N	t	\N	\N	\N
cmn7nzlxh0005loz1mok5uto5	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	super alors	2026-03-26 16:05:59.622	\N	\N	t	\N	\N	\N
cmn7nzoz50007loz16rin6ht7	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	\N	2026-03-26 16:06:03.569	Gemini_Generated_Image_v37ry1v37ry1v37r.png	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774541163541.png	t	image/png	1402921	\N
cmn7nzy1c0009loz1ow7hiym8	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	je vois c bien	2026-03-26 16:06:15.313	\N	\N	t	\N	\N	\N
cmn7o077r000bloz1i11fzp9b	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	\N	2026-03-26 16:06:27.208	ALhUSSEINkHOUMA_CV_INGENIEUR_LOGICIEL.pdf	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774541187199.pdf	t	application/pdf	105314	\N
cmn7o4glv0001jdnv7otz40j6	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	dcr	2026-03-26 16:09:46.003	\N	\N	t	\N	\N	\N
cmn7oe8xm0003jdnvhdgx2y6f	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	ah d'accord c bien pourtout	2026-03-26 16:17:22.618	\N	\N	t	\N	\N	cmn7o077r000bloz1i11fzp9b
cmn7p81xl0003hta1ph2hfh2q	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	salut	2026-03-26 16:40:33.225	\N	\N	t	\N	\N	\N
cmn7p8bfw0005hta1wrvcfkqg	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	ca va tu vs bien	2026-03-26 16:40:45.549	\N	\N	t	\N	\N	\N
cmn7pdr220001bmkb5byls3fv	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	salut	2026-03-26 16:44:59.066	\N	\N	t	\N	\N	\N
cmn7pj1x50003bmkbyq35w4fs	cmmo3sw3o0003p1nppenw0vmn	cmmo3suxw0000p1np0eron6et	ca va	2026-03-26 16:49:06.425	\N	\N	t	\N	\N	\N
cmn7pja1h0005bmkbwznhia3b	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	ah d'accord	2026-03-26 16:49:16.949	\N	\N	t	\N	\N	\N
cmn8v22tl000fhgyfx4wz2etz	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	bjr	2026-03-27 12:11:38.314	\N	\N	f	\N	\N	\N
cmn92j7wj0005eggqxncvjp8n	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	sa	2026-03-27 15:40:55.363	\N	\N	t	\N	\N	\N
cmn94ajsb0001lglkjjuffc4q	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	salut	2026-03-27 16:30:10.088	\N	\N	t	\N	\N	\N
cmn9fd3p10009ue5fpjcwqxtf	cmmot9cwj00008jo77uui1yor	cmmo3sxa90006p1npcmnoc8dt	salut	2026-03-27 21:40:04.981	\N	\N	f	\N	\N	\N
cmn94duvs0001o4hx54ezl0rf	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	ah d'accord alors	2026-03-27 16:32:44.44	TDR-TableauDevenement (1).docx	/uploads/direct-messages/dm_cmmot9cwj00008jo77uui1yor_1774629164423.docx	t	application/vnd.openxmlformats-officedocument.wordprocessingml.document	46280	\N
cmn9f958x0005ue5f7yyjzbrq	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	\N	2026-03-27 21:37:00.369	Design sans titre.png	/uploads/direct-messages/dm_cmmot9cwj00008jo77uui1yor_1774647420324.png	t	image/png	1990137	\N
cmn9fd3l80007ue5fz10vvda2	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salut	2026-03-27 21:40:04.844	\N	\N	t	\N	\N	\N
cmn9fu1cy000jue5fyu2k650e	cmmot9cwj00008jo77uui1yor	cmmo3sw3o0003p1nppenw0vmn	cc	2026-03-27 21:53:15.107	\N	\N	f	\N	\N	\N
cmn9fu1od000lue5fdq4sqpoo	cmmot9cwj00008jo77uui1yor	cmmo3sw3o0003p1nppenw0vmn	ca va	2026-03-27 21:53:15.517	\N	\N	f	\N	\N	\N
cmn9fu1sf000nue5fjilhj10b	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	ah dcr	2026-03-27 21:53:15.663	\N	\N	t	\N	\N	\N
cmn9fu20n000pue5fprqk08co	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	oui cav	2026-03-27 21:53:15.959	\N	\N	t	\N	\N	\N
cmn9h4ltv0005rousmdzgr3es	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	nn	2026-03-27 22:29:27.811	\N	\N	t	\N	\N	cmn9fu20n000pue5fprqk08co
cmn9if1e70001w1vt184fwl9p	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	salut	2026-03-27 23:05:34.16	\N	\N	f	\N	\N	\N
cmn9if5sh0003w1vtcnjxblfk	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	tuvas bien	2026-03-27 23:05:39.857	\N	\N	f	\N	\N	\N
cmn9ifc2g0005w1vt65x8hqsm	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	salut	2026-03-27 23:05:47.993	\N	\N	f	\N	\N	\N
cmn9itka40007w1vtlke6f1ya	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	tu vas bien ???	2026-03-27 23:16:51.82	\N	\N	f	\N	\N	\N
cmn9ito0d0009w1vtkxh0hviq	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	\N	2026-03-27 23:16:56.654	developpeur_full_stack_sprinb_boot.pdf	/uploads/direct-messages/dm_cmmo3suxw0000p1np0eron6et_1774653416600.pdf	f	application/pdf	4265478	\N
cmn9jl15p000kw1vto75hobv1	cmmo3suxw0000p1np0eron6et	cmmo3sw3o0003p1nppenw0vmn	salut	2026-03-27 23:38:13.406	\N	\N	f	\N	\N	\N
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
cmn9l43r4000b1072f0gmkwiy	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	dcr	2026-03-28 00:21:02.848	\N	\N	t	\N	\N	\N
cmn9l4vv8000j1072t3yiefyo	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	boy demal teud	2026-03-28 00:21:39.284	\N	\N	t	\N	\N	\N
cmn9l50wj000l1072znxa73we	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	dcr	2026-03-28 00:21:45.811	\N	\N	t	\N	\N	cmn9l4vv8000j1072t3yiefyo
cmnbtqbkd000534489bbn1plx	cmmo3suxw0000p1np0eron6et	cmmo3svr60002p1npg39ix3rb	Salam	2026-03-29 13:57:48.686	\N	\N	f	\N	\N	\N
cmnbtr2um000b3448kpqu50rz	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	salam	2026-03-29 13:58:24.046	\N	\N	t	\N	\N	\N
cmnbtreue000d3448j3zcyh6k	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	tu vas bien	2026-03-29 13:58:39.59	\N	\N	t	\N	\N	\N
cmnbtrto2000f34489mqiw4ai	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	oui ca va	2026-03-29 13:58:58.802	\N	\N	t	\N	\N	\N
cmnbts0ov000h34487q71g2ws	cmmot9cwj00008jo77uui1yor	cmmo3suxw0000p1np0eron6et	c quoi le souci	2026-03-29 13:59:07.904	\N	\N	t	\N	\N	\N
cmnbtsedj000j34486gt3x85n	cmmo3suxw0000p1np0eron6et	cmmot9cwj00008jo77uui1yor	je sais pas dit le moi	2026-03-29 13:59:25.639	\N	\N	t	\N	\N	\N
\.


--
-- Data for Name: Direction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Direction" (id, name, code, description, "isActive", "createdAt", "updatedAt") FROM stdin;
cmn9jawvp000aw1vtj8tfmc3y	Université Démo	DP202510311551	test	t	2026-03-27 23:30:21.301	2026-03-27 23:30:21.301
\.


--
-- Data for Name: Invitation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invitation" (id, "meetingId", "userId", status, "sentAt", "respondedAt", "createdAt") FROM stdin;
cmmo4sswp0007lvr275p95fxo	cmmo4sswp0005lvr2qs2c0fi5	cmmo3sxn00007p1npldvr5svn	PENDING	2026-03-13 00:04:20.245	\N	2026-03-13 00:01:12.025
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
cmn7gsvqw000b130ky9zogokj	cmn7gsvqw0009130kj9dnmxy2	cmmo3svdj0001p1npkybbwako	PENDING	2026-03-26 12:45:12.051	\N	2026-03-26 12:44:48.44
cmmo4sswp000blvr2tavw82sx	cmmo4sswp0005lvr2qs2c0fi5	cmmo3sw3o0003p1nppenw0vmn	ACCEPTED	2026-03-13 00:04:20.245	2026-03-26 12:49:09.364	2026-03-13 00:01:12.025
cmmoo5ti70001wlvx40y58hhu	cmmonyxrn00012h1eb9y2mh4y	cmmo3sw3o0003p1nppenw0vmn	ACCEPTED	\N	2026-03-26 13:06:02.987	2026-03-13 09:03:12.032
cmn7lpoxn000446tua0eno2n9	cmn7lpoxm000146tuwhf71n06	cmmo3swhb0004p1npbgv6f66x	PENDING	2026-03-26 15:03:24.299	\N	2026-03-26 15:02:17.723
cmn7lpoxn000346tucb44ev4f	cmn7lpoxm000146tuwhf71n06	cmmo3sw3o0003p1nppenw0vmn	ACCEPTED	2026-03-26 15:03:24.299	2026-03-26 15:05:53.638	2026-03-26 15:02:17.723
cmn7okub8000a136nkabl9teo	cmmo3x0vv000325fvzt6a05on	cmmot9cwj00008jo77uui1yor	ACCEPTED	\N	2026-03-26 16:22:57.073	2026-03-26 16:22:30.26
cmn7gsvqw000c130kg6e4uova	cmn7gsvqw0009130kj9dnmxy2	cmmot9cwj00008jo77uui1yor	ACCEPTED	2026-03-26 12:45:12.051	2026-03-27 21:54:33.779	2026-03-26 12:44:48.44
cmn9k09l20004lcns8356sx8o	cmn9k09l20001lcns7xwbirzb	cmmo3svdj0001p1npkybbwako	PENDING	2026-03-27 23:50:46.804	\N	2026-03-27 23:50:04.166
cmn9k09l20005lcnswa851mre	cmn9k09l20001lcns7xwbirzb	cmmo3sw3o0003p1nppenw0vmn	PENDING	2026-03-27 23:50:46.804	\N	2026-03-27 23:50:04.166
cmn9k09l20003lcns8jzx20iv	cmn9k09l20001lcns7xwbirzb	cmmot9cwj00008jo77uui1yor	ACCEPTED	2026-03-27 23:50:46.804	2026-03-27 23:51:35.436	2026-03-27 23:50:04.166
\.


--
-- Data for Name: Meeting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Meeting" (id, title, agenda, "organizerId", "roomId", "startTime", "endTime", status, "orderOfDay", attachments, "createdAt", "updatedAt", "meetingLink", "directionId", "projectId") FROM stdin;
cmmo44zkc000f25fvcxaavyfo	TESTE	YUP	cmmo3sxa90006p1npcmnoc8dt	cmmo3sxnf000bp1npckr3dy00	2026-03-12 12:00:00	2026-03-12 19:00:00	CANCELLED	\N	\N	2026-03-12 23:42:40.909	2026-03-13 00:04:16.498	\N	\N	\N
cmmo4sswp0005lvr2qs2c0fi5	TEST TETSE	TESTETE	cmmo3suxw0000p1np0eron6et	cmmo3sxne000ap1npvo2sif1m	2026-03-12 20:00:00	2026-03-12 23:58:00	SENT	\N	\N	2026-03-13 00:01:12.025	2026-03-13 00:04:20.247	\N	\N	\N
cmmonyxrn00012h1eb9y2mh4y	TEST 	ON TESTE LE CAENDRIER	cmmo3svr60002p1npg39ix3rb	cmmo3sxne000ap1npvo2sif1m	2026-03-13 08:00:00	2026-03-13 10:00:00	SENT	\N	\N	2026-03-13 08:57:50.963	2026-03-13 08:57:58.73	\N	\N	\N
cmmp01rza0009xnvoupogf5ih	TESTETE A	TESTET PRO	cmmo3suxw0000p1np0eron6et	cmmo3sxne000ap1npvo2sif1m	2026-03-13 00:00:00	2026-03-13 03:00:00	SENT	\N	\N	2026-03-13 14:35:58.822	2026-03-13 14:36:21.914	\N	\N	\N
cmmtb872p000d6z3zuc4zios4	TEST	TEST	cmmo3sxa90006p1npcmnoc8dt	cmmo3sxne000ap1npvo2sif1m	2026-03-16 09:00:00	2026-03-16 20:00:00	SENT	\N	\N	2026-03-16 14:59:58.801	2026-03-16 15:01:09.556	\N	\N	\N
cmmw3ypk40009ez94hsy51nu9	TEST MERCREDI	TEST DE L'APPLICation	cmmo3suxw0000p1np0eron6et	cmmo3sxnf000bp1npckr3dy00	2026-03-18 17:00:00	2026-03-18 20:00:00	SENT	\N	\N	2026-03-18 13:59:57.413	2026-03-18 14:04:44.553	\N	\N	\N
cmn7gsvqw0009130kj9dnmxy2	TEST	TEST FICHIER	cmmo3suxw0000p1np0eron6et	cmmo3sxnf000bp1npckr3dy00	2026-03-26 16:00:00	2026-03-27 22:00:00	SENT	\N	\N	2026-03-26 12:44:48.44	2026-03-26 12:45:12.052	\N	\N	\N
cmn7lpoxm000146tuwhf71n06	TEST CONFLIT	TEST CONFLIT	cmmo3suxw0000p1np0eron6et	cmmo3sxnc0009p1npornnr929	2026-03-27 13:00:00	2026-03-27 13:30:00	CANCELLED	\N	\N	2026-03-26 15:02:17.723	2026-03-26 15:07:02.626	\N	\N	\N
cmmo3x0vv000325fvzt6a05on	MEET DEV	DEVELOPPMENT	cmmo3sw3o0003p1nppenw0vmn	cmmo3sxnf000bp1npckr3dy00	2026-03-12 08:00:00	2026-03-12 10:00:00	SENT	\N	\N	2026-03-12 23:36:29.372	2026-03-26 16:22:20.333	https://meet.google.com/ecm-dvoo-ehw	\N	\N
cmn9k09l20001lcns7xwbirzb	DEMARRAGE PROJET	TESTE PROJET	cmmo3suxw0000p1np0eron6et	cmmp046d8000txnvof8s2ztet	2026-04-10 00:00:00	2026-04-30 00:00:00	SENT	\N	\N	2026-03-27 23:50:04.166	2026-03-27 23:50:46.806	\N	cmn9jawvp000aw1vtj8tfmc3y	cmn9jtuw6000tw1vtec7ayogn
\.


--
-- Data for Name: MeetingFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MeetingFile" (id, "meetingId", "uploadedById", kind, "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
cmn7luv8a000k46tu00yz2kvf	cmn7lpoxm000146tuwhf71n06	cmmo3suxw0000p1np0eron6et	DOCUMENT	RÃ©sumÃ© exÃ©cutif.pdf	/uploads/meetings/cmn7lpoxm000146tuwhf71n06_1774537579142.pdf	application/pdf	72578	2026-03-26 15:06:19.162
cmn9k3p3j000rlcnsoywayhep	cmn9k09l20001lcns7xwbirzb	cmmot9cwj00008jo77uui1yor	IMAGE	Design sans titre (1).png	/uploads/meetings/cmn9k09l20001lcns7xwbirzb_1774655564210.png	image/png	1415220	2026-03-27 23:52:44.24
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
\.


--
-- Data for Name: Mission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Mission" (id, title, description, location, "startTime", "endTime", "createdById", status, "createdAt", "updatedAt", "directionId", "projectId") FROM stdin;
cmmtbdcai00126z3zlvrpy0yo	MISSION X	TEST	DAKAR	2026-03-16 09:00:00.758	2026-03-16 12:00:00.759	cmmo3sw3o0003p1nppenw0vmn	CONFIRMED	2026-03-16 15:03:58.842	2026-03-16 15:03:58.842	\N	\N
cmmw40fsc000lez94blp2404f	MISSION X	TEST MISSION	DAKAR	2026-03-18 09:00:00.4	2026-03-19 15:00:00.4	cmmo3suxw0000p1np0eron6et	CONFIRMED	2026-03-18 14:01:18.06	2026-03-18 14:03:56.075	\N	\N
cmmqj6eu50005g3pealoydma1	ADM	Mission ADM	Saint Louis	2026-03-14 09:00:00.211	2026-04-11 12:00:00.2	cmmo3suxw0000p1np0eron6et	CANCELLED	2026-03-14 16:19:13.949	2026-03-27 23:48:37.289	\N	\N
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
\.


--
-- Data for Name: MissionFile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MissionFile" (id, "missionId", "uploadedById", kind, "fileName", "fileUrl", "mimeType", size, "createdAt") FROM stdin;
cmn7gunzl000s130kdoitnl33	cmmqj6eu50005g3pealoydma1	cmmo3suxw0000p1np0eron6et	DOCUMENT	RÃ©sumÃ© exÃ©cutif.pdf	/uploads/missions/cmmqj6eu50005g3pealoydma1_1774529171693.pdf	application/pdf	72578	2026-03-26 12:46:11.698
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "userId", type, title, body, link, "isRead", "createdAt") FROM stdin;
cmmo4ur3n000nlvr28rriyzdv	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:02:42.995
cmmo4vjmz0001ak15kjgr8pkh	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:03:19.978
cmmo4vznc0005ak15neh6ue72	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:03:40.727
cmmo4w2gq0007ak15eb8pvdw1	cmmo3sxn00007p1npldvr5svn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:03:44.378
cmmo4w6vq0009ak15lc62lppj	cmmo3swu20005p1nphypodze0	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:03:50.102
cmmo4wb9f000bak15j2h21ecf	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:55.779
cmmo4wihq000jak15ucefhtn0	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:04:05.15
cmmo4we31000hak15yv27we7t	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:59.437
cmmo4wmux000lak15jkxd1dol	cmmo3swu20005p1nphypodze0	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:04:10.809
cmmo4wpot000nak15xa6bab2m	cmmo3swu20005p1nphypodze0	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:04:14.477
cmmo4wyg6000xak15tfo9cfk1	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:04:25.83
cmmo4x1b9000zak15aufrl6il	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	f	2026-03-13 00:04:29.542
cmmo4v2pv000plvr2iwyyt7bw	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:02:58.052
cmmoo5vgk0003wlvx7zbwec1a	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TEST 	Vous êtes convoqué(e) le 13/03/2026	/meetings	f	2026-03-13 09:03:14.564
cmmtb9kuc000o6z3zukz37h6m	cmmo3svr60002p1npg39ix3rb	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	f	2026-03-16 15:01:03.3
cmmtb9ml9000q6z3z0qs14y9x	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	f	2026-03-16 15:01:05.565
cmmp023q0000kxnvoyvmyu6if	cmmo3svr60002p1npg39ix3rb	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	f	2026-03-13 14:36:14.04
cmmp027u7000oxnvo5xywho2q	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	f	2026-03-13 14:36:19.376
cmmqj6hh3000ag3pe5hgyx4w9	cmmo3svr60002p1npg39ix3rb	MISSION_CREATED	Nouvelle mission assignée	Mission « ADM » le 14/03/2026 à Saint Louis.	/missions/cmmqj6eu50005g3pealoydma1	f	2026-03-14 16:19:17.367
cmmqj6lwn000eg3peiu00d0gg	cmmo3svdj0001p1npkybbwako	MISSION_CREATED	Nouvelle mission assignée	Mission « ADM » le 14/03/2026 à Saint Louis.	/missions/cmmqj6eu50005g3pealoydma1	f	2026-03-14 16:19:23.111
cmmqlgke500057by48eoveoh3	cmmo3svdj0001p1npkybbwako	PLANNING_SUBMITTED	Nouveau planning soumis	undefined a soumis son planning	/plannings/cmmqlgapx00017by4wcyj9dyp	f	2026-03-14 17:23:06.941
cmmo4vv9b0003ak152rht2nip	cmmo3sxa90006p1npcmnoc8dt	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:03:35.04
cmmtbddu400166z3z1sy4094n	cmmo3swhb0004p1npbgv6f66x	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 16/03/2026 à DAKAR.	/missions/cmmtbdcai00126z3zlvrpy0yo	f	2026-03-16 15:04:00.844
cmmtbdfzu00186z3z2fgibnbw	cmmo3swu20005p1nphypodze0	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 16/03/2026 à DAKAR.	/missions/cmmtbdcai00126z3zlvrpy0yo	f	2026-03-16 15:04:03.642
cmmp0264x000mxnvov2oz2nsm	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 14:36:17.169
cmmtb9o7o000s6z3zr1so3lcj	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	t	2026-03-16 15:01:07.668
cmmqj6iyg000cg3ped7cgdjxz	cmmot9cwj00008jo77uui1yor	MISSION_CREATED	Nouvelle mission assignée	Mission « ADM » le 14/03/2026 à Saint Louis.	/missions/cmmqj6eu50005g3pealoydma1	t	2026-03-14 16:19:19.288
cmmtorz1a000vs3fmqxalfzhj	cmmot9cwj00008jo77uui1yor	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	t	2026-03-16 21:19:16.51
cmmtnejw40007s3fmp303ww6t	cmmo3svr60002p1npg39ix3rb	PLANNING_SUBMITTED	Planning en attente de validation	Un planning est prêt pour validation	/plannings/cmmqlgapx00017by4wcyj9dyp	f	2026-03-16 20:40:50.74
cmmtorz0m000ns3fmkuanz7ch	cmmo3swhb0004p1npbgv6f66x	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	f	2026-03-16 21:19:16.486
cmmtorz0r000ps3fmw6567ne6	cmmo3swu20005p1nphypodze0	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	f	2026-03-16 21:19:16.492
cmmtorz0w000rs3fmeb26bpql	cmmo3sxa90006p1npcmnoc8dt	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	f	2026-03-16 21:19:16.497
cmmtorz15000ts3fm84vnl8hf	cmmo3sxn00007p1npldvr5svn	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	f	2026-03-16 21:19:16.505
cmmw40hpy000qez942ir9ueig	cmmo3svr60002p1npg39ix3rb	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 19/03/2026 à DAKAR.	/missions/cmmw40fsc000lez94blp2404f	f	2026-03-18 14:01:20.565
cmmw40j8t000sez94al33x7eb	cmmo3svdj0001p1npkybbwako	MISSION_CREATED	Nouvelle mission assignée	Mission « MISSION X » le 19/03/2026 à DAKAR.	/missions/cmmw40fsc000lez94blp2404f	f	2026-03-18 14:01:22.541
cmmo4wu4z000rak15h45mh4ji	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST TETSE	Vous êtes convoqué(e) le 12/03/2026	/meetings	t	2026-03-13 00:04:20.244
cmmw43vlz0019ez94ydp5y150	cmmo3svr60002p1npg39ix3rb	MISSION_UPDATED	Mission modifiée	La mission « MISSION X » a été modifiée. Lieu : DAKAR.	/missions/cmmw40fsc000lez94blp2404f	f	2026-03-18 14:03:58.535
cmmw43yyv001bez944y9nihch	cmmo3svdj0001p1npkybbwako	MISSION_UPDATED	Mission modifiée	La mission « MISSION X » a été modifiée. Lieu : DAKAR.	/missions/cmmw40fsc000lez94blp2404f	f	2026-03-18 14:04:02.887
cmn7gtci2000i130kojrxdfew	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 26/03/2026	/meetings	f	2026-03-26 12:45:10.154
cmn7hk780001i130kkuikzv91	cmmo3svr60002p1npg39ix3rb	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST "	/meetings	f	2026-03-26 13:06:03.025
cmn7hn4v8001s130k8r4knsir	cmmo3svdj0001p1npkybbwako	PLANNING_SUBMITTED	Nouveau planning soumis	undefined a soumis son planning	/plannings/cmn7hgp1e001g130kyuq0qjux	f	2026-03-26 13:08:19.941
cmn7gyh2z001e130ko40gkt3y	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST TETSE"	/meetings	t	2026-03-26 12:49:09.372
cmn7hor4f0022130kjwage5ez	cmmo3svr60002p1npg39ix3rb	PLANNING_SUBMITTED	Planning en attente de validation	Un planning est prêt pour validation	/plannings/cmn7hgp1e001g130kyuq0qjux	f	2026-03-26 13:09:35.439
cmmoo5x2h0005wlvx0ncfc9fn	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST 	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 09:03:16.649
cmmp029ro000qxnvooyidymrh	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TESTETE A	Vous êtes convoqué(e) le 13/03/2026	/meetings	t	2026-03-13 14:36:21.876
cmmtb9pnt000u6z3za1f0jxm6	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST	Vous êtes convoqué(e) le 16/03/2026	/meetings	t	2026-03-16 15:01:09.545
cmmtoryzp000ls3fmj4pmarqe	cmmo3sw3o0003p1nppenw0vmn	ADMIN_BROADCAST	TEST MAIL	JE TESTE	\N	t	2026-03-16 21:19:16.453
cmn7hn4wa001u130k0xh1g3kt	cmmo3sw3o0003p1nppenw0vmn	PLANNING_SUBMITTED	Planning soumis	Votre planning a été soumis avec succès et est en attente de consolidation	/plannings/cmn7hgp1e001g130kyuq0qjux	t	2026-03-26 13:08:19.978
cmn7hownx0026130kgw50tjg4	cmmo3sw3o0003p1nppenw0vmn	PLANNING_VALIDATED	Planning validé	Votre planning a été validé par le Directeur Général	/plannings/cmn7hgp1e001g130kyuq0qjux	t	2026-03-26 13:09:42.621
cmn7lr4ar000c46tu3jd73u3g	cmmo3swhb0004p1npbgv6f66x	MEETING_CONVOCATION	Convocation : TEST CONFLIT	Vous êtes convoqué(e) le 27/03/2026	/meetings	f	2026-03-26 15:03:24.291
cmn7lr1fn000a46tu95vxx809	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : TEST CONFLIT	Vous êtes convoqué(e) le 27/03/2026	/meetings	t	2026-03-26 15:03:20.579
cmn7lubjl000i46tud80coqqd	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de undefined	undefined a accepté votre réunion "TEST CONFLIT"	/meetings	t	2026-03-26 15:05:53.65
cmn7lvss1000q46tu0n5eauja	cmmo3swhb0004p1npbgv6f66x	MEETING_CANCELLED	Réunion annulée : TEST CONFLIT	La réunion du 27/03/2026 a été annulée	/meetings	f	2026-03-26 15:07:02.641
cmn7lvsrv000o46tu2tebxwaf	cmmo3sw3o0003p1nppenw0vmn	MEETING_CANCELLED	Réunion annulée : TEST CONFLIT	La réunion du 27/03/2026 a été annulée	/meetings	t	2026-03-26 15:07:02.635
cmn7ojf0l0003136ny8gc8kcv	cmmo3svdj0001p1npkybbwako	PLANNING_SUBMITTED	Nouveau planning soumis	Ousseynou KHOUMA — soumis par l'administration	/plannings/cmmqm1hqj0001h5j2vd8wdbam	f	2026-03-26 16:21:23.781
cmn9fvq3t000rue5fpg6yokf4	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de alhusseinkhouma0@gmail.com	alhusseinkhouma0@gmail.com (alhusseinkhouma0@gmail.com) a accepté votre réunion "TEST"	/meetings/cmn7gsvqw0009130kj9dnmxy2	t	2026-03-27 21:54:33.833
cmn9jyg4m000vw1vtxuqfsv9p	cmmo3svr60002p1npg39ix3rb	MISSION_CANCELLED	Mission annulée	La mission « ADM » (Saint Louis) a été annulée.	\N	f	2026-03-27 23:48:39.334
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
cmn9jyiuy000zw1vt87xlxxqh	cmmo3svdj0001p1npkybbwako	MISSION_CANCELLED	Mission annulée	La mission « ADM » (Saint Louis) a été annulée.	\N	f	2026-03-27 23:48:42.874
cmn9k158f000dlcnsz6xx0ge6	cmmo3svdj0001p1npkybbwako	MEETING_CONVOCATION	Convocation : DEMARRAGE PROJET	Vous êtes convoqué(e) le 10/04/2026 (Salle: TEST 11)	/meetings	f	2026-03-27 23:50:45.183
cmn9k16h9000flcnsfohnv3ek	cmmo3sw3o0003p1nppenw0vmn	MEETING_CONVOCATION	Convocation : DEMARRAGE PROJET	Vous êtes convoqué(e) le 10/04/2026 (Salle: TEST 11)	/meetings	f	2026-03-27 23:50:46.798
cmn9k12f6000blcnsy5penrhm	cmmot9cwj00008jo77uui1yor	MEETING_CONVOCATION	Convocation : DEMARRAGE PROJET	Vous êtes convoqué(e) le 10/04/2026 (Salle: TEST 11)	/meetings	t	2026-03-27 23:50:41.538
cmn9jyhfs000xw1vt31eddpv3	cmmot9cwj00008jo77uui1yor	MISSION_CANCELLED	Mission annulée	La mission « ADM » (Saint Louis) a été annulée.	\N	t	2026-03-27 23:48:41.033
cmn9k281b000llcnsipknv7le	cmmo3suxw0000p1np0eron6et	MEETING_CONVOCATION	Réponse de alhusseinkhouma0@gmail.com	alhusseinkhouma0@gmail.com (alhusseinkhouma0@gmail.com) a accepté votre réunion "DEMARRAGE PROJET"	/meetings/cmn9k09l20001lcns7xwbirzb	t	2026-03-27 23:51:35.471
cmn9k5q8a000xlcns2ggmi2p3	cmmot9cwj00008jo77uui1yor	ADMIN_BROADCAST	TEST	SALAM JE TESTE	\N	t	2026-03-27 23:54:19.018
\.


--
-- Data for Name: PasswordHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PasswordHistory" (id, "userId", "passwordHash", "createdAt") FROM stdin;
\.


--
-- Data for Name: Planning; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Planning" (id, "userId", "weekStart", "submittedAt", "consolidatedAt", "validatedAt", "returnedAt", status, "returnComment", "createdAt", "updatedAt") FROM stdin;
cmmo3vsdq000125fvs9onehwu	cmmo3sw3o0003p1nppenw0vmn	2026-03-12 23:35:31.662	\N	\N	\N	\N	DRAFT	\N	2026-03-12 23:35:31.695	2026-03-12 23:35:31.695
cmmtne8w90001s3fmbyxfpnf5	cmmo3sxn00007p1npldvr5svn	2026-03-16 00:00:00	\N	\N	\N	\N	DRAFT	\N	2026-03-16 20:40:36.49	2026-03-16 20:40:36.49
cmmqlgapx00017by4wcyj9dyp	cmmot9cwj00008jo77uui1yor	2026-03-09 00:00:00	2026-03-14 17:23:04.145	2026-03-16 20:40:50.709	2026-03-16 20:41:00.194	\N	VALIDATED	\N	2026-03-14 17:22:54.405	2026-03-16 20:41:00.203
cmn7hgp1e001g130kyuq0qjux	cmmo3sw3o0003p1nppenw0vmn	2026-03-23 00:00:00	2026-03-26 13:08:17.555	2026-03-26 13:09:35.43	2026-03-26 13:09:40.738	\N	VALIDATED	\N	2026-03-26 13:03:19.49	2026-03-26 13:09:40.74
cmn8v31oe000hhgyfi19o47vh	cmmot9cwj00008jo77uui1yor	2026-03-30 00:00:00	\N	\N	\N	\N	DRAFT	\N	2026-03-27 12:12:23.487	2026-03-27 12:12:23.487
\.


--
-- Data for Name: PlanningEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanningEvent" (id, "planningId", title, type, "startTime", "endTime", "roomId", destination, description, "createdAt", "directionId", "projectId") FROM stdin;
cmn7hlkqm001m130kgaqcv0eq	cmn7hgp1e001g130kyuq0qjux	TEST	FORMATION	2026-03-23 09:00:00	2026-03-23 10:00:00	cmmo3sxnf000bp1npckr3dy00	test	\N	2026-03-26 13:07:07.198	\N	\N
cmn7hmqlb001o130kz8s4h3wf	cmn7hgp1e001g130kyuq0qjux	TEST MISSION	MISSION	2026-03-27 09:00:00	2026-03-28 10:00:00	cmmo3sxnf000bp1npckr3dy00	\N	\N	2026-03-26 13:08:01.439	\N	\N
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, name, code, description, "isActive", "createdAt", "updatedAt") FROM stdin;
cmn9jtuw6000tw1vtec7ayogn	Premier projet	C00012	TEST PREMIER PROJET	t	2026-03-27 23:45:05.19	2026-03-27 23:45:05.19
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RefreshToken" (id, "userId", token, "expiresAt", "isRevoked", "createdAt") FROM stdin;
cmmo3tmlx0001o21qznfw7hm9	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzMzNTg0MzAsImV4cCI6MTc3Mzk2MzIzMH0.rhU_jbAOJhhh0i41i0jV1TDFURwjET4j3dOhbtV1FS0	2026-03-19 23:33:50.897	t	2026-03-12 23:33:50.899
cmmo3z3ng000725fv2x12mz5p	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTg2ODYsImV4cCI6MTc3Mzk2MzQ4Nn0.3lxbgRJAXgzgTzuc0VgEP9KHi7KE_PZ4kVvBau55rKE	2026-03-19 23:38:06.261	t	2026-03-12 23:38:06.268
cmmo41f8o000b25fvx30n767g	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzMzNTg3OTQsImV4cCI6MTc3Mzk2MzU5NH0.MkHaea8y4wkyPBIsui1EC4O1AR3CJ8ttjCmPycxKVKs	2026-03-19 23:39:54.589	t	2026-03-12 23:39:54.601
cmmo4ctvv0001htg30r0xfts1	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTkzMjYsImV4cCI6MTc3Mzk2NDEyNn0.PCYw4Mde_R315yMKpLb5fcS2L5DqwiE6AiivNJpVam8	2026-03-19 23:48:46.794	t	2026-03-12 23:48:46.796
cmmo4nv81000112gnxiwcs1l9	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzMzNTk4NDEsImV4cCI6MTc3Mzk2NDY0MX0.0tgp-wXyx-L-D4xPJ71yoH94jSANc_8_U8D-dgp8m-g	2026-03-19 23:57:21.74	t	2026-03-12 23:57:21.743
cmmo4ptse0001lvr2dm86yiul	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzNTk5MzMsImV4cCI6MTc3Mzk2NDczM30.MpXRy8PZBBzbIaJTIrGhNGKEiMid3ytUalxFTxvWGCU	2026-03-19 23:58:53.187	t	2026-03-12 23:58:53.199
cmmo4wbyg000dak15b5tiy8vd	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzMzNjAyMzYsImV4cCI6MTc3Mzk2NTAzNn0.PrsxMU_Mm1xBaS2Llocqi2jpsdBa1eDshuvBrXhoUPU	2026-03-20 00:03:56.678	t	2026-03-13 00:03:56.681
cmmom81yj0001ruospfdyvzj4	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzODkzMzcsImV4cCI6MTc3Mzk5NDEzN30.KnL_st6m6DoH-mQr8cW6EYFOskKaW-LQoNhuX42I8Wg	2026-03-20 08:08:57.035	t	2026-03-13 08:08:57.037
cmmom92km0005ruosau3otwv5	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzODkzODQsImV4cCI6MTc3Mzk5NDE4NH0.zXubzxxrc5AlssfED8onHxjFCop_hS0-551-kPk5cG4	2026-03-20 08:09:44.516	t	2026-03-13 08:09:44.518
cmmonkj6b0001r25v83lvfk1s	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzOTE1OTgsImV4cCI6MTc3Mzk5NjM5OH0.JLWozMNpd_x-rbK3HKlwHTCe9sTHVY3Y8_XUgZZIpkg	2026-03-20 08:46:38.866	t	2026-03-13 08:46:38.867
cmmonlabs0005r25v3273tdrt	cmmo3svr60002p1npg39ix3rb	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3ZyNjAwMDJwMW5wZzM5aXgzcmIiLCJpYXQiOjE3NzMzOTE2MzQsImV4cCI6MTc3Mzk5NjQzNH0.0cZ3CJ0Rd4ShP2GKVu44wkmNUSEKVPZYujLZ_P26Sl0	2026-03-20 08:47:14.056	t	2026-03-13 08:47:14.057
cmmoo9c1n0009wlvxy5hxr965	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzMzOTI3NTYsImV4cCI6MTc3Mzk5NzU1Nn0.lbbah0G5g3JPooOAeB_4_Yc0lFdW22LWR4zsOjCxsj4	2026-03-20 09:05:56.027	t	2026-03-13 09:05:56.028
cmmqmfhon0001hgk8jifwv1c3	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MTA2MTYsImV4cCI6MTc3NDExNTQxNn0.KQWSD1ktQ7BDiemLzRlHoKCup-fotmJjhfulzzEbRQE	2026-03-21 17:50:16.389	t	2026-03-14 17:50:16.391
cmmovl6nv00019wszyhf1cyay	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM0MDUwNjYsImV4cCI6MTc3NDAwOTg2Nn0.uSQSBi597K2VtAg8q1koU5PQZrKZqg6uaOFW0q7F3YA	2026-03-20 12:31:06.164	t	2026-03-13 12:31:06.165
cmmozx8620001xnvof01gh011	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM0MTIzNDYsImV4cCI6MTc3NDAxNzE0Nn0.79eDV0k77J6xPGaUMWPkw1tLA4abDS1FR7IpiQ7uca4	2026-03-20 14:32:26.489	t	2026-03-13 14:32:26.49
cmmozzqzx0005xnvorljbwb61	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM0MTI0NjQsImV4cCI6MTc3NDAxNzI2NH0.S8HpzbOZyGjOKn_vLYDX29EK2EXuemWW6widbjoknLE	2026-03-20 14:34:24.235	t	2026-03-13 14:34:24.237
cmmqsadcr0001swm28elrm7dv	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MjA0NTUsImV4cCI6MTc3NDEyNTI1NX0.WTQUee-Gpbbzf0HxlBxHoMi3vM_lC2dWHI38uK6Mp_g	2026-03-21 20:34:15.195	f	2026-03-14 20:34:15.196
cmmqj4irm0001g3pe8ie46vx4	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MDUwNjUsImV4cCI6MTc3NDEwOTg2NX0.1Wqj315dKE86DzrGMUMNNKWsPdGdNqR4CSc2qt2y26s	2026-03-21 16:17:45.694	t	2026-03-14 16:17:45.699
cmmqjq0ib0001btgmwtxi2hx0	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MDYwNjgsImV4cCI6MTc3NDExMDg2OH0.Ehk1gx7VzO-3Pr88eHiCJI_EOrZn3hdxUf5T3DN7PJw	2026-03-21 16:34:28.498	t	2026-03-14 16:34:28.5
cmmqlmlop0001snjkhfa1wa4l	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM1MDkyNjgsImV4cCI6MTc3NDExNDA2OH0.V5m4vjoskErC46aiR9kAZJptpgHmLutU1ZcJOiMdWlo	2026-03-21 17:27:48.552	t	2026-03-14 17:27:48.553
cmmt8sjfl00016z3z2mxxnzvc	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2NjkxMDksImV4cCI6MTc3NDI3MzkwOX0.GwX6Fu_oelcqMWZyVdT41zgqjcdDZgDnXLbcwdzwqB4	2026-03-23 13:51:49.086	t	2026-03-16 13:51:49.087
cmmtb5si400056z3zx9imn833	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzM2NzMwODYsImV4cCI6MTc3NDI3Nzg4Nn0.Hhej_hbP5sKfYhJuji1pC30WriKT4p5hFX_Iy2f_89o	2026-03-23 14:58:06.602	t	2026-03-16 14:58:06.604
cmmtb6hr900096z3zoio14gh9	cmmo3sxa90006p1npcmnoc8dt	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3hhOTAwMDZwMW5wY21ub2M4ZHQiLCJpYXQiOjE3NzM2NzMxMTksImV4cCI6MTc3NDI3NzkxOX0.vfx6DXmEW_qRrT1dp2huOXMGadCic51rbb7tTaGWaII	2026-03-23 14:58:39.33	t	2026-03-16 14:58:39.333
cmmotaqjl0001an2fojxzuhkv	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM0MDEyMTksImV4cCI6MTc3NDAwNjAxOX0.Eq2SPzbQfiIZnAyifu7iKEwkVqSYG6jI4Jg1SiXfzIU	2026-03-20 11:26:59.551	t	2026-03-13 11:26:59.553
cmmtbbctu000y6z3zu66c4cb6	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzM2NzMzNDYsImV4cCI6MTc3NDI3ODE0Nn0.z1hiok2CiU0p9NeCeF4EaG36lvcPO-gNrFAJWydcOoQ	2026-03-23 15:02:26.225	t	2026-03-16 15:02:26.226
cmmtmnz0i0001iqtmyggr03xq	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTI0MTAsImV4cCI6MTc3NDI5NzIxMH0.6oYMR1-ePaLfNQT17cXduX3OU2wtzMzY-kq2SqhSnlo	2026-03-23 20:20:10.595	t	2026-03-16 20:20:10.597
cmmtniaib000ds3fmp35s6fww	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTM4MjUsImV4cCI6MTc3NDI5ODYyNX0.Wjebc_1EstncMgdAVw__zxf-D3xSIBgwGUhm6ZZPqAI	2026-03-23 20:43:45.198	t	2026-03-16 20:43:45.204
cmmtoblww000hs3fmor2ieozu	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTUxOTMsImV4cCI6MTc3NDI5OTk5M30.BYdFYY6dMkkBrF9sKahrZSDAY1jU_t2_Zrf0_YW3o08	2026-03-23 21:06:33.006	f	2026-03-16 21:06:33.008
cmmtqi3kk000xs3fm9hpn2wxd	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM2OTg4NTUsImV4cCI6MTc3NDMwMzY1NX0.u46aBLYVR0OHfy_3XPv-jtfhawiq33wbwYiBYtLnDZo	2026-03-23 22:07:35.056	f	2026-03-16 22:07:35.06
cmmw3rzl00001ez945v2u4ezv	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDIwODMsImV4cCI6MTc3NDQ0Njg4M30.P5gXXuFXMbhSvMFTHgrFdwLtrnrPO4HYWz7wdLQTvvU	2026-03-25 13:54:43.807	t	2026-03-18 13:54:43.808
cmmw3wxut0005ez94yvxy7sxg	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDIzMTQsImV4cCI6MTc3NDQ0NzExNH0.IonLFQ8Wb6qlJug0XYYMJKkTy5a36kuZdsDH-oOkkMw	2026-03-25 13:58:34.852	t	2026-03-18 13:58:34.853
cmmw42z97000yez94tqxx0adm	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDI1OTYsImV4cCI6MTc3NDQ0NzM5Nn0.jWM8och1y0fFIzPUjD2lVMozYMybX5E5qmoyB7loKYk	2026-03-25 14:03:16.602	t	2026-03-18 14:03:16.603
cmmw44mdr001hez94biadt46f	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzM4NDI2NzMsImV4cCI6MTc3NDQ0NzQ3M30.dszSAjQgk-0melqrCvDt6mABtQkUt2tAoKkO0vegR_A	2026-03-25 14:04:33.229	t	2026-03-18 14:04:33.231
cmn7fruth0001ng5oh1pm36gd	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MjczNjAsImV4cCI6MTc3NTEzMjE2MH0.J8Eq5fY0mrYXLiy-8laxqwgfLhoc0Mcgz5AqwOB0mn8	2026-04-02 12:16:00.928	f	2026-03-26 12:16:00.929
cmn7gk5ho0001130ktsfafb55	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1Mjg2ODEsImV4cCI6MTc3NTEzMzQ4MX0.0b-W2A5oWDGRDkuFuLh8X3vjyi6WNUQu3-8lF5AXY3Q	2026-04-02 12:38:01.16	t	2026-03-26 12:38:01.164
cmn7gwian000y130kui2smrrx	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MjkyNTcsImV4cCI6MTc3NTEzNDA1N30.SUY7zhEyiFchYvoaeIOOXtzVGJsibjMEQnezrrO0CiQ	2026-04-02 12:47:37.63	t	2026-03-26 12:47:37.632
cmn7hns0h001w130k9siro8gn	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MzA1MjksImV4cCI6MTc3NTEzNTMyOX0.UDpOLgsVsAQmot1dMgRi3LiIRgCxPFf-wSggE3vZ-Qg	2026-04-02 13:08:49.937	t	2026-03-26 13:08:49.938
cmn7hpfod0028130kpzdaf3du	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MzA2MDcsImV4cCI6MTc3NTEzNTQwN30.4uvQbhzmvN7BhIw7GgwtzrVfdQ-7a77fShwuRxVd3EI	2026-04-02 13:10:07.26	t	2026-03-26 13:10:07.261
cmn7l0gfk00011p3ohbjuw7xk	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MzYxNjAsImV4cCI6MTc3NTE0MDk2MH0.mCoo4gFRO-g53MVnXXOXJhJBIPOmsOnIPHFWXSKXUQI	2026-04-02 14:42:40.295	t	2026-03-26 14:42:40.297
cmn7l142b00071p3ojuswqwgw	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MzYxOTAsImV4cCI6MTc3NTE0MDk5MH0.l8-ED1oE_6fWQKMAFHWKI5XDqlPudqCrAqdMP1tfmt8	2026-04-02 14:43:10.929	t	2026-03-26 14:43:10.931
cmn7l340i000d1p3ouc95t65f	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1MzYyODQsImV4cCI6MTc3NTE0MTA4NH0.SoF4a5eyySc_9d3glpnbupoyEdPeMx7RQAeqQY5zxmQ	2026-04-02 14:44:44.173	t	2026-03-26 14:44:44.178
cmn7grmcg0005130kseqmc7qb	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MjkwMjksImV4cCI6MTc3NTEzMzgyOX0.ZbJmM_JHsW1qOZRpbOC_U0-OvTsybHu032akrRz3EIs	2026-04-02 12:43:49.598	t	2026-03-26 12:43:49.6
cmn7l4rh4000f1p3oqnbcrezo	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ1MzYzNjEsImV4cCI6MTc3NTE0MTE2MX0.OZkitDZvSGqfvsu5SIFIKZuHTWVN44nK4IKVEuVR2Kk	2026-04-02 14:46:01.239	t	2026-03-26 14:46:01.24
cmn7ltqyf000g46tukpddugg6	cmmo3sw3o0003p1nppenw0vmn	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3czbzAwMDNwMW5wcGVudzB2bW4iLCJpYXQiOjE3NzQ1Mzc1MjYsImV4cCI6MTc3NTE0MjMyNn0.gsB8n24hFJK7gpxJTtv1Ad_xgxkPTsO3HHcXmoTdYo8	2026-04-02 15:05:26.964	t	2026-03-26 15:05:26.968
cmn8tovnj0001hgyf8la7hlr7	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2MTEyMDIsImV4cCI6MTc3NTIxNjAwMn0.l2LcT7Gtj_GzAdgQhW7qh_MIJqb-1ZPGy52wf3G-NSc	2026-04-03 11:33:22.812	t	2026-03-27 11:33:22.813
cmmp063i6000vxnvoqshk67us	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM0MTI3NjAsImV4cCI6MTc3NDAxNzU2MH0.ZriuGjzdKGcw1N5mmKcaqwTLibJn1w6Ru8rYamWoeVE	2026-03-20 14:39:20.38	t	2026-03-13 14:39:20.382
cmmql59ey0001q3oksrnmg26p	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM1MDg0NTksImV4cCI6MTc3NDExMzI1OX0.Si7auiHnsMdMEUOalVHgrGOftoTInF1ccP5s7t1D7JU	2026-03-21 17:14:19.496	t	2026-03-14 17:14:19.498
cmmqm200s0005h5j2p7sj4g3h	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzM1MDk5ODYsImV4cCI6MTc3NDExNDc4Nn0.pmPAvRW2c_MrlLhTcdc-UUqswuR1h1XIqwu-gOeV3JM	2026-03-21 17:39:46.97	t	2026-03-14 17:39:46.972
cmn92byvz0001eggqqle7qepy	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2MjU3MTcsImV4cCI6MTc3NTIzMDUxN30.3Ruh4uykGgRukcuz-GXfBuPhDaDQj6kpmMzl_fiwBxE	2026-04-03 15:35:17.086	t	2026-03-27 15:35:17.088
cmn90jc8c00012lja7xxxaf4l	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2MjI3MDEsImV4cCI6MTc3NTIyNzUwMX0.cPQY_U_QXVUUwg8d-dwswKc5kTI99WHJz3izt89XFd8	2026-04-03 14:45:01.735	t	2026-03-27 14:45:01.737
cmn94d2850005lglkorxa2nqp	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2MjkxMjcsImV4cCI6MTc3NTIzMzkyN30.vTYQmrcnJmPS8-Ak8WbdAm1i1VOJOc7Ws_hPXWk_h5o	2026-04-03 16:32:07.299	f	2026-03-27 16:32:07.302
cmn9f81mq0001ue5f18n93b52	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2NDczNjksImV4cCI6MTc3NTI1MjE2OX0.ughilC2NaAR8US7LUWIZEjyyqjJvfBSAEemWQ2WfbGI	2026-04-03 21:36:09.019	f	2026-03-27 21:36:09.021
cmn9fmiwk000bue5fmlqq35hp	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2NDgwNDQsImV4cCI6MTc3NTI1Mjg0NH0.9r9NOG6D1okRPTQSf9nR0hAgXdwZIzIgEVKipCzY_C8	2026-04-03 21:47:24.595	f	2026-03-27 21:47:24.596
cmn9fp6b9000fue5f6mdklw6w	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2NDgxNjgsImV4cCI6MTc3NTI1Mjk2OH0.OjnRMG6OkxPd5dTxeswhoBGhNvStXtFd9X-l_bnYAzA	2026-04-03 21:49:28.242	f	2026-03-27 21:49:28.245
cmn9jk0hz000ew1vt3555rvmc	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ2NTQ2NDUsImV4cCI6MTc3NTI1OTQ0NX0.9-UsSuRh-mkwjlnmi-PrAUKxCOUrLUxymzILNi51EPA	2026-04-03 23:37:25.894	t	2026-03-27 23:37:25.896
cmn9h1w1b0001roushozzf7lq	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ2NTA0NDEsImV4cCI6MTc3NTI1NTI0MX0.HxtsZtUcBuzuiEOkVQxfJiuQ_XDMCz9HFkOfm6oOMX8	2026-04-03 22:27:21.069	t	2026-03-27 22:27:21.072
cmnbtqrsd00073448j3h5g3l8	cmmot9cwj00008jo77uui1yor	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW90OWN3ajAwMDA4am83N3V1aTF5b3IiLCJpYXQiOjE3NzQ3OTI2ODksImV4cCI6MTc3NTM5NzQ4OX0.QLnQWsZNDIxgcxD2iCnvVBUKVDUR7hNGCWzsQlRw64c	2026-04-05 13:58:09.708	f	2026-03-29 13:58:09.709
cmnbtdrxk00013448ki3xma8x	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ3OTIwODMsImV4cCI6MTc3NTM5Njg4M30.ZdB2OVSL5gi2mG_dGBjk-YvBtdOugukA771VOKGnris	2026-04-05 13:48:03.36	t	2026-03-29 13:48:03.362
cmnbu6yw60001oclyy8z5bmze	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ3OTM0NDUsImV4cCI6MTc3NTM5ODI0NX0.T6hJOTSZ9PBLp9Xt2YFU4yDfEjxPTQMAPUDoSi13Nto	2026-04-05 14:10:45.413	t	2026-03-29 14:10:45.414
cmnbuhk4800011202hnr6mqyq	cmmo3suxw0000p1np0eron6et	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbW8zc3V4dzAwMDBwMW5wMGVyb242ZXQiLCJpYXQiOjE3NzQ3OTM5MzksImV4cCI6MTc3NTM5ODczOX0.9kBlBoG5ygsf1S93ipXch4yOam9WXmqJLGtDzOnU7Gg	2026-04-05 14:18:59.48	f	2026-03-29 14:18:59.48
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
cmmo4ts6v000hlvr2ov1iw1nf	cmmo3sxne000ap1npvo2sif1m	cmmo4sswp0005lvr2qs2c0fi5	cmmo3suxw0000p1np0eron6et	2026-03-12 20:00:00	20:00	23:58	CONFIRMED	2026-03-13 00:01:57.751
cmmo456ah000h25fv4iubc8n2	cmmo3sxnf000bp1npckr3dy00	cmmo44zkc000f25fvcxaavyfo	cmmo3sxa90006p1npcmnoc8dt	2026-03-12 12:00:00	12:00	19:00	CANCELLED	2026-03-12 23:42:49.626
cmmonz3ra00052h1etu8axhvd	cmmo3sxne000ap1npvo2sif1m	cmmonyxrn00012h1eb9y2mh4y	cmmo3svr60002p1npg39ix3rb	2026-03-13 08:00:00	08:00	10:00	CONFIRMED	2026-03-13 08:57:58.727
cmmp021jo000ixnvoe6vu840a	cmmo3sxne000ap1npvo2sif1m	cmmp01rza0009xnvoupogf5ih	cmmo3suxw0000p1np0eron6et	2026-03-13 00:00:00	00:00	03:00	CONFIRMED	2026-03-13 14:36:11.22
cmmtb9j63000m6z3zsubsoetw	cmmo3sxne000ap1npvo2sif1m	cmmtb872p000d6z3zuc4zios4	cmmo3sxa90006p1npcmnoc8dt	2026-03-16 09:00:00	09:00	20:00	CONFIRMED	2026-03-16 15:01:01.131
cmmw3z125000fez94tjslxxon	cmmo3sxnf000bp1npckr3dy00	cmmw3ypk40009ez94hsy51nu9	cmmo3suxw0000p1np0eron6et	2026-03-18 17:00:00	17:00	20:00	CONFIRMED	2026-03-18 14:00:12.318
cmn7gt9o0000g130kuig6vg5k	cmmo3sxnf000bp1npckr3dy00	cmn7gsvqw0009130kj9dnmxy2	cmmo3suxw0000p1np0eron6et	2026-03-26 16:00:00	16:00	22:00	CONFIRMED	2026-03-26 12:45:06.48
cmn7lqwt3000846tui0vhzhbq	cmmo3sxnc0009p1npornnr929	cmn7lpoxm000146tuwhf71n06	cmmo3suxw0000p1np0eron6et	2026-03-27 13:00:00	13:00	13:30	CANCELLED	2026-03-26 15:03:14.584
cmmo3xnct000525fv34oqgfu1	cmmo3sxnf000bp1npckr3dy00	cmmo3x0vv000325fvzt6a05on	cmmo3sw3o0003p1nppenw0vmn	2026-03-12 08:00:00	08:00	10:00	CONFIRMED	2026-03-12 23:36:58.493
cmn9k10l90009lcnskmbf7171	cmmp046d8000txnvof8s2ztet	cmn9k09l20001lcns7xwbirzb	cmmo3suxw0000p1np0eron6et	2026-04-10 00:00:00	00:00	00:00	CONFIRMED	2026-03-27 23:50:39.165
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt", "avatarUrl", "isDeleted", "twoFactorEnabled", "twoFactorSecret") FROM stdin;
cmmo3swhb0004p1npbgv6f66x	Responsable 2	responsable2@example.com	$2b$12$pxgPNuZzZtmh/2myDBBTCezmwfaK65ol1B36AJ66zn85Kq/XP1MM6	RESPONSABLE	t	2026-03-12 23:33:17.039	2026-03-12 23:33:17.039	\N	f	f	\N
cmmo3swu20005p1nphypodze0	Responsable 3	responsable3@example.com	$2b$12$zKw7Ib2TMndmAkmyr34zf.bc8gz1T8AA31qVvi.OaKLdciX690GxG	RESPONSABLE	t	2026-03-12 23:33:17.498	2026-03-12 23:33:17.498	\N	f	f	\N
cmmo3sxa90006p1npcmnoc8dt	Responsable 4	responsable4@example.com	$2b$12$mfRGKGV2beUTKSj3BiuARuu/P/EYyXNzUv2fFzkr2Duzs7jpVmr5i	RESPONSABLE	t	2026-03-12 23:33:18.081	2026-03-12 23:33:18.081	\N	f	f	\N
cmmo3sxn00007p1npldvr5svn	Responsable 5	responsable5@example.com	$2b$12$RQ3.JSiLz4pRvEzPhW8Ro.f3OqyIgsXD0yJZ5apbFKQOECOvLnWVO	RESPONSABLE	t	2026-03-12 23:33:18.54	2026-03-12 23:33:18.54	\N	f	f	\N
cmmo3svr60002p1npg39ix3rb	Directeur General	dg@example.com	$2b$12$OIFvd.T4KxgdBwccTp14PO2ARQq1Xo99ZxF6AVGUx6eewsdEdLola	DG	t	2026-03-12 23:33:16.098	2026-03-13 08:19:56.722	\N	f	f	\N
cmmo3svdj0001p1npkybbwako	Mansour BOCOUM	mansour.bocoum@example.com	$2b$12$FcgWBWM56D4HLty4MJ/yeOt3Xk.lawEutJFiDpNiSkPTUjf0j7D/m	CONSOLIDATEUR	t	2026-03-12 23:33:15.607	2026-03-16 22:13:53.085	\N	f	f	\N
cmmo3sw3o0003p1nppenw0vmn	Responsable 1	responsable1@example.com	$2b$12$ct2eztYLzJyqd7m0cvDbJuU3eTPT5fUWfK8tVl8bC3yKImv/WRFJi	RESPONSABLE	t	2026-03-12 23:33:16.549	2026-03-26 14:45:15.574	/uploads/avatars/cmmo3sw3o0003p1nppenw0vmn.png	f	t	KFKFQYZSGA4EOR26O4XVIYKFI54WO5KJ
cmmot9cwj00008jo77uui1yor	Ousseynou KHOUMA	alhusseinkhouma0@gmail.com	$2b$12$/hIgVNvnOM/jxGaDlmPCmeEJ9gLqSeTkSbecvoj4gg6VehBDS505u	RESPONSABLE	t	2026-03-13 11:25:55.219	2026-03-28 00:20:57.487	/uploads/avatars/cmmot9cwj00008jo77uui1yor.png	f	f	\N
cmmo3suxw0000p1np0eron6et	Admin User	admin@example.com	$2b$12$c98oxZQqgqYnD4HDnzF0dOna0lUO0FaYOWQIsOAuL0uHogCz6UX8W	SUPER_ADMIN	t	2026-03-12 23:33:15.042	2026-03-29 14:13:00.356	/uploads/avatars/cmmo3suxw0000p1np0eron6et.webp	f	f	\N
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
-- Name: Project_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_code_key" ON public."Project" USING btree (code);


--
-- Name: Project_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_name_key" ON public."Project" USING btree (name);


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: RoomBooking_meetingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RoomBooking_meetingId_key" ON public."RoomBooking" USING btree ("meetingId");


--
-- Name: Room_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Room_name_key" ON public."Room" USING btree (name);


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
-- PostgreSQL database dump complete
--

\unrestrict KwTqwk32ihxayve0XPyNs2QQHnRaQK3v7XkgbTzhvhu393IY4GV9tc9N0rg0EDq

