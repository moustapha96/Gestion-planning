import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Typography, Button, Space, Tag, Spin, Modal, Input,
    Form, Select, DatePicker, Popconfirm, App, Alert,
    Row, Col, Badge, Divider, Descriptions, Result,
} from 'antd';
import {
    ArrowLeftOutlined, CalendarOutlined, UserOutlined, PlusOutlined, EditOutlined,
    DeleteOutlined, FlagOutlined, EnvironmentOutlined, ClockCircleOutlined,
    InfoCircleOutlined, StopOutlined, ShareAltOutlined, CopyOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    isPrivilegedAdmin, canSuperAdminForceDelete,
} from '../utils/roles';
import { forceDeleteDescription, forceDeleteTitle } from '../utils/deleteConfirm';
import ForceDeletePopconfirm from '../components/ForceDeletePopconfirm';
import {
    filterAssignableProjects,
    projectFieldLabel,
    projectSelectRules,
} from '../utils/projectScope';

const { Title, Text, Paragraph } = Typography;

// ── Constantes ───────────────────────────────────────────────────
const EVENT_STYLES = {
    REUNION:     { bg: '#EFF6FF', border: '#1565C0', color: '#1D4ED8', label: 'Réunion'     },
    MISSION:     { bg: '#f9f0ff', border: '#722ed1', color: '#531dab', label: 'Mission'     },
    DEPLACEMENT: { bg: '#fff7e6', border: '#fa8c16', color: '#d46b08', label: 'Déplacement' },
    FORMATION:   { bg: '#f6ffed', border: '#52c41a', color: '#389e0d', label: 'Formation'   },
    AUTRE:       { bg: '#f5f5f5', border: '#d9d9d9', color: '#595959', label: 'Autre'       },
};

