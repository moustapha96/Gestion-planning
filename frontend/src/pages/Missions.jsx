import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Table,
    Button,
    Space,
    Input,
    Select,
    Typography,
    App,
    Tag,
    Popconfirm,
    Row,
    Col,
} from 'antd';
import { PlusOutlined, FlagOutlined, EnvironmentOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    canManageMission, canEditMission, canPrivilegedForceDelete, canCreateMission,
    canConsolidateMission, canFinalizeMission, canCoordinateMission, canApproveMission,
} from '../utils/roles';
import { forceDeleteDescription, forceDeleteTitle } from '../utils/deleteConfirm';
import ForceDeletePopconfirm from '../components/ForceDeletePopconfirm';

import { missionStatusLabel } from '../utils/statusLabels';

const { Title } = Typography;

const STATUS_COLORS = {
    DRAFT: 'default',
    CONSOLIDATOR_PENDING: 'orange',
    COORDINATOR_PENDING: 'orange',
    CONFIRMED: 'green',
    CANCELLED: 'default',
};

export default function Missions() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { message } = App.useApp();
    const [missions, setMissions] = useState([]);
    const [projects, setProjects] = useState([]);
    const [directions, setDirections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [directionFilter, setDirectionFilter] = useState(undefined);
    const [projectFilter, setProjectFilter] = useState(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const fetchStaticData = async () => {
        try {
            const { data: taxonomyData } = await api.get('/events/taxonomy');
            setDirections(taxonomyData?.directions || []);
            setProjects(taxonomyData?.projects || []);
        } catch {
            message.error('Impossible de charger les référentiels');
        }
    };

    const fetchMissions = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/missions', {
                params: {
                    q: searchText || undefined,
                    directionId: directionFilter || undefined,
                    projectId: projectFilter || undefined,
                    page,
                    limit: pageSize,
                },
            });
            const items = Array.isArray(data) ? data : (data?.items || []);
            setMissions(items);
            setTotal(Array.isArray(data) ? items.length : (data?.total || 0));
        } catch {
            message.error('Impossible de charger les missions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaticData();
    }, []);
    useEffect(() => {
        fetchMissions();
    }, [searchText, directionFilter, projectFilter, page, pageSize]);

    const canForceDelete = canPrivilegedForceDelete(user?.role);

    const handleCancelMission = async (missionId) => {
        setActionLoadingId(missionId);
        try {
            await api.delete(`/missions/${missionId}`);
            message.success('Mission annulée');
            fetchMissions();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handlePermanentDeleteMission = async (missionId) => {
        setActionLoadingId(missionId);
        try {
            await api.delete(`/missions/${missionId}?permanent=1`);
            message.success('Mission supprimée définitivement');
            fetchMissions();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setActionLoadingId(null);
        }
    };

    const columns = [
        {
            title: 'Mission',
            dataIndex: 'title',
            key: 'title',
            render: (title, record) => (
                <Space direction="vertical" size={4}>
                    <Space>
                        <FlagOutlined style={{ color: '#722ed1' }} />
                        <Button type="link" onClick={() => navigate(`/missions/${record.id}`)} style={{ padding: 0 }}>
                            {title}
                        </Button>
                    </Space>
                    <Space size={6} wrap>
                        {record.direction?.name && <Tag color="purple">Direction: {record.direction.name}</Tag>}
                        {record.project?.name && <Tag color="blue">Projet: {record.project.name}</Tag>}
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Lieu',
            dataIndex: 'location',
            key: 'location',
            ellipsis: true,
            render: (loc) => (
                <span>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {loc}
                </span>
            ),
        },
        {
            title: 'Début',
            dataIndex: 'startTime',
            key: 'startTime',
            render: (t) => (t ? dayjs(t).format('DD/MM/YYYY HH:mm') : '—'),
        },
        {
            title: 'Fin',
            dataIndex: 'endTime',
            key: 'endTime',
            render: (t) => (t ? dayjs(t).format('DD/MM/YYYY HH:mm') : '—'),
        },
        {
            title: 'Créée par',
            key: 'createdBy',
            render: (_, r) => r.createdBy?.name || '—',
        },
        // {
        //     title: 'Intervenants',
        //     key: 'assignments',
        //     render: (_, r) =>
        //         r.assignments?.length
        //             ? r.assignments.map((a) => a.user?.name).filter(Boolean).join(', ') || '—'
        //             : '—',
        // },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s, record) => (
                <Tag color={STATUS_COLORS[s] || 'default'}>
                    {record.statusLabel || missionStatusLabel(record)}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/missions/${record.id}`)}
                    >
                        Détail
                    </Button>
                            {canApproveMission(record, user) && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={async () => {
                                        setActionLoadingId(record.id);
                                        try {
                                            await api.put(`/missions/${record.id}/approve`);
                                            message.success('Mission consolidée et confirmée (admin)');
                                            fetchMissions();
                                        } catch (err) {
                                            message.error(err.response?.data?.error || 'Erreur');
                                        } finally {
                                            setActionLoadingId(null);
                                        }
                                    }}
                                    loading={actionLoadingId === record.id}
                                >
                                    Consolider (admin)
                                </Button>
                            )}
                            {!canApproveMission(record, user) && canCoordinateMission(record, user) && (
                        <Button
                            type="link"
                            size="small"
                            onClick={async () => {
                                setActionLoadingId(record.id);
                                try {
                                    await api.put(`/missions/${record.id}/approve-coordinator`);
                                    message.success('Mission validée par le coordinateur');
                                    fetchMissions();
                                } catch (err) {
                                    message.error(err.response?.data?.error || 'Erreur');
                                } finally {
                                    setActionLoadingId(null);
                                }
                            }}
                            loading={actionLoadingId === record.id}
                        >
                            Valider (coordinateur)
                        </Button>
                    )}
                            {!canApproveMission(record, user) && canConsolidateMission(record, user) && (
                        <Button
                            type="link"
                            size="small"
                            onClick={async () => {
                                setActionLoadingId(record.id);
                                try {
                                    await api.put(`/missions/${record.id}/approve`);
                                    message.success('Mission consolidée');
                                    fetchMissions();
                                } catch (err) {
                                    message.error(err.response?.data?.error || 'Erreur');
                                } finally {
                                    setActionLoadingId(null);
                                }
                            }}
                            loading={actionLoadingId === record.id}
                        >
                            Consolider
                        </Button>
                    )}
                            {!canApproveMission(record, user) && canFinalizeMission(record, user) && (
                        <Button
                            type="link"
                            size="small"
                            onClick={async () => {
                                setActionLoadingId(record.id);
                                try {
                                    await api.put(`/missions/${record.id}/approve-coordinator`);
                                    message.success('Mission validée définitivement');
                                    fetchMissions();
                                } catch (err) {
                                    message.error(err.response?.data?.error || 'Erreur');
                                } finally {
                                    setActionLoadingId(null);
                                }
                            }}
                            loading={actionLoadingId === record.id}
                        >
                            Valider (legacy)
                        </Button>
                    )}
                    {canManageMission(record, user) && (
                        <>
                            {canEditMission(record, user) && (
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => navigate(`/missions/${record.id}/edit`)}
                                >
                                    Modifier
                                </Button>
                            )}
                            {record.status !== 'CANCELLED' && (
                                <Popconfirm
                                    title="Annuler cette mission ?"
                                    description="La mission sera marquée comme annulée."
                                    onConfirm={() => handleCancelMission(record.id)}
                                    okText="Oui, annuler"
                                    cancelText="Non"
                                    okButtonProps={{ danger: true, loading: actionLoadingId === record.id }}
                                >
                                    <Button
                                        type="link"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        loading={actionLoadingId === record.id}
                                    >
                                        Annuler
                                    </Button>
                                </Popconfirm>
                            )}
                            {canForceDelete && (
                                <ForceDeletePopconfirm
                                    title={forceDeleteTitle('cette mission')}
                                    description={forceDeleteDescription({ entityLabel: 'cette mission' })}
                                    loading={actionLoadingId === record.id}
                                    onConfirm={() => handlePermanentDeleteMission(record.id)}
                                >
                                    <Button type="link" size="small" danger loading={actionLoadingId === record.id}>
                                        Supprimer
                                    </Button>
                                </ForceDeletePopconfirm>
                            )}
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <FlagOutlined /> Missions
                </Title>
                {canCreateMission(user?.role) && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/missions/new')}>
                        Nouvelle mission
                    </Button>
                )}
            </div>

            <Card>
                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={10}>
                        <Input
                            allowClear
                            placeholder="Rechercher titre, description, lieu, direction, projet..."
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
                    rowKey="id"
                    loading={loading}
                    dataSource={missions}
                    columns={columns}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        onChange: (p, s) => { setPage(p); setPageSize(s); },
                    }}
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: 'Aucune mission' }}
                />
            </Card>
        </div>
    );
}
