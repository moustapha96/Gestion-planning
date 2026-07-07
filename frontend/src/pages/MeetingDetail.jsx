import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Typography,
    Tag,
    Button,
    Space,
    Spin,
    Descriptions,
    List,
    App,
    Form,
    Modal,
    Input,
    Select,
    DatePicker,
    Avatar,
    Upload,
    Image,
    Popconfirm,
    Tooltip,
    Alert,
} from 'antd';
import {
    ArrowLeftOutlined,
    SendOutlined,
    StopOutlined,
    CheckCircleOutlined,
    RollbackOutlined,
    TeamOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
    EditOutlined,
    PaperClipOutlined,
    DeleteOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    MessageOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { API_BASE } from '../api/client';
import { appDayjs, formatDateTime, formatDateTimeLocale, toUtcIso } from '../utils/datetime';
import ValidationWorkflowBanner from '../components/ValidationWorkflowBanner';
import { useAuth } from '../context/AuthContext';
import { enqueueRealtimeTask } from '../realtime/socket';
import {
    isPrivilegedAdmin,
    canPrivilegedForceDelete,
    canSuperAdminForceDelete,
    canConsolidateMeeting,
    canCoordinateMeeting,
    canFinalizeMeeting,
    canApproveMeeting,
    canManageMeeting,
    canEditMeeting,
    meetingNeedsConsolidatorApproval,
    isPendingCoordinatorStatus,
    isPendingConsolidatorStatus,
} from '../utils/roles';
import { forceDeleteDescription, forceDeleteTitle } from '../utils/deleteConfirm';
import ForceDeletePopconfirm from '../components/ForceDeletePopconfirm';
import { PDF_ACCEPT, isAcceptedPdfFile } from '../utils/pdfAttachment';

const { Title, Text } = Typography;

import { meetingStatusLabel } from '../utils/statusLabels';

const STATUS_COLORS = {
    DRAFT: 'default',
    CONSOLIDATOR_PENDING: 'orange',
    COORDINATOR_PENDING: 'geekblue',
    SENT: 'blue',
    CONFIRMED: 'green',
    COMPLETED: 'cyan',
    CANCELLED: 'red',
};

const INV_STATUS = { PENDING: 'En attente', ACCEPTED: 'Acceptée', DECLINED: 'Refusée' };

export default function MeetingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { message, modal, notification } = App.useApp();
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editVisible, setEditVisible] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [eventTypes, setEventTypes] = useState([]);
    const [form] = Form.useForm();
    const [addVisible, setAddVisible] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [addForm] = Form.useForm();
    const [addParticipantsError, setAddParticipantsError] = useState('');
    const [attachmentLoading, setAttachmentLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [approveLoading, setApproveLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [completeLoading, setCompleteLoading] = useState(false);
    const [reopenLoading, setReopenLoading] = useState(false);
    const [addParticipantsLoading, setAddParticipantsLoading] = useState(false);
    const [chatText, setChatText] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [integratedVisioEnabled, setIntegratedVisioEnabled] = useState(true);
    const [visioOpen, setVisioOpen] = useState(false);
    const [visioReady, setVisioReady] = useState(false);
    const jitsiContainerRef = useRef(null);
    const jitsiApiRef = useRef(null);
    /** IDs de messages déjà connus (évite popup sur l’historique au 1er chargement) */
    const meetingMsgSeenIdsRef = useRef(new Set());
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const jitsiRoomName = useMemo(() => {
        if (!meeting?.id) return '';
        return `gestion-planning-${meeting.id}`.replace(/[^a-zA-Z0-9-_]/g, '');
    }, [meeting?.id]);

    const formatConflictError = (err) => {
        const data = err?.response?.data || {};
        const base = data.error || 'Conflit de planning détecté';
        if (!data.userId) return base;
        const u = allUsers.find((x) => x.id === data.userId);
        if (!u) return base;
        return `${base} Utilisateur concerné : ${u.name} (${u.email}).`;
    };
    const upsertMeetingMessage = (incoming) => {
        if (!incoming?.id) return;
        setMeeting((prev) => {
            if (!prev) return prev;
            const list = Array.isArray(prev.messages) ? [...prev.messages] : [];
            const idx = list.findIndex((m) => m.id === incoming.id);
            if (idx >= 0) list[idx] = { ...list[idx], ...incoming };
            else list.push(incoming);
            list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            return { ...prev, messages: list };
        });
    };
    const removeMeetingMessageById = (messageId) => {
        setMeeting((prev) => {
            if (!prev) return prev;
            return { ...prev, messages: (prev.messages || []).filter((m) => m.id !== messageId) };
        });
    };
    const patchMeetingMessageById = (messageId, patch) => {
        setMeeting((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                messages: (prev.messages || []).map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
            };
        });
    };

    const fetchMeeting = async () => {
        try {
            const res = await api.get(`/meetings/${id}`);
            setMeeting(res.data);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 403) {
                message.error('Vous n\'avez pas accès à cette réunion');
            } else if (status === 404) {
                message.error('Réunion introuvable');
            } else {
                message.error(err?.response?.data?.error || 'Impossible de charger la réunion');
            }
            navigate('/meetings');
        } finally {
            setLoading(false);
        }
    };

    const refreshMeetingSilently = async () => {
        try {
            const res = await api.get(`/meetings/${id}`);
            const data = res.data;
            if (!data) return;
            const serverMsgs = Array.isArray(data.messages) ? data.messages : [];

            if (meetingMsgSeenIdsRef.current.size > 0 && document.visibilityState === 'visible') {
                for (const m of serverMsgs) {
                    if (!m?.id || meetingMsgSeenIdsRef.current.has(m.id)) continue;
                    if (m.senderId && m.senderId !== user?.id && !String(m.id).startsWith('tmp-')) {
                        const preview = String(m.body || '').slice(0, 160);
                        notification.open({
                            key: `meet-msg-${m.id}`,
                            message: `Discussion réunion · ${m.sender?.name || 'Participant'}`,
                            description: preview || 'Nouveau message',
                            placement: 'topRight',
                            duration: 5,
                        });
                    }
                }
            }
            serverMsgs.forEach((m) => { if (m?.id) meetingMsgSeenIdsRef.current.add(m.id); });

            setMeeting((prev) => {
                const next = { ...(prev || {}), ...data };
                if (!Array.isArray(data.messages)) return next;
                const byId = new Map(data.messages.map((m) => [m.id, m]));
                for (const m of prev?.messages || []) {
                    if (String(m?.id || '').startsWith('tmp-')) byId.set(m.id, m);
                }
                next.messages = [...byId.values()].sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                );
                return next;
            });
        } catch {
            // silence pendant le polling
        }
    };

    useEffect(() => {
        meetingMsgSeenIdsRef.current = new Set();
        fetchMeeting();
    }, [id]);

    useEffect(() => {
        const loadVisioSetting = async () => {
            try {
                const { data } = await api.get('/admin/settings/public');
                const enabled = String(data?.integrated_visio_enabled ?? 'true') === 'true';
                setIntegratedVisioEnabled(enabled);
                if (!enabled) setVisioOpen(false);
            } catch {
                // fallback permissif: activé par défaut si endpoint indisponible
                setIntegratedVisioEnabled(true);
            }
        };
        loadVisioSetting();
    }, []);

    // Discussion réunion : uniquement HTTP (pas de WebSocket) — rafraîchissement régulier + au retour sur l’onglet.
    useEffect(() => {
        if (!id) return undefined;
        const tick = () => {
            if (document.visibilityState === 'visible') refreshMeetingSilently();
        };
        tick();
        const interval = setInterval(tick, 4000);
        const onFocus = () => tick();
        const onVis = () => tick();
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [id]);

    useEffect(() => {
        if (editVisible) {
            api.get('/rooms').then((r) => setRooms(r.data || [])).catch(() => setRooms([]));
            api.get('/events/taxonomy')
                .then((r) => setEventTypes(r.data?.eventTypes || []))
                .catch(() => setEventTypes([]));
            if (meeting) {
                form.setFieldsValue({
                    title: meeting.title,
                    agenda: meeting.agenda,
                    roomId: meeting.roomId || undefined,
                    eventTypeId: meeting.eventTypeId || meeting.eventType?.id || undefined,
                    meetingLink: meeting.meetingLink || '',
                    startTime: meeting.startTime ? appDayjs(meeting.startTime) : null,
                    endTime: meeting.endTime ? appDayjs(meeting.endTime) : null,
                });
            }
        }
    }, [editVisible, meeting]);

    useEffect(() => {
        if (!meeting) return;
        const isOrganizer = meeting.organizerId === user?.id;
        if (!isOrganizer && !isPrivilegedAdmin(user?.role)) return;
        api.get('/users/participants')
            .then((r) => setAllUsers(r.data || []))
            .catch(() => setAllUsers([]));
    }, [meeting, user?.id, user?.role]);

    const handleEditSubmit = async () => {
        setUpdateLoading(true);
        try {
            const v = await form.validateFields();
            const link = String(v.meetingLink || '').trim();
            if (!v.roomId && !link) {
                message.error('Renseignez une salle ou un lien de visioconférence');
                return;
            }
            if (link) {
                try {
                    const u = new URL(link);
                    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('invalid');
                } catch {
                    message.error('Lien de visioconférence invalide (http/https requis)');
                    return;
                }
            }
            await api.put(`/meetings/${id}`, {
                title: v.title,
                agenda: v.agenda,
                roomId: v.roomId || null,
                eventTypeId: v.eventTypeId || null,
                meetingLink: link || null,
                startTime: toUtcIso(v.startTime),
                endTime: toUtcIso(v.endTime),
            });
            message.success('Réunion modifiée. Les participants seront notifiés par email en cas de changement d\'horaire.');
            setEditVisible(false);
            fetchMeeting();
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleApprove = async (mode = 'approve') => {
        setApproveLoading(true);
        try {
            if (mode === 'coordinate' || mode === 'finalize') {
                await api.put(`/meetings/${id}/approve-coordinator`);
                message.success(
                    mode === 'finalize'
                        ? 'Réunion validée définitivement et publiée sur le calendrier'
                        : 'Réunion validée par le coordinateur — transmise au rôle Consolidateur',
                );
            } else if (mode === 'consolidate') {
                await api.put(`/meetings/${id}/approve`);
                message.success('Réunion consolidée et publiée sur le calendrier');
            } else {
                await api.put(`/meetings/${id}/approve`);
                message.success('Réunion validée et publiée sur le calendrier');
            }
            fetchMeeting();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de la validation');
        } finally {
            setApproveLoading(false);
        }
    };

    const makeUploadRequest = (kind) => async ({ file, onSuccess, onError }) => {
        if (file.size > MAX_FILE_SIZE) {
            message.error('Le fichier dépasse 15 Mo');
            onError?.(new Error('too large'));
            return;
        }
        if (!isAcceptedPdfFile(file)) {
            message.error('Seuls les fichiers PDF (.pdf) sont acceptés.');
            onError?.(new Error('not pdf'));
            return;
        }
        setAttachmentLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('kind', kind);
            await api.post(`/meetings/${id}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('PDF ajouté');
            onSuccess?.('ok');
            fetchMeeting();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
            onError?.(err);
        } finally {
            setAttachmentLoading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        try {
            await api.delete(`/meetings/${id}/files/${fileId}`);
            message.success('Fichier supprimé');
            fetchMeeting();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const isSuperAdmin = canSuperAdminForceDelete(user?.role);

    const handleCancel = () => {
        modal.confirm({
            title: 'Annuler la réunion',
            content: 'Confirmer l’annulation ? Les participants seront notifiés.',
            okText: 'Annuler la réunion',
            okButtonProps: { danger: true },
            onOk: async () => {
                setCancelLoading(true);
                try {
                    await api.put(`/meetings/${id}/cancel`);
                    message.success('Réunion annulée');
                    fetchMeeting();
                } catch (err) {
                    message.error(err.response?.data?.error || 'Erreur');
                } finally {
                    setCancelLoading(false);
                }
            },
        });
    };

    const handlePermanentDeleteMeeting = async () => {
        setDeleteLoading(true);
        try {
            await api.delete(`/meetings/${id}`);
            message.success('Réunion supprimée définitivement');
            navigate('/meetings');
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleComplete = () => {
        modal.confirm({
            title: 'Terminer la réunion',
            content: 'Confirmer la clôture de cette réunion ?',
            okText: 'Terminer',
            onOk: async () => {
                setCompleteLoading(true);
                try {
                    await api.put(`/meetings/${id}/complete`);
                    message.success('Réunion marquée comme terminée');
                    fetchMeeting();
                } catch (err) {
                    message.error(err.response?.data?.error || 'Erreur');
                } finally {
                    setCompleteLoading(false);
                }
            },
        });
    };

    const handleReopen = () => {
        modal.confirm({
            title: 'Rouvrir la réunion',
            content: 'Confirmer la réouverture de cette réunion terminée ?',
            okText: 'Rouvrir',
            onOk: async () => {
                setReopenLoading(true);
                try {
                    await api.put(`/meetings/${id}/reopen`);
                    message.success('Réunion rouverte');
                    fetchMeeting();
                } catch (err) {
                    message.error(err.response?.data?.error || 'Erreur');
                } finally {
                    setReopenLoading(false);
                }
            },
        });
    };

    const respondInvitation = async (invitationId, status) => {
        try {
            await api.post(`/meetings/invitations/${invitationId}/respond`, { status });
            message.success(status === 'ACCEPTED' ? 'Participation acceptée' : 'Participation déclinée');
            fetchMeeting();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const handleAddParticipants = async () => {
        setAddParticipantsLoading(true);
        setAddParticipantsError('');
        try {
            const v = await addForm.validateFields();
            const ids = v.userIds || [];
            if (!ids.length) {
                message.warning('Sélectionnez au moins un participant');
                return;
            }
            await api.post(`/meetings/${id}/participants`, { userIds: ids });
            message.success('Participants ajoutés');
            setAddVisible(false);
            addForm.resetFields();
            setAddParticipantsError('');
            fetchMeeting();
        } catch (err) {
            if (err.errorFields) return;
            const msg = formatConflictError(err) || 'Erreur lors de l\'ajout de participants';
            setAddParticipantsError(msg);
            message.error(msg);
        } finally {
            setAddParticipantsLoading(false);
        }
    };

    const handleSendChatMessage = async () => {
        const body = chatText.trim();
        if (!body) return;
        const tempId = `tmp-meeting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempMessage = {
            id: tempId,
            meetingId: id,
            senderId: user?.id,
            body,
            createdAt: new Date().toISOString(),
            parent: replyingTo || null,
            sender: {
                id: user?.id,
                name: user?.name || 'Vous',
                email: user?.email || '',
                avatarUrl: user?.avatarUrl || null,
            },
            _optimistic: true,
            _queued: false,
            _failed: false,
            _retry: { body, parentId: replyingTo?.id || null },
        };
        upsertMeetingMessage(tempMessage);
        setChatSending(true);
        const runSend = async ({ fromQueue = false } = {}) => {
            try {
                const { data: created } = await api.post(`/meetings/${id}/messages`, { body, parentId: replyingTo?.id || null });
                removeMeetingMessageById(tempId);
                upsertMeetingMessage(created);
                setChatText('');
                setReplyingTo(null);
                refreshMeetingSilently();
                if (fromQueue && document.visibilityState === 'visible') {
                    message.success('Message de réunion envoyé.');
                }
            } catch (err) {
                if (!err?.response) {
                    patchMeetingMessageById(tempId, { _optimistic: false, _queued: true, _failed: false });
                    enqueueRealtimeTask(() => runSend({ fromQueue: true }), { type: 'meeting-message', meetingId: id });
                    if (!fromQueue) message.info('Sans réseau : message en attente — envoi automatique à la reconnexion.');
                    return;
                }
                patchMeetingMessageById(tempId, { _optimistic: false, _queued: false, _failed: true });
                if (!fromQueue) message.error(err.response?.data?.error || 'Erreur envoi message');
            }
        };
        try {
            await runSend();
        } finally {
            setChatSending(false);
        }
    };
    const retryMeetingMessage = async (m) => {
        if (!m?._retry) return;
        patchMeetingMessageById(m.id, { _optimistic: true, _queued: false, _failed: false });
        const runRetry = async ({ fromQueue = false } = {}) => {
            try {
                const { data: created } = await api.post(`/meetings/${id}/messages`, m._retry);
                removeMeetingMessageById(m.id);
                upsertMeetingMessage(created);
                refreshMeetingSilently();
                if (fromQueue && document.visibilityState === 'visible') {
                    message.success('Message de réunion envoyé.');
                }
            } catch (err) {
                if (!err?.response) {
                    patchMeetingMessageById(m.id, { _optimistic: false, _queued: true, _failed: false });
                    enqueueRealtimeTask(() => runRetry({ fromQueue: true }), { type: 'meeting-message-retry', meetingId: id });
                    if (!fromQueue) message.info('Sans réseau : renvoi automatique à la reconnexion.');
                    return;
                }
                patchMeetingMessageById(m.id, { _optimistic: false, _queued: false, _failed: true });
                if (!fromQueue) message.error(err.response?.data?.error || 'Erreur envoi message');
            }
        };
        await runRetry();
    };

    const deleteMeetingMessage = async (m) => {
        if (!m?.id || String(m.id).startsWith('temp')) return;
        try {
            await api.delete(`/meetings/${id}/messages/${m.id}`);
            removeMeetingMessageById(m.id);
            message.success('Message supprimé');
            refreshMeetingSilently();
        } catch (err) {
            message.error(err.response?.data?.error || 'Suppression impossible');
        }
    };

    useEffect(() => {
        if (!visioOpen || !jitsiContainerRef.current || !jitsiRoomName) return undefined;

        let disposed = false;
        const initJitsi = async () => {
            try {
                if (!window.JitsiMeetExternalAPI) {
                    await new Promise((resolve, reject) => {
                        const existing = document.querySelector('script[data-jitsi-external-api="true"]');
                        if (existing) {
                            existing.addEventListener('load', resolve, { once: true });
                            existing.addEventListener('error', reject, { once: true });
                            return;
                        }
                        const script = document.createElement('script');
                        script.src = 'https://meet.jit.si/external_api.js';
                        script.async = true;
                        script.dataset.jitsiExternalApi = 'true';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }

                if (disposed || !window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

                if (jitsiApiRef.current) {
                    jitsiApiRef.current.dispose();
                    jitsiApiRef.current = null;
                }

                const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
                    roomName: jitsiRoomName,
                    parentNode: jitsiContainerRef.current,
                    width: '100%',
                    height: 560,
                    userInfo: {
                        displayName: user?.name || 'Utilisateur',
                        email: user?.email || '',
                    },
                    configOverwrite: {
                        prejoinPageEnabled: true,
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                    },
                    interfaceConfigOverwrite: {
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                    },
                });
                jitsiApiRef.current = api;
                setVisioReady(true);
            } catch {
                message.error('Impossible de charger la visio intégrée.');
                setVisioOpen(false);
                setVisioReady(false);
            }
        };

        initJitsi();

        return () => {
            disposed = true;
            setVisioReady(false);
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
        };
    }, [visioOpen, jitsiRoomName, user?.name, user?.email]);

    if (loading || !meeting) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" />
            </div>
        );
    }

    const isOrganizer = meeting.organizerId === user?.id;
    const needsCoordinator = meetingNeedsConsolidatorApproval(meeting) && meeting.status === 'DRAFT';
    const needsConsolidator = isPendingConsolidatorStatus(meeting.status);
    const needsFinalApproval = isPendingCoordinatorStatus(meeting.status);
    const canManage = canManageMeeting(meeting, user);
    const canCoordinate = canCoordinateMeeting(meeting, user);
    const canConsolidate = canConsolidateMeeting(meeting, user);
    const canFinalize = canFinalizeMeeting(meeting, user);
    const canApproveDirect = canApproveMeeting(meeting, user);
    const canComplete = canManage && meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED';
    const canCancel = canManage && meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED';
    const canReopen = meeting.status === 'COMPLETED' && (canManage || user?.role === 'RESPONSABLE');
    const canEdit = canEditMeeting(meeting, user);
    const canForceDelete = canPrivilegedForceDelete(user?.role);
    const isInvitedAccepted = meeting.invitations?.some((inv) => inv.userId === user?.id && inv.status === 'ACCEPTED');
    const canChat = meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED' && (isOrganizer || isInvitedAccepted || isPrivilegedAdmin(user?.role));
    const canUseVisio = integratedVisioEnabled && meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED' && (isOrganizer || isInvitedAccepted || isPrivilegedAdmin(user?.role));

    return (
        <div>
            <Space style={{ marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/meetings')}>
                    Retour aux réunions
                </Button>
                {canEdit && (
                    <Button icon={<EditOutlined />} onClick={() => navigate(`/meetings/${id}/edit`)}>
                        Modifier la réunion
                    </Button>
                )}
                {canApproveDirect && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('approve')} loading={approveLoading}>
                        Valider et publier (admin)
                    </Button>
                )}
                {!canApproveDirect && canCoordinate && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('coordinate')} loading={approveLoading}>
                        Valider (coordinateur)
                    </Button>
                )}
                {!canApproveDirect && canConsolidate && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('consolidate')} loading={approveLoading}>
                        Consolider et publier
                    </Button>
                )}
                {!canApproveDirect && canFinalize && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('finalize')} loading={approveLoading}>
                        Valider et publier
                    </Button>
                )}
                {canCancel && (
                    <Button danger icon={<StopOutlined />} onClick={handleCancel} loading={cancelLoading}>
                        Annuler la réunion
                    </Button>
                )}
                {canComplete && (
                    <Button icon={<CheckCircleOutlined />} onClick={handleComplete} loading={completeLoading}>
                        Terminer la réunion
                    </Button>
                )}
                {canReopen && (
                    <Button icon={<RollbackOutlined />} onClick={handleReopen} loading={reopenLoading}>
                        Rouvrir la réunion
                    </Button>
                )}
                {canForceDelete && (
                    <ForceDeletePopconfirm
                        title={forceDeleteTitle('cette réunion')}
                        description={forceDeleteDescription({ entityLabel: 'cette réunion' })}
                        loading={deleteLoading}
                        onConfirm={handlePermanentDeleteMeeting}
                    >
                        <Button danger icon={<DeleteOutlined />} loading={deleteLoading}>
                            Supprimer la réunion
                        </Button>
                    </ForceDeletePopconfirm>
                )}
                {meeting.meetingLink && (
                    <Button
                        type="primary"
                        icon={<VideoCameraOutlined />}
                        onClick={() => window.open(meeting.meetingLink, '_blank', 'noopener,noreferrer')}
                    >
                        Rejoindre la visio
                    </Button>
                )}
                {canUseVisio && (
                    <Button icon={<VideoCameraOutlined />} onClick={() => setVisioOpen((v) => !v)}>
                        {visioOpen ? 'Fermer la visio intégrée' : 'Ouvrir la visio intégrée'}
                    </Button>
                )}
            </Space>

            <ValidationWorkflowBanner workflow={meeting.validation?.workflow} />

            {!meeting.validation?.workflow?.inWorkflow && needsCoordinator && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={
                        isOrganizer
                            ? 'Cette réunion est en attente de validation par le coordinateur du projet (1er palier). Elle sera ensuite transmise au rôle Consolidateur.'
                            : 'Réunion en attente de validation coordinateur (1er palier). La publication interviendra après consolidation par le rôle Consolidateur.'
                    }
                />
            )}
            {!meeting.validation?.workflow?.inWorkflow && needsConsolidator && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={
                        isOrganizer
                            ? 'Cette réunion a été validée par le coordinateur et attend la consolidation par le rôle Consolidateur (2e palier).'
                            : 'Réunion en attente de consolidation par le rôle Consolidateur (2e palier) avant publication sur le calendrier.'
                    }
                />
            )}
            {needsFinalApproval && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Validation finale requise par le coordinateur du projet (élément en attente legacy)."
                />
            )}

            {visioOpen && (
                <Card
                    title={<Space><VideoCameraOutlined />Visio intégrée (caméra/micro/partage d'écran)</Space>}
                    style={{ marginBottom: 16 }}
                    extra={<Text type="secondary">Salle visio: {jitsiRoomName}</Text>}
                >
                    {!visioReady && <Text type="secondary">Chargement de la visio...</Text>}
                    <div ref={jitsiContainerRef} style={{ width: '100%', minHeight: 560, borderRadius: 8, overflow: 'hidden' }} />
                </Card>
            )}

            <Modal
                title="Ajouter des participants"
                open={addVisible}
                onCancel={() => { setAddVisible(false); addForm.resetFields(); setAddParticipantsError(''); }}
                onOk={handleAddParticipants}
                okText="Ajouter les participants"
                cancelText="Annuler"
                confirmLoading={addParticipantsLoading}
                width={520}
                destroyOnClose
            >
                {addParticipantsError && (
                    <Alert
                        type="error"
                        showIcon
                        title={addParticipantsError}
                        style={{ marginBottom: 12 }}
                    />
                )}
                <Form form={addForm} layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item
                        name="userIds"
                        label="Participants à ajouter"
                        rules={[{ required: true, message: 'Sélectionner au moins un participant' }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Rechercher des utilisateurs"
                            optionFilterProp="children"
                        >
                            {allUsers
                                .filter((u) => !meeting.invitations?.some((inv) => inv.userId === u.id) && u.id !== meeting.organizerId)
                                .map((u) => (
                                    <Select.Option key={u.id} value={u.id}>
                                        {u.name} — {u.email}
                                    </Select.Option>
                                ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Modifier la réunion"
                open={editVisible}
                onCancel={() => setEditVisible(false)}
                onOk={handleEditSubmit}
                okText="Enregistrer les modifications"
                cancelText="Annuler"
                confirmLoading={updateLoading}
                width={520}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="agenda" label="Ordre du jour">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="eventTypeId" label="Type d'événement">
                        <Select
                            allowClear
                            placeholder="Optionnel"
                            options={(eventTypes || [])
                                .filter((t) => t.isActive !== false)
                                .map((t) => ({ value: t.id, label: t.name }))}
                        />
                    </Form.Item>
                    <Form.Item name="roomId" label="Salle">
                        <Select allowClear placeholder="Choisir une salle" options={rooms.map((r) => ({ value: r.id, label: `${r.name} (${r.location})` }))} />
                    </Form.Item>
                    <Form.Item name="meetingLink" label="Lien visio (optionnel)">
                        <Input placeholder="https://meet.google.com/..." />
                    </Form.Item>
                    <Form.Item name="startTime" label="Début" rules={[{ required: true }]}>
                        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="endTime" label="Fin" rules={[{ required: true }]}>
                        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>

            <Card
                extra={
                    (isOrganizer || isPrivilegedAdmin(user?.role)) &&
                    meeting.status !== 'CANCELLED' &&
                    meeting.status !== 'COMPLETED' && (
                        <Button size="small" onClick={() => setAddVisible(true)}>
                            Ajouter des participants
                        </Button>
                    )
                }
            >
                <Space align="start" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            {meeting.title}
                        </Title>
                        <Space size={6} wrap>
                            {meeting.eventType?.name && (
                                <Tag style={{ borderColor: meeting.eventType.color, color: meeting.eventType.color }}>
                                    {meeting.eventType.name}
                                </Tag>
                            )}
                            {meeting.direction?.name && <Tag color="purple">Direction: {meeting.direction.name}</Tag>}
                            {meeting.project?.name && <Tag color="blue">Projet: {meeting.project.name}</Tag>}
                        </Space>
                    </div>
                    <Tag color={needsCoordinator || needsConsolidator ? 'orange' : STATUS_COLORS[meeting.status]}>
                        {meeting.statusLabel || meetingStatusLabel(meeting)}
                    </Tag>
                </Space>

                <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Type d'événement">
                        {meeting.eventType?.name ? (
                            <Tag style={{ borderColor: meeting.eventType.color, color: meeting.eventType.color }}>
                                {meeting.eventType.name}
                            </Tag>
                        ) : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label={<><CalendarOutlined /> Période</>}>
                        {formatDateTimeLocale(meeting.startTime, {
                            dateStyle: 'full',
                            timeStyle: 'short',
                        })}{' '}
                        →{' '}
                        {formatDateTime(meeting.endTime, 'HH:mm')}
                    </Descriptions.Item>
                    {meeting.room && (
                        <Descriptions.Item label={<><EnvironmentOutlined /> Salle</>}>
                            {meeting.room.name} — {meeting.room.location}
                        </Descriptions.Item>
                    )}
                    {meeting.meetingLink && (
                        <Descriptions.Item label={<><VideoCameraOutlined /> Lien visio</>}>
                            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                                {meeting.meetingLink}
                            </a>
                        </Descriptions.Item>
                    )}
                    <Descriptions.Item label={<><TeamOutlined /> Organisateur</>}>
                        <Space>
                            <Avatar
                                size="small"
                                src={meeting.organizer?.avatarUrl ? `${API_BASE}${meeting.organizer.avatarUrl}` : undefined}
                                style={!meeting.organizer?.avatarUrl ? { backgroundColor: '#1F5C8B' } : {}}
                            >
                                {!meeting.organizer?.avatarUrl && (meeting.organizer?.name?.[0]?.toUpperCase() || 'O')}
                            </Avatar>
                            {meeting.organizer?.name} ({meeting.organizer?.email})
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ordre du jour">
                        <Text>{meeting.agenda || '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Direction">
                        {meeting.direction?.name ? (
                            <Tag color="purple">{meeting.direction.code ? `${meeting.direction.name} (${meeting.direction.code})` : meeting.direction.name}</Tag>
                        ) : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Projet">
                        {meeting.project?.name ? (
                            <Space direction="vertical" size={0}>
                                <Tag color="blue">
                                    {meeting.project.code
                                        ? `${meeting.project.name} (${meeting.project.code})`
                                        : meeting.project.name}
                                </Tag>
                                {meeting.project.responsible?.name && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Responsable : {meeting.project.responsible.name}
                                    </Text>
                                )}
                            </Space>
                        ) : '—'}
                    </Descriptions.Item>
                </Descriptions>

                {/* Section fichiers */}
                {(() => {
                    const images = (meeting.files || []).filter((f) => f.kind === 'IMAGE');
                    const documents = (meeting.files || []).filter((f) => f.kind !== 'IMAGE');
                    const isOrganizerOrAdmin = isOrganizer || isPrivilegedAdmin(user?.role);
                    const canUpload = meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED' && (isOrganizer || isInvitedAccepted || isPrivilegedAdmin(user?.role));
                    const canDeleteFiles = meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED';
                    return (
                        <Card
                            type="inner"
                            title={<Space><PaperClipOutlined /> Pièces jointes (PDF)</Space>}
                            style={{ marginTop: 24 }}
                            extra={
                                canUpload && (
                                    <Space wrap>
                                        <Upload
                                            showUploadList={false}
                                            accept={PDF_ACCEPT}
                                            customRequest={makeUploadRequest('DOCUMENT')}
                                            disabled={attachmentLoading}
                                        >
                                            <Button size="small" icon={<FilePdfOutlined />} loading={attachmentLoading}>
                                                Document PDF
                                            </Button>
                                        </Upload>
                                        <Upload
                                            showUploadList={false}
                                            accept={PDF_ACCEPT}
                                            customRequest={makeUploadRequest('REPORT')}
                                            disabled={attachmentLoading}
                                        >
                                            <Button size="small" icon={<PaperClipOutlined />} loading={attachmentLoading}>
                                                Compte rendu (PDF)
                                            </Button>
                                        </Upload>
                                    </Space>
                                )
                            }
                        >
                            {/* Galerie images */}
                            {images.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        Images ({images.length})
                                    </Text>
                                    <Image.PreviewGroup>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {images.map((f) => (
                                                <div key={f.id}>
                                                    <Image
                                                        src={`${API_BASE}${f.fileUrl}`}
                                                        alt={f.fileName}
                                                        width={120}
                                                        height={90}
                                                        style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
                                                    />
                                                    <div style={{ fontSize: 11, color: '#888', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {f.fileName}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#aaa' }}>
                                                        {f.uploadedBy?.name}
                                                    </div>
                                                    {(f.uploadedById === user?.id || isOrganizerOrAdmin) && canDeleteFiles && (
                                                        <Popconfirm
                                                            title="Supprimer cette image ?"
                                                            onConfirm={() => handleDeleteFile(f.id)}
                                                            okText="Supprimer"
                                                            cancelText="Annuler"
                                                            okButtonProps={{ danger: true }}
                                                        >
                                                            <Tooltip title="Supprimer">
                                                                <Button size="small" danger icon={<DeleteOutlined />} style={{ marginTop: 4, width: 120 }} />
                                                            </Tooltip>
                                                        </Popconfirm>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Image.PreviewGroup>
                                </div>
                            )}

                            {/* Liste documents */}
                            {documents.length > 0 && (
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        Fichiers PDF ({documents.length})
                                    </Text>
                                    <List
                                        size="small"
                                        dataSource={documents}
                                        renderItem={(f) => (
                                            <List.Item
                                                actions={[
                                                    (f.uploadedById === user?.id || isOrganizerOrAdmin) && canDeleteFiles && (
                                                        <Popconfirm
                                                            key="del"
                                                            title="Supprimer ce fichier ?"
                                                            onConfirm={() => handleDeleteFile(f.id)}
                                                            okText="Supprimer"
                                                            cancelText="Annuler"
                                                            okButtonProps={{ danger: true }}
                                                        >
                                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                                        </Popconfirm>
                                                    ),
                                                ].filter(Boolean)}
                                            >
                                                <List.Item.Meta
                                                    avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1565C0' }} />}
                                                    title={
                                                        <a href={`${API_BASE}${f.fileUrl}`} target="_blank" rel="noopener noreferrer">
                                                            {f.fileName}
                                                        </a>
                                                    }
                                                    description={
                                                        <Space size={4}>
                                                            <Tag color={f.kind === 'REPORT' ? 'purple' : 'blue'}>
                                                                {f.kind === 'REPORT' ? 'Compte rendu (PDF)' : 'Document (PDF)'}
                                                            </Tag>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                {f.uploadedBy?.name} · {dayjs(f.createdAt).format('D MMM YYYY HH:mm')}
                                                            </Text>
                                                            {f.size && (
                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                    · {(f.size / 1024).toFixed(0)} Ko
                                                                </Text>
                                                            )}
                                                        </Space>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            )}

                            {images.length === 0 && documents.length === 0 && (
                                <Text type="secondary">Aucune pièce jointe. Les nouveaux fichiers doivent être au format PDF.</Text>
                            )}
                        </Card>
                    );
                })()}
            </Card>

            <Card
                title={<><MessageOutlined style={{ marginRight: 8 }} />Discussion de la réunion</>}
                style={{ marginTop: 24 }}
            >
                <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Les messages se mettent à jour automatiquement (pas de WebSocket). Envoi via le serveur : les
                        participants les voient même hors ligne au prochain rafraîchissement.
                    </Text>
                </div>
                <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 6 }}>
                    {(meeting.messages || []).length === 0 ? (
                        <Text type="secondary">Aucun message pour le moment.</Text>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(meeting.messages || []).map((m) => {
                                const mine = m.senderId === user?.id;
                                const avatarSrc = m.sender?.avatarUrl ? `${API_BASE}${m.sender.avatarUrl}` : undefined;
                                return (
                                    <div
                                        key={m.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: mine ? 'flex-end' : 'flex-start',
                                            gap: 8,
                                            alignItems: 'flex-end',
                                            flexDirection: mine ? 'row-reverse' : 'row',
                                        }}
                                    >
                                        <Avatar
                                            size="small"
                                            src={avatarSrc}
                                            style={!avatarSrc ? { backgroundColor: '#1F5C8B', flexShrink: 0 } : { flexShrink: 0 }}
                                        >
                                            {!avatarSrc && (m.sender?.name?.[0]?.toUpperCase() || '?')}
                                        </Avatar>
                                        <div
                                            style={{
                                                width: 'fit-content',
                                                maxWidth: 'min(88%, 100%)',
                                                minWidth: 'min(220px, 100%)',
                                                background: mine ? '#EFF6FF' : '#f5f5f5',
                                                border: `1px solid ${mine ? '#91caff' : '#e5e5e5'}`,
                                                borderRadius: 10,
                                                padding: '8px 10px',
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            <div style={{ marginBottom: 4 }}>
                                                <Text strong style={{ fontSize: 12 }}>
                                                    {m.sender?.name || 'Utilisateur'}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                                    {dayjs(m.createdAt).format('DD/MM HH:mm')}
                                                </Text>
                                            </div>
                                            {m.parent && (
                                                <div
                                                    style={{
                                                        background: '#fff',
                                                        border: '1px solid #d9d9d9',
                                                        borderRadius: 6,
                                                        padding: '6px 8px',
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                                        Réponse à {m.parent.sender?.name || 'message'}
                                                    </Text>
                                                    <div style={{ fontSize: 12, color: '#595959' }}>
                                                        {m.parent.body}
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                                            {mine && (
                                                <div style={{ marginTop: 6, textAlign: 'right' }}>
                                                    {m._failed ? (
                                                        <Space size={8}>
                                                            <Text style={{ fontSize: 11, color: '#ff4d4f' }}>Echec</Text>
                                                            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => retryMeetingMessage(m)}>
                                                                Renvoyer
                                                            </Button>
                                                        </Space>
                                                    ) : m._queued ? (
                                                        <Text type="warning" style={{ fontSize: 11 }}>
                                                            En attente (hors ligne)
                                                        </Text>
                                                    ) : m._optimistic ? (
                                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                                            Envoi...
                                                        </Text>
                                                    ) : null}
                                                </div>
                                            )}
                                            <div style={{ marginTop: 6, textAlign: 'right' }}>
                                                <Space size={4}>
                                                    {meeting.status !== 'CANCELLED' && meeting.status !== 'COMPLETED' && (
                                                        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setReplyingTo(m)}>
                                                            Répondre
                                                        </Button>
                                                    )}
                                                    {(mine || isPrivilegedAdmin(user?.role)) &&
                                                        meeting.status !== 'CANCELLED' &&
                                                        meeting.status !== 'COMPLETED' &&
                                                        !m._optimistic &&
                                                        !m._queued &&
                                                        !m._failed && (
                                                        <Popconfirm
                                                            title="Supprimer ce message ?"
                                                            okText="Supprimer"
                                                            cancelText="Annuler"
                                                            okButtonProps={{ danger: true }}
                                                            onConfirm={() => deleteMeetingMessage(m)}
                                                        >
                                                            <Button type="link" size="small" danger style={{ padding: 0 }}>
                                                                Supprimer
                                                            </Button>
                                                        </Popconfirm>
                                                    )}
                                                </Space>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {canChat && (
                    <div style={{ marginTop: 12 }}>
                        {replyingTo && (
                            <Alert
                                type="info"
                                showIcon
                                title={`Réponse à ${replyingTo.sender?.name || 'message'}`}
                                description={replyingTo.body}
                                action={
                                    <Button size="small" onClick={() => setReplyingTo(null)}>
                                        Annuler
                                    </Button>
                                }
                                style={{ marginBottom: 8 }}
                            />
                        )}
                        <Input.TextArea
                            rows={3}
                            value={chatText}
                            onChange={(e) => setChatText(e.target.value)}
                            placeholder="Écrire un message à tous les participants..."
                            maxLength={3000}
                        />
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="primary" icon={<SendOutlined />} onClick={handleSendChatMessage} loading={chatSending}>
                                Envoyer
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <Card title="Participants" style={{ marginTop: 24 }}>
                <List
                    dataSource={meeting.invitations || []}
                    locale={{ emptyText: 'Aucun participant' }}
                    renderItem={(inv) => (
                        <List.Item
                            actions={
                                inv.userId === user?.id && inv.status === 'PENDING' && meeting.status !== 'CANCELLED'
                                    ? [
                                          <Button key="acc" type="link" onClick={() => respondInvitation(inv.id, 'ACCEPTED')}>
                                              Accepter
                                          </Button>,
                                          <Button key="dec" type="link" danger onClick={() => respondInvitation(inv.id, 'DECLINED')}>
                                              Décliner
                                          </Button>,
                                      ]
                                    : []
                            }
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        size="small"
                                        src={inv.user?.avatarUrl ? `${API_BASE}${inv.user.avatarUrl}` : undefined}
                                        style={!inv.user?.avatarUrl ? { backgroundColor: '#1F5C8B' } : {}}
                                    >
                                        {!inv.user?.avatarUrl && (inv.user?.name?.[0]?.toUpperCase() || '?')}
                                    </Avatar>
                                }
                                title={inv.user?.name || inv.userId}
                                description={inv.user?.email}
                            />
                            <Tag>{INV_STATUS[inv.status] || inv.status}</Tag>
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}