// ── Grille hebdomadaire ──────────────────────────────────────────
function WeekGrid({ events, weekStart, canEdit, onEdit, onDelete, onView, resolveEventStyle }) {
    const monday = new Date(weekStart);
    const days   = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });

    const eventsByDay = {};
    (events || []).forEach((ev) => {
        const key = new Date(ev.startTime).toISOString().split('T')[0];
        if (!eventsByDay[key]) eventsByDay[key] = [];
        eventsByDay[key].push(ev);
    });

    return (
        <div style={{ overflowX: 'auto' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))',
                gap: 8,
                minWidth: 700,
            }}>
                {days.map((day) => {
                    const dayKey   = day.toISOString().split('T')[0];
                    const dayEvs   = (eventsByDay[dayKey] || []).sort(
                        (a, b) => new Date(a.startTime) - new Date(b.startTime)
                    );
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isToday   = new Date().toDateString() === day.toDateString();

                    return (
                        <div
                            key={dayKey}
                            style={{
                                borderRadius: 8,
                                border: `1px solid ${isToday ? '#1565C060' : '#f0f0f0'}`,
                                background: isWeekend ? '#fafafa' : '#fff',
                                overflow: 'hidden',
                                minHeight: 90,
                            }}
                        >
                            {/* En-tête du jour */}
                            <div style={{
                                padding: '5px 8px',
                                background: isToday ? '#EFF6FF' : isWeekend ? '#f5f5f5' : '#fafafa',
                                borderBottom: `1px solid ${isToday ? '#91caff' : '#f0f0f0'}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <Text
                                    strong={isToday}
                                    style={{
                                        fontSize: 11,
                                        color: isToday ? '#1565C0' : isWeekend ? '#bfbfbf' : '#595959',
                                    }}
                                >
                                    {day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                                </Text>
                                {dayEvs.length > 0 && (
                                    <Badge
                                        count={dayEvs.length}
                                        size="small"
                                        style={{ backgroundColor: '#1565C0' }}
                                    />
                                )}
                            </div>

                            {/* Événements du jour */}
                            <div style={{ padding: 4 }}>
                                {dayEvs.map((ev) => {
                                    const s = resolveEventStyle
                                        ? resolveEventStyle(ev)
                                        : (EVENT_STYLES[ev.type] || EVENT_STYLES.AUTRE);
                                    const startStr = new Date(ev.startTime).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit', minute: '2-digit',
                                    });
                                    const endStr = new Date(ev.endTime).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit', minute: '2-digit',
                                    });
                                    return (
                                        <div
                                            key={ev.id}
                                            onClick={() => onView?.(ev)}
                                            style={{
                                                background: s.bg,
                                                borderLeft: `3px solid ${s.border}`,
                                                borderRadius: 4,
                                                padding: '4px 6px',
                                                marginBottom: 4,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 10, fontWeight: 700,
                                                color: s.color, display: 'block',
                                            }}>
                                                {startStr} – {endStr}
                                            </Text>
                                            <Text style={{
                                                fontSize: 11, display: 'block',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}
                                                title={ev.title}
                                            >
                                                {ev.title}
                                            </Text>
                                            {(ev.room?.name || ev.destination) && (
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 10, display: 'block' }}
                                                >
                                                    <EnvironmentOutlined style={{ marginRight: 2 }} />
                                                    {ev.room?.name || ev.destination}
                                                </Text>
                                            )}
                                            {canEdit && !ev.readOnly && (
                                                <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
                                                    <Button
                                                        type="text" size="small" icon={<EditOutlined />}
                                                        onClick={(e) => { e.stopPropagation(); onEdit(ev); }}
                                                        style={{ height: 20, padding: '0 4px', fontSize: 11, color: s.color }}
                                                    />
                                                    <Popconfirm
                                                        title="Supprimer cet événement ?"
                                                        onConfirm={() => onDelete(ev.id)}
                                                        okText="Supprimer"
                                                        cancelText="Annuler"
                                                    >
                                                        <Button
                                                            type="text" size="small" danger icon={<DeleteOutlined />}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ height: 20, padding: '0 4px', fontSize: 11 }}
                                                        />
                                                    </Popconfirm>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {dayEvs.length === 0 && (
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', padding: '4px 4px', fontStyle: 'italic' }}>
                                        {isWeekend ? 'Week-end' : 'Libre'}
                                    </Text>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────
export default function PlanningDetail() {
    const { id }      = useParams();
    const navigate    = useNavigate();
    const { user }    = useAuth();
    const { message } = App.useApp();

    const [planning,      setPlanning]      = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [notFound,      setNotFound]      = useState(false);
    const [forbidden,     setForbidden]     = useState(false);
    const [eventModal,    setEventModal]    = useState({ open: false, event: null });
    const [rooms,         setRooms]         = useState([]);
    const [directions,    setDirections]    = useState([]);
    const [projects,      setProjects]      = useState([]);
    const [eventSaving,   setEventSaving]   = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
    const [eventDetails,     setEventDetails]     = useState(null);
    const [shareOpen,        setShareOpen]        = useState(false);
    const [eventForm]                             = Form.useForm();
    const [eventTypes, setEventTypes]             = useState([]);

    const assignableProjects = useMemo(
        () => filterAssignableProjects(user, projects),
        [user, projects],
    );
    const singleProject = assignableProjects.length === 1;

    const resolvePlanningEventStyle = useCallback((ev) => {
        if (ev.eventType?.color) {
            const c = ev.eventType.color;
            return {
                bg: '#f8fafc',
                border: c,
                color: c,
                label: ev.eventType.name || ev.type,
            };
        }
        return EVENT_STYLES[ev.type] || EVENT_STYLES.AUTRE;
    }, []);

    useEffect(() => {
        api.get('/events/taxonomy')
            .then((r) => setEventTypes(r.data?.eventTypes || []))
            .catch(() => setEventTypes([]));
    }, []);

    // ── Fetch planning ───────────────────────────────────────────
    const fetchPlanning = async () => {
        setLoading(true);
        setNotFound(false);
        setForbidden(false);
        try {
            const res = await api.get(`/plannings/${id}`);
            setPlanning(res.data);
        } catch (err) {
            const status = err.response?.status;
            if (status === 403) {
                message.error('Vous n\'avez pas accès à ce planning');
                setForbidden(true);
            } else if (status === 404) {
                message.error('Planning introuvable');
                setNotFound(true);
            } else {
                message.error(err.response?.data?.error || 'Impossible de charger le planning');
                setNotFound(true);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlanning(); }, [id]); // eslint-disable-line

    // ── Gestion événements ───────────────────────────────────────
    const openEventModal = (event = null) => {
        if (event?.readOnly) {
            openEventDetails(event);
            return;
        }
        const manualId = event ? (event.planningEventId || event.id) : null;
        setEventModal({ open: true, event: event ? { ...event, id: manualId } : null });
        if (event) {
            eventForm.setFieldsValue({
                title:       event.title,
                eventTypeId: event.eventTypeId || event.eventType?.id || undefined,
                startTime:   event.startTime ? dayjs(event.startTime) : null,
                endTime:     event.endTime   ? dayjs(event.endTime)   : null,
                roomId:      event.roomId    || undefined,
                directionId: event.directionId || undefined,
                projectId:   event.projectId || undefined,
                destination: event.destination || undefined,
                description: event.description || undefined,
            });
        } else {
            // Pré-remplir la date avec le lundi de la semaine
            eventForm.resetFields();
            const defaultTypeId = eventTypes.find((t) => t.code === 'AUTRE')?.id
                || eventTypes.find((t) => t.code === 'FORMATION')?.id
                || eventTypes[0]?.id;
            if (planning?.weekStart) {
                const monday = dayjs(planning.weekStart).hour(9).minute(0).second(0);
                eventForm.setFieldsValue({
                    startTime: monday,
                    endTime:   monday.hour(10),
                    ...(defaultTypeId ? { eventTypeId: defaultTypeId } : {}),
                });
            } else if (defaultTypeId) {
                eventForm.setFieldsValue({ eventTypeId: defaultTypeId });
            }
        }
        Promise.all([
            api.get('/rooms'),
            api.get('/events/taxonomy'),
        ])
            .then(([roomsRes, taxonomyRes]) => {
                setRooms(roomsRes.data || []);
                setDirections(taxonomyRes?.data?.directions || []);
                setProjects(taxonomyRes?.data?.projects || []);
            })
            .catch(() => {
                setRooms([]);
                setDirections([]);
                setProjects([]);
            });
    };

    const handleSaveEvent = async () => {
        try {
            const values = await eventForm.validateFields();
            const startTime = values.startTime?.toISOString?.() ?? values.startTime;
            const endTime   = values.endTime?.toISOString?.()   ?? values.endTime;
            if (!startTime || !endTime || new Date(startTime) >= new Date(endTime)) {
                message.error('La fin doit être après le début.');
                return;
            }
            setEventSaving(true);
            const payload = {
                title:       values.title,
                eventTypeId: values.eventTypeId || null,
                startTime,
                endTime,
                roomId:      values.roomId      || null,
                directionId: values.directionId || null,
                projectId:   values.projectId   || null,
                destination: values.destination || null,
                description: values.description || null,
            };
            if (eventModal.event) {
                await api.put(`/plannings/${id}/events/${eventModal.event.id}`, payload);
                message.success('Événement modifié');
            } else {
                await api.post(`/plannings/${id}/events`, payload);
                message.success('Événement ajouté');
            }
            setEventModal({ open: false, event: null });
            eventForm.resetFields();
            fetchPlanning();
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setEventSaving(false); }
    };

    const handleDeleteEvent = async (eventId) => {
        const rawId = String(eventId).includes(':')
            ? String(eventId).split(':').pop()
            : eventId;
        try {
            await api.delete(`/plannings/${id}/events/${rawId}`);
            message.success('Événement supprimé');
            fetchPlanning();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const openEventDetails = (ev) => {
        setEventDetails(ev);
        setEventDetailsOpen(true);
    };

    const handleDeletePlanning = async () => {
        setDeleteLoading(true);
        try {
            await api.delete(`/plannings/${id}`);
            message.success('Planning supprimé');
            navigate('/planning');
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setDeleteLoading(false); }
    };

    const handleCancelPlanning = async () => {
        setActionLoading(true);
        try {
            await api.put(`/plannings/${id}/cancel`);
            message.success('Planning annulé');
            fetchPlanning();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setActionLoading(false); }
    };

    const buildShareText = () => {
        if (!planning) return '';
        const events = (planning.events || []).slice().sort(
            (a, b) => new Date(a.startTime) - new Date(b.startTime),
        );
        const proj = planning.project || planning.user?.project;
        const counts = planning.counts || {
            meetings: planning.weekMeetings?.length || 0,
            missions: planning.weekMissions?.length || 0,
            manualEvents: planning.manualEvents?.length || 0,
            total: events.length,
        };
        const ws = new Date(planning.weekStart);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        const wLabel = `${ws.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${we.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

        const fmtTime = (iso) => {
            if (!iso) return '';
            try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
            catch { return ''; }
        };

        const fmtDay = (iso) => {
            if (!iso) return '';
            try {
                return new Date(iso).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                });
            } catch { return iso; }
        };

        const TYPE_LABELS = {
            REUNION: 'Réunion', MISSION: 'Mission',
            DEPLACEMENT: 'Déplacement', FORMATION: 'Formation', AUTRE: 'Autre',
        };

        const lines = [
            `Planning ADM GP — ${planning.user?.name || ''}`,
            `Semaine du ${wLabel}`,
            proj?.name ? `Projet : ${proj.name}` : '',
            `Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            `${counts.meetings} réunion(s) · ${counts.missions} mission(s) · ${counts.manualEvents} événement(s) manuel(s)`,
            '',
            '═'.repeat(48),
            '',
        ].filter(Boolean);

        if (!events.length) {
            lines.push('   Aucun événement cette semaine.');
        } else {
            // Regrouper par jour
            const byDay = {};
            events.forEach((ev) => {
                const day = new Date(ev.startTime).toISOString().split('T')[0];
                if (!byDay[day]) byDay[day] = [];
                byDay[day].push(ev);
            });
            for (const [day, dayEvs] of Object.entries(byDay)) {
                lines.push(`📅 ${fmtDay(day + 'T00:00:00')}`);
                for (const ev of dayEvs) {
                    const start = fmtTime(ev.startTime);
                    const end   = fmtTime(ev.endTime);
                    const time  = end ? `${start} – ${end}` : start;
                    const type  = ev.eventType?.name || TYPE_LABELS[ev.type] || ev.type || '';
                    const loc   = ev.room?.name || ev.destination || '';
                    lines.push(
                        `   ${time}  [${type}]  ${ev.title || ''}${loc ? `  📍 ${loc}` : ''}`,
                    );
                    if (ev.description) {
                        lines.push(`            ${ev.description}`);
                    }
                }
                lines.push('');
            }
        }
        return lines.join('\n');
    };

    const handleShare = () => setShareOpen(true);

    const handleCopyShare = async () => {
        try {
            await navigator.clipboard.writeText(buildShareText());
            message.success('Événements copiés dans le presse-papiers.');
        } catch {
            message.error('Impossible de copier — sélectionnez le texte manuellement.');
        }
    };

    // ── Rendu états ──────────────────────────────────────────────
    if (forbidden) {
        return (
            <Result
                status="403"
                title="Accès refusé"
                subTitle="Vous n'avez pas les droits pour consulter ce planning."
                extra={(
                    <Space>
                        <Button type="primary" onClick={() => navigate('/planning')}>Retour aux plannings</Button>
                        <Button onClick={() => navigate('/a-valider')}>Voir « À valider »</Button>
                    </Space>
                )}
            />
        );
    }
    if (notFound) {
        return (
            <Result
                status="404"
                title="Planning introuvable"
                extra={<Button type="primary" onClick={() => navigate('/planning')}>Retour au planning</Button>}
            />
        );
    }
    if (loading || !planning) {
        return (
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    const isAdmin = isPrivilegedAdmin(user?.role);
    const isOwner = planning.userId === user?.id;
    const project = planning.project || planning.user?.project;
    const isSuperAdmin = canSuperAdminForceDelete(user?.role);

    const canEditEvents = planning.status !== 'CANCELLED' && (isAdmin || isOwner);
    const canCancel = isAdmin && planning.status !== 'CANCELLED';
    const canDelete = isSuperAdmin;

    const weekMissions = planning.weekMissions || [];
    const weekMeetings = planning.weekMeetings || [];
    const eventCounts = planning.counts || {
        total: planning.events?.length || 0,
        meetings: weekMeetings.length,
        missions: weekMissions.length,
        manualEvents: planning.manualEvents?.length || 0,
    };

    const weekStart = new Date(planning.weekStart);
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekLabel = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    return (
        <div>
            {/* ── Barre d'actions ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 20, flexWrap: 'wrap',
            }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/planning')}>
                    Retour au planning
                </Button>

                <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                    Partager
                </Button>

                <div style={{ flex: 1 }} />

                {canEditEvents && project?.id && (
                    <>
                        <Button
                            icon={<TeamOutlined />}
                            onClick={() => navigate(`/meetings/new?projectId=${project.id}`)}
                        >
                            Nouvelle réunion
                        </Button>
                        <Button
                            icon={<FlagOutlined />}
                            onClick={() => navigate(`/missions/new?projectId=${project.id}`)}
                        >
                            Nouvelle mission
                        </Button>
                    </>
                )}

                {canEditEvents && (
                    <Button
                        type="dashed" icon={<PlusOutlined />}
                        onClick={() => openEventModal()}
                    >
                        Ajouter un événement manuel
                    </Button>
                )}

                {canCancel && (
                    <Popconfirm
                        title="Annuler ce planning ?"
                        description="Action réservée à l'administration, même si le planning est déjà validé."
                        onConfirm={handleCancelPlanning}
                        okText="Annuler le planning"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true, loading: actionLoading }}
                    >
                        <Button danger icon={<StopOutlined />} loading={actionLoading}>
                            Annuler le planning
                        </Button>
                    </Popconfirm>
                )}

                {canDelete && (
                    <ForceDeletePopconfirm
                        title={forceDeleteTitle('ce planning')}
                        description={forceDeleteDescription({ entityLabel: 'ce planning et tous ses événements manuels' })}
                        loading={deleteLoading}
                        onConfirm={handleDeletePlanning}
                    >
                        <Button danger icon={<DeleteOutlined />} loading={deleteLoading}>
                            Supprimer le planning
                        </Button>
                    </ForceDeletePopconfirm>
                )}
            </div>

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16, borderRadius: 10 }}
                message="Vue consolidée"
                description="Ce planning regroupe automatiquement les réunions publiées, les missions confirmées et les événements manuels du responsable. Aucune validation de planning n'est requise."
            />

            {/* ── Carte principale ── */}
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 24 } }}>

                {/* ── En-tête ── */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12,
                }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>
                            <CalendarOutlined style={{ marginRight: 8, color: '#1565C0' }} />
                            Semaine du {weekLabel}
                        </Title>
                        <Space style={{ marginTop: 6 }}>
                            <UserOutlined style={{ color: '#8c8c8c' }} />
                            <Text type="secondary">
                                {planning.user?.name}
                                {planning.user?.email && (
                                    <span style={{ marginLeft: 8, fontSize: 12 }}>{planning.user.email}</span>
                                )}
                            </Text>
                        </Space>
                    </div>
                    <Tag color="green" style={{ fontSize: 13, padding: '4px 12px', fontWeight: 600 }}>
                        Consolidé ({eventCounts.total} élément{eventCounts.total > 1 ? 's' : ''})
                    </Tag>
                </div>

                {project && (
                    <Descriptions
                        size="small"
                        bordered
                        column={{ xs: 1, sm: 2, md: 4 }}
                        style={{ marginBottom: 20 }}
                    >
                        <Descriptions.Item label="Projet">
                            {project.code ? `${project.name} (${project.code})` : project.name}
                        </Descriptions.Item>
                        <Descriptions.Item label="Responsable">
                            {project.responsible?.name || planning.user?.name || <Text type="secondary">Non défini</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Réunions">
                            {eventCounts.meetings}
                        </Descriptions.Item>
                        <Descriptions.Item label="Missions">
                            {eventCounts.missions}
                        </Descriptions.Item>
                    </Descriptions>
                )}

                <div style={{
                    display: 'flex', gap: 16, flexWrap: 'wrap',
                    background: '#f6ffed', borderRadius: 8,
                    padding: '10px 16px', marginBottom: 20,
                }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {eventCounts.meetings} réunion(s) · {eventCounts.missions} mission(s) · {eventCounts.manualEvents} événement(s) manuel(s)
                    </Text>
                </div>

                {/* ── Grille hebdomadaire ── */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8,
                }}>
                    <Title level={5} style={{ margin: 0 }}>
                        Activités de la semaine
                        {eventCounts.total > 0 && (
                            <Badge
                                count={eventCounts.total}
                                style={{ backgroundColor: '#1565C0', marginLeft: 8 }}
                            />
                        )}
                    </Title>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(eventTypes.length
                            ? eventTypes.filter((t) => t.isActive !== false)
                            : Object.entries(EVENT_STYLES).map(([code, s]) => ({ id: code, name: s.label, color: s.border }))
                        ).map((t) => (
                            <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{
                                    display: 'inline-block', width: 8, height: 8,
                                    borderRadius: 2,
                                    background: t.color || '#ccc',
                                    border: `2px solid ${t.color || '#ccc'}`,
                                }} />
                                <Text type="secondary" style={{ fontSize: 10 }}>{t.name}</Text>
                            </span>
                        ))}
                    </div>
                </div>

                {(planning.events?.length === 0 || !planning.events) ? (
                    <div style={{
                        textAlign: 'center', padding: '32px 0',
                        background: '#fafafa', borderRadius: 8,
                        border: '1px dashed #d9d9d9',
                    }}>
                        <CalendarOutlined style={{ fontSize: 32, color: '#d9d9d9', display: 'block', marginBottom: 8 }} />
                        <Text type="secondary">
                            {canEditEvents
                                ? 'Aucune activité — ajoutez un événement manuel ou créez des réunions/missions validées'
                                : 'Aucune activité pour cette semaine'}
                        </Text>
                    </div>
                ) : (
                    <WeekGrid
                        events={planning.events}
                        weekStart={planning.weekStart}
                        canEdit={canEditEvents}
                        onEdit={openEventModal}
                        onDelete={handleDeleteEvent}
                        onView={openEventDetails}
                        resolveEventStyle={resolvePlanningEventStyle}
                    />
                )}

                {/* ── Message contextuel ── */}
                {canEditEvents && (
                    <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                        <InfoCircleOutlined style={{ marginRight: 4 }} />
                        Les réunions et missions validées apparaissent automatiquement. Vous pouvez ajouter des événements manuels (déplacement, formation, etc.).
                    </Paragraph>
                )}

                {(weekMeetings.length > 0 || weekMissions.length > 0) && (
                    <>
                        <Divider style={{ margin: '24px 0 16px' }} />
                        {weekMeetings.length > 0 && (
                            <>
                                <div style={{ marginBottom: 12 }}>
                                    <Title level={5} style={{ margin: 0 }}>
                                        Réunions publiées ({weekMeetings.length})
                                    </Title>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                    {weekMeetings.map((m) => (
                                        <div
                                            key={m.id}
                                            style={{
                                                display: 'flex', gap: 12, padding: '10px 14px',
                                                borderRadius: 8, background: '#EFF6FF',
                                                borderLeft: '4px solid #1565C0', cursor: 'pointer',
                                            }}
                                            onClick={() => navigate(`/meetings/${m.id}`)}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <Text strong>{m.title}</Text>
                                                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                    {new Date(m.startTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                                                </Text>
                                            </div>
                                            <Tag color="blue">Réunion</Tag>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <div style={{ marginBottom: 12 }}>
                            <Title level={5} style={{ margin: 0 }}>
                                <FlagOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                                Missions confirmées ({weekMissions.length})
                            </Title>
                        </div>

                        {weekMissions.length === 0 ? (
                            <Text type="secondary" style={{ fontSize: 13 }}>Aucune mission sur cette période.</Text>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {weekMissions.map((m) => (
                                    <div
                                        key={m.id}
                                        style={{
                                            display: 'flex', gap: 12, padding: '10px 14px',
                                            borderRadius: 8, background: '#f9f0ff',
                                            borderLeft: '4px solid #722ed1', cursor: 'pointer',
                                        }}
                                        onClick={() => navigate(`/missions/${m.id}`)}
                                    >
                                        <FlagOutlined style={{ color: '#722ed1', flexShrink: 0, paddingTop: 2 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text strong style={{ display: 'block' }}>{m.title}</Text>
                                            <Space size={16} style={{ flexWrap: 'wrap', marginTop: 2 }}>
                                                {m.location && (
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        <EnvironmentOutlined style={{ marginRight: 3 }} />{m.location}
                                                    </Text>
                                                )}
                                                {m.startTime && (
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        <ClockCircleOutlined style={{ marginRight: 3 }} />
                                                        {new Date(m.startTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                                                        {m.endTime && ` → ${new Date(m.endTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`}
                                                    </Text>
                                                )}
                                                {m.assignments?.length > 0 && (
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {m.assignments.map((a) => a.user?.name).filter(Boolean).join(', ')}
                                                    </Text>
                                                )}
                                            </Space>
                                        </div>
                                        <Tag color="purple" style={{ flexShrink: 0, alignSelf: 'flex-start' }}>Mission</Tag>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* ── Modal événement ── */}
            <Modal
                title={
                    <span>
                        {eventModal.event
                            ? <><EditOutlined style={{ marginRight: 8 }} />Modifier l'événement</>
                            : <><PlusOutlined style={{ marginRight: 8 }} />Ajouter un événement</>
                        }
                    </span>
                }
                open={eventModal.open}
                onOk={handleSaveEvent}
                onCancel={() => { setEventModal({ open: false, event: null }); eventForm.resetFields(); }}
                okText={eventModal.event ? 'Enregistrer' : 'Ajouter l\'événement'}
                cancelText="Annuler"
                confirmLoading={eventSaving}
                destroyOnClose
            >
                <Form form={eventForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col xs={24} sm={16}>
                            <Form.Item name="title" label="Titre" rules={[{ required: true, message: 'Requis' }]}>
                                <Input placeholder="Ex. Réunion hebdomadaire" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="eventTypeId" label="Type" rules={[{ required: true, message: 'Choisissez un type' }]}>
                                <Select
                                    placeholder="Type"
                                    style={{ width: '100%' }}
                                    options={(eventTypes || [])
                                        .filter((t) => t.isActive !== false)
                                        .map((t) => ({ value: t.id, label: t.name }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="startTime" label="Début" rules={[{ required: true }]}>
                                <DatePicker
                                    showTime={{ format: 'HH:mm', minuteStep: 15 }}
                                    format="DD/MM/YYYY HH:mm"
                                    style={{ width: '100%' }}
                                    placeholder="Début"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="endTime" label="Fin" rules={[{ required: true }]}>
                                <DatePicker
                                    showTime={{ format: 'HH:mm', minuteStep: 15 }}
                                    format="DD/MM/YYYY HH:mm"
                                    style={{ width: '100%' }}
                                    placeholder="Fin"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="roomId" label="Salle (optionnel)">
                        <Select
                            allowClear
                            placeholder="Choisir une salle disponible"
                            options={rooms.map((r) => ({
                                value: r.id,
                                label: r.name + (r.capacity ? ` (${r.capacity} pers.)` : ''),
                            }))}
                        />
                    </Form.Item>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="directionId" label="Direction (optionnel)">
                                <Select
                                    allowClear
                                    placeholder="Direction"
                                    options={directions.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="projectId"
                                label={projectFieldLabel(user)}
                                rules={projectSelectRules(user)}
                            >
                                <Select
                                    allowClear={!projectSelectRules(user).length}
                                    disabled={singleProject && projectSelectRules(user).length > 0}
                                    placeholder="Projet"
                                    options={assignableProjects.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="destination" label="Destination / Lieu externe (optionnel)">
                        <Input placeholder="Ex. Site client, adresse..." />
                    </Form.Item>

                    <Form.Item name="description" label="Description (optionnel)">
                        <Input.TextArea rows={2} placeholder="Notes complémentaires..." />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Détails de l'événement"
                open={eventDetailsOpen}
                onCancel={() => { setEventDetailsOpen(false); setEventDetails(null); }}
                footer={null}
                width={640}
                destroyOnClose
            >
                {eventDetails && (
                    <>
                        <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Titre">{eventDetails.title || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Type">
                                {eventDetails.eventType?.name || eventDetails.type || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Début">
                                {eventDetails.startTime ? new Date(eventDetails.startTime).toLocaleString('fr-FR') : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fin">
                                {eventDetails.endTime ? new Date(eventDetails.endTime).toLocaleString('fr-FR') : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Salle">{eventDetails.room?.name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Direction">{eventDetails.direction?.name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Projet">{eventDetails.project?.name || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Destination">{eventDetails.destination || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Description">{eventDetails.description || '-'}</Descriptions.Item>
                        </Descriptions>
                        <Space style={{ marginTop: 16 }}>
                            <Button onClick={() => { setEventDetailsOpen(false); setEventDetails(null); }}>
                                Fermer
                            </Button>
                        </Space>
                    </>
                )}
            </Modal>

            {/* ── Modale partage événements ── */}
            <Modal
                title={<><ShareAltOutlined style={{ marginRight: 8 }} />Partager les événements</>}
                open={shareOpen}
                onCancel={() => setShareOpen(false)}
                footer={[
                    <Button
                        key="copy"
                        type="primary"
                        icon={<CopyOutlined />}
                        onClick={handleCopyShare}
                    >
                        Copier le texte
                    </Button>,
                    <Button key="close" onClick={() => setShareOpen(false)}>
                        Fermer
                    </Button>,
                ]}
                width={580}
                destroyOnClose
            >
                <Input.TextArea
                    value={planning ? buildShareText() : ''}
                    readOnly
                    autoSize={{ minRows: 10, maxRows: 22 }}
                    style={{ fontFamily: 'monospace', fontSize: 12, background: '#fafafa' }}
                />
            </Modal>
        </div>
    );
}
