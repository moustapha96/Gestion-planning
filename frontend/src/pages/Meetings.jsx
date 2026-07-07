import { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Typography, Space, Modal, Form, Input, Select, DatePicker, App, Row, Col, Alert } from 'antd';
import { PlusOutlined, StopOutlined, CheckCircleOutlined, RollbackOutlined, VideoCameraOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { appYmd, toUtcIso } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import {
    canManageMeeting,
    canEditMeeting,
    canPrivilegedForceDelete,
    canConsolidateMeeting,
    canCoordinateMeeting,
    canFinalizeMeeting,
    canApproveMeeting,
} from '../utils/roles';
import { meetingStatusLabel } from '../utils/statusLabels';
import { forceDeleteDescription, forceDeleteTitle } from '../utils/deleteConfirm';
import ResponsibleProjectField, { ResponsibleProjectBanner } from '../components/ResponsibleProjectField';
import { applyDefaultProjectToForm, useResponsibleProjectScope } from '../hooks/useResponsibleProjectScope';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    DRAFT: 'default',
    CONSOLIDATOR_PENDING: 'orange',
    COORDINATOR_PENDING: 'geekblue',
    SENT: 'blue',
    CONFIRMED: 'green',
    COMPLETED: 'cyan',
    CANCELLED: 'red',
};

