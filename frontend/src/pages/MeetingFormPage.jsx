import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Card, Typography, Form, Input, Select, DatePicker, Button, Row, Col, Space, Alert, Spin, App, Tag,
} from 'antd';
import { ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import { toUtcIso } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import { isAssistant } from '../utils/roles';
import ResponsibleProjectField, { ResponsibleProjectBanner } from '../components/ResponsibleProjectField';
import { applyDefaultProjectToForm, useResponsibleProjectScope } from '../hooks/useResponsibleProjectScope';

const { Title, Text } = Typography;

function formatRoomLabel(room, { tag } = {}) {
    if (!room?.name) return 'Salle';
    const parts = [room.name];
    if (room.capacity) parts.push(`${room.capacity} pers.`);
    if (room.location) parts.push(room.location);
    let label = parts.join(' · ');
    if (tag) label = `${label} (${tag})`;
    if (room.status && room.status !== 'ACTIVE') {
        label = `${label} — inactive`;
    }
    return label;
}

function mergeRoomOptions({ availableRooms, catalogRooms, assignedRoom, selectedRoomId }) {
    const map = new Map();
    const add = (room, meta = {}) => {
        if (!room?.id) return;
        const prev = map.get(room.id);
        map.set(room.id, {
            room: { ...room, ...(prev?.room || {}) },
            available: prev?.available || meta.available || false,
            isAssigned: prev?.isAssigned || meta.isAssigned || false,
        });
    };

    (catalogRooms || []).forEach((r) => add(r, {}));
    (availableRooms || []).forEach((r) => add(r, { available: true }));
    if (assignedRoom) add(assignedRoom, { isAssigned: true });

    const availableIds = new Set((availableRooms || []).map((r) => r.id));

    return Array.from(map.values())
        .sort((a, b) => String(a.room.name || '').localeCompare(String(b.room.name || ''), 'fr'))
        .map(({ room, available, isAssigned }) => {
            let tag;
            if (isAssigned && selectedRoomId === room.id) {
                tag = available ? 'salle actuelle' : 'salle actuelle — occupée sur ce créneau';
            } else if (!available) {
                tag = 'occupée sur ce créneau';
            }
            const isCurrentSelection = selectedRoomId === room.id;
            return {
                value: room.id,
                label: formatRoomLabel(room, { tag }),
                disabled: !available && !isCurrentSelection,
            };
        });
}

/**
 * Affichage en lecture seule du type d'événement sélectionné dans le formulaire
 * (réagit aux changements via Form.useWatch).
 */
function SelectedEventTypeBadge({ eventTypes, form }) {
    const selectedId = Form.useWatch('eventTypeId', form);
    const selected = (eventTypes || []).find((t) => t.id === selectedId);
    if (!selected) {
        return <Tag color="default">Réunion (par défaut)</Tag>;
    }
    return (
        <Space size={6}>
            <Tag
                icon={<TeamOutlined />}
                color="blue"
                style={{
                    margin: 0,
                    borderColor: selected.color || undefined,
                    color: selected.color || undefined,
                    background: 'transparent',
                    fontWeight: 600,
                }}
            >
                {selected.name}
            </Tag>
            {/* <Text type="secondary" style={{ fontSize: 12 }}>
                Type verrouillé pour ce formulaire.
            </Text> */}
        </Space>
    );
}

export default function MeetingFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const { user } = useAuth();
    const [form] = Form.useForm();

    const [rooms, setRooms] = useState([]);
    const [users, setUsers] = useState([]);
    const [directions, setDirections] = useState([]);
    const [projects, setProjects] = useState([]);
    const [eventTypes, setEventTypes] = useState([]);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [assignedRoom, setAssignedRoom] = useState(null);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const projectIdFromUrl = searchParams.get('projectId');
    const {
        loading: projectScopeLoading,
        assignableProjects,
        defaultProjectId,
        primaryProject,
        lockedSingle,
        canSubmit,
    } = useResponsibleProjectScope(user, { projectIdFromUrl, enabled: !isEdit });

    const startTime = Form.useWatch('startTime', form);
    const endTime = Form.useWatch('endTime', form);
    const selectedRoomId = Form.useWatch('roomId', form);

    useEffect(() => {
        if (!isEdit && defaultProjectId) {
            applyDefaultProjectToForm(form, defaultProjectId);
        }
    }, [isEdit, defaultProjectId, form]);

    useEffect(() => {
        if (!isEdit && isAssistant(user?.role) && user?.directionId) {
            form.setFieldsValue({ directionId: user.directionId });
        }
    }, [isEdit, user?.role, user?.directionId, form]);

    const roomSelectOptions = useMemo(
        () => mergeRoomOptions({
            availableRooms,
            catalogRooms: rooms,
            assignedRoom,
            selectedRoomId,
        }),
        [availableRooms, rooms, assignedRoom, selectedRoomId],
    );

    const selectedRoom = useMemo(() => {
        if (!selectedRoomId) return null;
        if (assignedRoom?.id === selectedRoomId) return assignedRoom;
        return rooms.find((r) => r.id === selectedRoomId)
            || availableRooms.find((r) => r.id === selectedRoomId)
            || null;
    }, [selectedRoomId, assignedRoom, rooms, availableRooms]);

    const pageTitle = useMemo(
        () => (isEdit ? 'Modifier la réunion' : 'Nouvelle réunion'),
        [isEdit]
    );

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const [roomRes, userRes, taxonomyRes] = await Promise.all([
                    api.get('/rooms'),
                    api.get('/users/participants'),
                    api.get('/events/taxonomy'),
                ]);
                if (!mounted) return;
                setRooms(roomRes.data || []);
                setUsers(userRes.data || []);
                setDirections(taxonomyRes?.data?.directions || []);
                const loadedProjects = taxonomyRes?.data?.projects || [];
                setProjects(loadedProjects);
                setEventTypes(taxonomyRes?.data?.eventTypes || []);

                if (isEdit) {
                    const { data } = await api.get(`/meetings/${id}`);
                    if (!mounted) return;
                    const meetingRoom = data.room
                        || (data.roomId
                            ? (roomRes.data || []).find((r) => r.id === data.roomId)
                            : null);
                    if (meetingRoom) setAssignedRoom(meetingRoom);
                    form.setFieldsValue({
                        title: data.title,
                        agenda: data.agenda,
                        roomId: data.roomId || undefined,
                        directionId: data.directionId || undefined,
                        projectId: data.projectId || undefined,
                        eventTypeId: data.eventTypeId || data.eventType?.id || undefined,
                        meetingLink: data.meetingLink || '',
                        startTime: data.startTime ? dayjs(data.startTime) : null,
                        endTime: data.endTime ? dayjs(data.endTime) : null,
                    });
                } else {
                    const dateParam = searchParams.get('date');
                    const roomIdParam = searchParams.get('roomId');
                    const requestedTypeId = searchParams.get('eventTypeId') || null;
                    let start = dayjs().hour(9).minute(0).second(0);
                    let end = dayjs().hour(10).minute(0).second(0);
                    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
                        const d = dayjs(dateParam);
                        start = d.hour(9).minute(0).second(0);
                        end = d.hour(10).minute(0).second(0);
                    }
                    const allTypes = taxonomyRes?.data?.eventTypes || [];
                    const fromUrl = requestedTypeId ? allTypes.find((t) => t.id === requestedTypeId) : null;
                    // Priorité : 1) type passé en URL  2) REUNION  3) premier type disponible
                    const defaultEt = fromUrl
                        || allTypes.find((t) => t.code === 'REUNION')
                        || allTypes[0];
                    form.setFieldsValue({
                        startTime: start,
                        endTime: end,
                        roomId: roomIdParam || undefined,
                        meetingLink: '',
                        title: '',
                        agenda: '',
                        participantIds: [],
                        ...(defaultProjectId ? { projectId: defaultProjectId } : {}),
                        ...(defaultEt ? { eventTypeId: defaultEt.id } : {}),
                    });
                }
            } catch (err) {
                message.error(err?.response?.data?.error || 'Impossible de charger les données');
                if (isEdit) navigate('/meetings');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [id, isEdit]);

    useEffect(() => {
        if (!startTime || !endTime) {
            setAvailableRooms([]);
            return;
        }
        const startIso = toUtcIso(startTime);
        const endIso = toUtcIso(endTime);
        if (!startIso || !endIso) {
            setAvailableRooms([]);
            return;
        }
        setLoadingRooms(true);
        api.get('/rooms/available', {
            params: {
                startTime: startIso,
                endTime: endIso,
                excludeMeetingId: isEdit ? id : undefined,
            },
        })
            .then((res) => setAvailableRooms(res.data || []))
            .catch(() => setAvailableRooms([]))
            .finally(() => setLoadingRooms(false));
    }, [startTime, endTime, id, isEdit]);

    const onSubmit = async (values) => {
        if (!isEdit && !canSubmit) {
            setSubmitError("Vous n'êtes responsable d'aucun projet actif. Contactez l'administration.");
            return;
        }
        const startIso = toUtcIso(values.startTime);
        const endIso = toUtcIso(values.endTime);
        const link = String(values.meetingLink || '').trim();
        setSubmitError('');
        if (!startIso || !endIso || new Date(startIso) >= new Date(endIso)) {
            setSubmitError('Choisissez un créneau valide (fin après le début).');
            return;
        }
        if (!values.roomId && !link) {
            setSubmitError('Renseignez une salle ou un lien de visioconférence.');
            return;
        }
        if (link) {
            try {
                const u = new URL(link);
                if (!['http:', 'https:'].includes(u.protocol)) throw new Error('invalid');
            } catch {
                setSubmitError('Lien de visioconférence invalide (http/https requis).');
                return;
            }
        }
        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/meetings/${id}`, {
                    title: values.title,
                    agenda: values.agenda,
                    roomId: values.roomId || null,
                    directionId: values.directionId || null,
                    projectId: values.projectId || null,
                    eventTypeId: values.eventTypeId || null,
                    meetingLink: link || null,
                    startTime: startIso,
                    endTime: endIso,
                });
                message.success('Réunion modifiée');
                navigate(`/meetings/${id}`);
                return;
            }

            await api.post('/meetings', {
                title: values.title,
                agenda: values.agenda,
                roomId: values.roomId || undefined,
                directionId: values.directionId || undefined,
                projectId: values.projectId || defaultProjectId || undefined,
                eventTypeId: values.eventTypeId || undefined,
                meetingLink: link || undefined,
                startTime: startIso,
                endTime: endIso,
                participants: values.participantIds || [],
            });
            message.success('Réunion créée');
            navigate('/meetings');
        } catch (err) {
            setSubmitError(err?.response?.data?.error || 'Erreur lors de l’enregistrement');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEdit ? `/meetings/${id}` : '/meetings')}>
                    {isEdit ? 'Retour à la réunion' : 'Retour aux réunions'}
                </Button>
                <Title level={3} style={{ margin: 0 }}>{pageTitle}</Title>
            </Space>

            <Card>
                {submitError && <Alert type="error" showIcon message={submitError} style={{ marginBottom: 16 }} />}
                {!isEdit && (
                    <ResponsibleProjectBanner
                        user={user}
                        assignableProjects={assignableProjects}
                        loading={projectScopeLoading}
                        primaryProject={primaryProject}
                    />
                )}
                <Form form={form} layout="vertical" onFinish={onSubmit}>
                    <Form.Item name="title" label="Titre" rules={[{ required: true, message: 'Titre requis' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="agenda" label="Ordre du jour">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    {/* Type d'événement — verrouillé : automatiquement défini (REUNION ou type passé en URL).
                        On garde un Form.Item caché pour conserver la valeur dans le payload de soumission. */}
                    <Form.Item name="eventTypeId" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Type d'événement">
                        <SelectedEventTypeBadge eventTypes={eventTypes} form={form} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="directionId" label={isAssistant(user?.role) ? 'Direction' : 'Direction (optionnel)'}>
                                <Select
                                    allowClear={!isAssistant(user?.role)}
                                    disabled={isAssistant(user?.role)}
                                    options={directions.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <ResponsibleProjectField
                                user={user}
                                assignableProjects={isEdit ? projects : assignableProjects}
                                lockedSingle={!isEdit && lockedSingle}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="startTime" label="Début" rules={[{ required: true, message: 'Requis' }]}>
                                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="endTime" label="Fin" rules={[{ required: true, message: 'Requis' }]}>
                                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="roomId"
                        label="Salle"
                        extra={selectedRoom
                            ? `Sélectionnée : ${formatRoomLabel(selectedRoom)}`
                            : 'Choisissez une salle libre sur le créneau ou renseignez un lien visio.'}
                    >
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            loading={loadingRooms}
                            placeholder={loadingRooms ? 'Chargement des salles…' : 'Sélectionner une salle'}
                            options={roomSelectOptions}
                            notFoundContent={loadingRooms ? <Spin size="small" /> : 'Aucune salle libre sur ce créneau'}
                        />
                    </Form.Item>
                    {isEdit && assignedRoom && selectedRoomId === assignedRoom.id
                        && !availableRooms.some((r) => r.id === assignedRoom.id) && (
                        <Alert
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                            message={`La salle « ${assignedRoom.name} » est occupée sur le créneau choisi. Modifiez les horaires ou choisissez une autre salle.`}
                        />
                    )}
                    <Form.Item name="meetingLink" label="Lien visio (optionnel)">
                        <Input placeholder="https://meet.google.com/..." />
                    </Form.Item>
                    {!isEdit && (
                        <Form.Item name="participantIds" label="Participants supplémentaires">
                            <Select
                                mode="multiple"
                                optionFilterProp="label"
                                options={users.map((u) => ({
                                    value: u.id,
                                    label: `${u.name}${u.jobTitle ? ` — ${u.jobTitle}` : ''} (${u.email})`,
                                }))}
                            />
                        </Form.Item>
                    )}
                    <Space direction="vertical" size={4}>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={saving} disabled={!isEdit && !canSubmit}>
                                {isEdit ? 'Enregistrer les modifications' : 'Créer la réunion'}
                            </Button>
                            <Button onClick={() => navigate(isEdit ? `/meetings/${id}` : '/meetings')}>
                                Annuler
                            </Button>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Une salle ou un lien de visioconférence est obligatoire.
                        </Text>
                    </Space>
                </Form>
            </Card>
        </div>
    );
}