export default function Meetings() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { message, modal } = App.useApp();
    const [meetings, setMeetings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [createModalError, setCreateModalError] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [form] = Form.useForm();
    const [availableRooms, setAvailableRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [pendingRoomId, setPendingRoomId] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [directions, setDirections] = useState([]);
    const [projects, setProjects] = useState([]);
    const [eventTypes, setEventTypes] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [directionFilter, setDirectionFilter] = useState(undefined);
    const [projectFilter, setProjectFilter] = useState(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const {
        assignableProjects,
        defaultProjectId,
        primaryProject,
        lockedSingle,
        canSubmit,
        loading: projectScopeLoading,
    } = useResponsibleProjectScope(user);

    useEffect(() => {
        if (!createModal || !defaultProjectId) return;
        applyDefaultProjectToForm(form, defaultProjectId);
    }, [createModal, defaultProjectId, form]);

    const formatConflictError = (err) => {
        const data = err?.response?.data || {};
        const base = data.error || 'Conflit de planning détecté';
        if (!data.userId) return base;
        const u = users.find((x) => x.id === data.userId);
        if (!u) return base;
        return `${base} Utilisateur concerné : ${u.name} (${u.email}).`;
    };

    useEffect(() => { fetchStaticData(); }, []);
    useEffect(() => { fetchMeetings(); }, [searchText, directionFilter, projectFilter, page, pageSize]);

    // Compatibilité: anciens liens /meetings?create=1 redirigés vers la page dédiée.
    useEffect(() => {
        if (searchParams.get('create') !== '1') return;
        const params = new URLSearchParams();
        const date = searchParams.get('date');
        const roomId = searchParams.get('roomId');
        if (date) params.set('date', date);
        if (roomId) params.set('roomId', roomId);
        navigate(`/meetings/new${params.toString() ? `?${params}` : ''}`, { replace: true });
    }, [searchParams]);

    // Quand les salles libres arrivent, appliquer roomId en attente (ex. depuis /rooms)
    useEffect(() => {
        if (!createModal || !pendingRoomId || availableRooms.length === 0) return;
        if (availableRooms.some((r) => r.id === pendingRoomId)) {
            form.setFieldValue('roomId', pendingRoomId);
            setPendingRoomId(null);
        }
    }, [createModal, pendingRoomId, availableRooms]);

    // Charger les salles libres pour le créneau choisi (réunions sur salle libre + créneau libre)
    const startTime = Form.useWatch('startTime', form);
    const endTime = Form.useWatch('endTime', form);
    useEffect(() => {
        if (!createModal || !startTime || !endTime) {
            setAvailableRooms([]);
            return;
        }
        const startIso = toUtcIso(startTime);
        const endIso = toUtcIso(endTime);
        if (!startIso || !endIso || startIso >= endIso) {
            setAvailableRooms([]);
            return;
        }
        setLoadingRooms(true);
        api.get('/rooms/available', {
            params: { startTime: startIso, endTime: endIso },
        })
            .then((res) => {
                const list = res.data || [];
                setAvailableRooms(list);
                const currentRoomId = form.getFieldValue('roomId');
                if (currentRoomId && !list.some((r) => r.id === currentRoomId)) {
                    form.setFieldValue('roomId', undefined);
                }
            })
            .catch(() => setAvailableRooms([]))
            .finally(() => setLoadingRooms(false));
    }, [createModal, startTime, endTime]);

    const roomId = Form.useWatch('roomId', form);
    useEffect(() => {
        if (!createModal || !roomId || !startTime) {
            setBookedSlots([]);
            return;
        }
        const dateStr = appYmd(startTime);
        api.get(`/rooms/${roomId}/bookings`, { params: { date: dateStr } })
            .then((res) => setBookedSlots(res.data?.bookings || []))
            .catch(() => setBookedSlots([]));
    }, [createModal, roomId, startTime]);

    const fetchStaticData = async () => {
        try {
            const [roomRes, userRes, taxonomyRes] = await Promise.all([
                api.get('/rooms'),
                api.get('/users/participants'),
                api.get('/events/taxonomy'),
            ]);
            setRooms(roomRes.data);
            setUsers(userRes.data || []);
            setDirections(taxonomyRes?.data?.directions || []);
            setProjects(taxonomyRes?.data?.projects || []);
            setEventTypes(taxonomyRes?.data?.eventTypes || []);
        } catch {
            message.error('Impossible de charger les données');
        }
    };

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/meetings', {
                params: {
                    q: searchText || undefined,
                    directionId: directionFilter || undefined,
                    projectId: projectFilter || undefined,
                    page,
                    limit: pageSize,
                },
            });
            const items = Array.isArray(data) ? data : (data?.items || []);
            setMeetings(items);
            setTotal(Array.isArray(data) ? items.length : (data?.total || 0));
        } catch {
            message.error('Impossible de charger les réunions');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (values) => {
        if (!canSubmit) {
            message.warning("Vous n'êtes responsable d'aucun projet actif.");
            return;
        }
        const startIso = toUtcIso(values.startTime);
        const endIso = toUtcIso(values.endTime);
        const link = String(values.meetingLink || '').trim();
        if (!startIso || !endIso || startIso >= endIso) {
            message.error('Choisissez un créneau valide (fin après le début)');
            return;
        }
        if (!values.roomId && !link) {
            message.error('Renseignez une salle ou un lien de visioconférence');
            return;
        }
        if (link) {
            try {
                const u = new URL(link);
                if (!['http:', 'https:'].includes(u.protocol)) {
                    throw new Error('invalid');
                }
            } catch {
                message.error('Lien de visioconférence invalide (http/https requis)');
                return;
            }
        }
        if (values.roomId) {
            const isAvailable = availableRooms.some((r) => r.id === values.roomId);
            if (!isAvailable) {
                message.error('Cette salle n\'est plus libre sur le créneau choisi. Sélectionnez une salle proposée.');
                return;
            }
        }
        setCreateLoading(true);
        setCreateModalError('');
        try {
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
            setCreateModal(false);
            form.resetFields();
            setAvailableRooms([]);
            setCreateModalError('');
            fetchMeetings();
        } catch (err) {
            const msg = formatConflictError(err) || 'Erreur lors de la création';
            setCreateModalError(msg);
            message.error(msg);
        } finally {
            setCreateLoading(false);
        }
    };

    const canForceDelete = canPrivilegedForceDelete(user?.role);

    const handleCancel = (id) => {
        modal.confirm({
            title: 'Annuler la réunion',
            content: 'Êtes-vous sûr de vouloir annuler cette réunion ? Les participants seront notifiés.',
            okText: 'Annuler la réunion',
            okButtonProps: { danger: true },
            cancelText: 'Retour',
            onOk: async () => {
                try {
                    await api.put(`/meetings/${id}/cancel`);
                    message.success('Réunion annulée');
                    fetchMeetings();
                } catch (err) {
                    message.error(err.response?.data?.error || 'Erreur');
                }
            },
        });
    };

    const handlePermanentDeleteMeeting = (id) => {
        modal.confirm({
            title: forceDeleteTitle('cette réunion'),
            content: forceDeleteDescription({ entityLabel: 'cette réunion' }),
            okText: 'Supprimer définitivement',
            okButtonProps: { danger: true },
            cancelText: 'Annuler',
            onOk: async () => {
                try {
                    await api.delete(`/meetings/${id}`);
                    message.success('Réunion supprimée définitivement');
                    fetchMeetings();
                } catch (err) {
                    message.error(err.response?.data?.error || 'Erreur');
                }
            },
        });
    };

    const handleComplete = (id) => {
        modal.confirm({
            title: 'Terminer la réunion',
            content: 'Confirmer la clôture de cette réunion ? Elle passera au statut "Terminée".',
            okText: 'Terminer',
            cancelText: 'Retour',
            onOk: async () => {
                try {
                    await api.put(`/meetings/${id}/complete`);
                    message.success('Réunion marquée comme terminée');
                    fetchMeetings();
                } catch (err) {
                    message.error(err.response?.data?.error || 'Erreur');
                }
            },
        });
    };

    const handleReopen = (id) => {
        modal.confirm({
            title: 'Rouvrir la réunion',
            content: 'Confirmer la réouverture de cette réunion terminée ?',
            okText: 'Rouvrir',
            cancelText: 'Retour',
            onOk: async () => {
                try {
                    await api.put(`/meetings/${id}/reopen`);
                    message.success('Réunion rouverte');
                    fetchMeetings();
                } catch (err) {
                    message.error(err.response?.data?.error || 'Erreur');
                }
            },
        });
    };

    const columns = [
        {
            title: 'Titre',
            dataIndex: 'title',
            key: 'title',
            ellipsis: true,
            render: (title, record) => (
                <Space direction="vertical" size={4}>
                    <Space size={8}>
                        <span>{title}</span>
                        {record.meetingLink && (
                            <Tag color="geekblue" icon={<VideoCameraOutlined />}>
                                Visio
                            </Tag>
                        )}
                    </Space>
                    <Space size={6} wrap>
                        {record.eventType?.name && (
                            <Tag style={{ borderColor: record.eventType.color, color: record.eventType.color }}>
                                {record.eventType.name}
                            </Tag>
                        )}
                        {record.direction?.name && <Tag color="purple">Direction: {record.direction.name}</Tag>}
                        {record.project?.name && <Tag color="blue">Projet: {record.project.name}</Tag>}
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'startTime',
            key: 'startTime',
            render: (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        },
        { title: 'Salle', key: 'room', render: (_, r) => r.room?.name || '—' },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s, record) => {
                const label = record.statusLabel || meetingStatusLabel(record);
                const color = STATUS_COLORS[s] || (s === 'CONSOLIDATOR_PENDING' ? 'orange' : 'default');
                return <Tag color={color}>{label}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button size="small" type="link" onClick={() => navigate(`/meetings/${record.id}`)}>
                        Voir le détail
                    </Button>
                    {canEditMeeting(record, user) && (
                        <Button
                            size="small"
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => navigate(`/meetings/${record.id}/edit`)}
                        >
                            Modifier la réunion
                        </Button>
                    )}
                    {canApproveMeeting(record, user) && (
                        <Button
                            size="small"
                            type="link"
                            loading={actionLoadingId === record.id}
                            onClick={async () => {
                                setActionLoadingId(record.id);
                                try {
                                    await api.put(`/meetings/${record.id}/approve`);
                                    message.success('Réunion consolidée et publiée (admin)');
                                    fetchMeetings();
                                } catch (err) {
                                    message.error(err.response?.data?.error || 'Erreur');
                                } finally {
                                    setActionLoadingId(null);
                                }
                            }}
                        >
                            Consolider (admin)
                        </Button>
                    )}
                    {!canApproveMeeting(record, user) && canCoordinateMeeting(record, user) && (
                        <Button
                            size="small"
                            type="link"
                            loading={actionLoadingId === record.id}
                            onClick={async () => {
                                setActionLoadingId(record.id);
                                try {
                                    await api.put(`/meetings/${record.id}/approve-coordinator`);
                                    message.success('Réunion validée par le coordinateur');
                                    fetchMeetings();
                                } catch (err) {
                                    message.error(err.response?.data?.error || 'Erreur');
                                } finally {
                                    setActionLoadingId(null);
                                }
                            }}
                        >
                            Valider (coordinateur)
                        </Button>
                    )}
                    {!canApproveMeeting(record, user) && canConsolidateMeeting(record, user) && (
                        <Button
                            size="small"
                            type="link"
                            loading={actionLoadingId === record.id}
                            onClick={async () => {
                                setActionLoadingId(record.id);
                                try {
                                    await api.put(`/meetings/${record.id}/approve`);
                                    message.success('Réunion consolidée et publiée');
                                    fetchMeetings();
                                } catch (err) {
                                    message.error(err.response?.data?.error || 'Erreur');
                                } finally {
                                    setActionLoadingId(null);
                                }
                            }}
                        >
                            Consolider
                        </Button>
                    )}
                    {!canApproveMeeting(record, user) && canFinalizeMeeting(record, user) && (
                        <Button
                            size="small"
                            type="link"
                            loading={actionLoadingId === record.id}
                            onClick={async () => {
                                setActionLoadingId(record.id);
                                try {
                                    await api.put(`/meetings/${record.id}/approve-coordinator`);
                                    message.success('Réunion validée définitivement');
                                    fetchMeetings();
                                } catch (err) {
                                    message.error(err.response?.data?.error || 'Erreur');
                                } finally {
                                    setActionLoadingId(null);
                                }
                            }}
                        >
                            Valider (legacy)
                        </Button>
                    )}
                    {record.status !== 'CANCELLED' && record.status !== 'COMPLETED' && canManageMeeting(record, user) && (
                        <Button size="small" type="default" icon={<CheckCircleOutlined />} onClick={() => handleComplete(record.id)}>
                            Terminer la réunion
                        </Button>
                    )}
                    {record.status !== 'CANCELLED' && record.status !== 'COMPLETED' && canManageMeeting(record, user) && (
                        <Button size="small" danger icon={<StopOutlined />} onClick={() => handleCancel(record.id)}>
                            Annuler la réunion
                        </Button>
                    )}
                    {record.status === 'COMPLETED' && (canManageMeeting(record, user) || user?.role === 'RESPONSABLE') && (
                        <Button size="small" icon={<RollbackOutlined />} onClick={() => handleReopen(record.id)}>
                            Rouvrir la réunion
                        </Button>
                    )}
                    {canForceDelete && (
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handlePermanentDeleteMeeting(record.id)}
                        >
                            Supprimer définitivement
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <Title level={3} style={{ margin: 0 }}>Réunions</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/meetings/new')}>
                    Nouvelle réunion
                </Button>
            </div>

            <Card>
                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={10}>
                        <Input
                            allowClear
                            placeholder="Rechercher titre, agenda, salle, direction, projet..."
                            value={searchText}
                            onChange={(e) => { setPage(1); setSearchText(e.target.value); }}
                        />
                    </Col>
                    <Col xs={12} md={7}>
                        <Select
                            allowClear
                            placeholder="Filtrer par direction"
                            style={{ width: '100%' }}
                            value={directionFilter}
                            onChange={(v) => { setPage(1); setDirectionFilter(v); }}
                            options={directions.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                        />
                    </Col>
                    <Col xs={12} md={7}>
                        <Select
                            allowClear
                            placeholder="Filtrer par projet"
                            style={{ width: '100%' }}
                            value={projectFilter}
                            onChange={(v) => { setPage(1); setProjectFilter(v); }}
                            options={projects.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name }))}
                        />
                    </Col>
                </Row>
                <Table
                    columns={columns}
                    dataSource={meetings}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        onChange: (p, s) => { setPage(p); setPageSize(s); },
                    }}
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: 'Aucune réunion' }}
                />
            </Card>

            <Modal
                title="Nouvelle réunion"
                open={createModal}
                onOk={() => form.submit()}
                onCancel={() => { setCreateModal(false); form.resetFields(); setCreateModalError(''); }}
                okText="Créer la réunion"
                cancelText="Annuler"
                confirmLoading={createLoading}
                okButtonProps={{ disabled: !canSubmit }}
            >
                {createModalError && (
                    <Alert
                        type="error"
                        showIcon
                        title={createModalError}
                        style={{ marginTop: 12, marginBottom: 12 }}
                    />
                )}
                <ResponsibleProjectBanner
                    user={user}
                    assignableProjects={assignableProjects}
                    loading={projectScopeLoading}
                    primaryProject={primaryProject}
                />
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
                    <Form.Item name="title" label="Titre" rules={[{ required: true, message: 'Titre requis' }]}>
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
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="directionId" label="Direction (optionnel)">
                                <Select
                                    allowClear
                                    placeholder="Choisir une direction"
                                    options={directions.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <ResponsibleProjectField
                                user={user}
                                assignableProjects={assignableProjects}
                                lockedSingle={lockedSingle}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="startTime" label="Début" rules={[{ required: true, message: 'Requis' }]}>
                                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="endTime" label="Fin" rules={[{ required: true, message: 'Requis' }]}>
                                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="roomId"
                        label="Salle (libre sur le créneau choisi)"
                        extra={startTime && endTime ? (
                            <Text type="secondary">
                                Seules les salles libres sur le créneau sélectionné sont proposées.
                            </Text>
                        ) : (
                            <Text type="secondary">Choisissez d'abord le créneau (début et fin) pour voir les salles disponibles.</Text>
                        )}
                    >
                        <Select
                            placeholder={startTime && endTime ? "Sélectionner une salle libre" : "Choisir d'abord le créneau"}
                            allowClear
                            loading={loadingRooms}
                            disabled={!startTime || !endTime}
                            optionFilterProp="label"
                        >
                            {availableRooms.map((r) => (
                                <Select.Option key={r.id} value={r.id} label={`${r.name} (${r.capacity} pers.)`}>
                                    {r.name} — {r.capacity} pers. {r.location ? `· ${r.location}` : ''}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="meetingLink"
                        label="Lien visio (optionnel)"
                        extra={<Text type="secondary">Google Meet, Zoom, Teams, Jitsi... (http/https)</Text>}
                    >
                        <Input placeholder="https://meet.google.com/..." />
                    </Form.Item>
                    {bookedSlots.length > 0 && (
                        <Alert
                            type="info"
                            showIcon
                            title="Créneaux déjà réservés pour cette salle ce jour"
                            description={
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {bookedSlots.map((b) => (
                                        <li key={b.id}>
                                            <Text strong>{b.startTime} – {b.endTime}</Text>
                                            {b.meetingTitle && ` — ${b.meetingTitle}`}
                                        </li>
                                    ))}
                                </ul>
                            }
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    {roomId && startTime && endTime && availableRooms.length > 0 && !availableRooms.some((r) => r.id === roomId) && (
                        <Alert
                            type="warning"
                            showIcon
                            title="Cette salle n'est pas disponible sur le créneau choisi"
                            description="Le créneau sélectionné est déjà réservé pour cette salle. Choisissez une autre salle dans la liste ou un autre horaire."
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    {users.length > 0 && (
                        <Form.Item name="participantIds" label="Participants supplémentaires">
                            <Select mode="multiple" placeholder="Sélectionner des participants" optionFilterProp="children">
                                {users.filter(u => u.id !== user?.id).map((u) => (
                                    <Select.Option key={u.id} value={u.id}>
                                        {u.name}
                                        {u.jobTitle ? ` — ${u.jobTitle}` : ''}
                                        {' '}
                                        <span style={{ color: '#888' }}>({u.email})</span>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
