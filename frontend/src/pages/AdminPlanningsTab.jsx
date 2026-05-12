import { useEffect, useState, useCallback } from 'react';
import {
    Table,
    Tag,
    Button,
    Space,
    Typography,
    Select,
    DatePicker,
    Modal,
    Input,
    Row,
    Col,
    Form,
    Popconfirm,
    App,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    PlusOutlined,
    SendOutlined,
    CheckOutlined,
    RollbackOutlined,
    DeleteOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';

const { Text } = Typography;
const STATUS_COLORS = {
    DRAFT: 'default',
    SUBMITTED: 'blue',
    IN_CONSOLIDATION: 'purple',
    CP_PENDING: 'geekblue',
    SG_PENDING: 'cyan',
    DG_PENDING: 'gold',
    VALIDATED: 'green',
    RETURNED: 'orange',
    CANCELLED: 'red',
};
const STATUS_LABELS = {
    DRAFT: 'Brouillon',
    SUBMITTED: 'Soumis',
    IN_CONSOLIDATION: 'En consolidation',
    CP_PENDING: 'Att. coordinateur',
    SG_PENDING: 'Att. SG ou direction',
    DG_PENDING: 'Att. DG',
    VALIDATED: 'Validé',
    RETURNED: 'Retourné',
    CANCELLED: 'Annulé',
};

export default function AdminPlanningsTab() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState();
    const [userIdFilter, setUserIdFilter] = useState();
    const [weekFrom, setWeekFrom] = useState();
    const [weekTo, setWeekTo] = useState();
    const [users, setUsers] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [returnModal, setReturnModal] = useState({ open: false, id: null });
    const [returnComment, setReturnComment] = useState('');
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit };
            if (statusFilter) params.status = statusFilter;
            if (userIdFilter) params.userId = userIdFilter;
            if (weekFrom) params.weekFrom = weekFrom.toISOString();
            if (weekTo) params.weekTo = weekTo.toISOString();
            const res = await api.get('/plannings/admin/list', { params });
            setItems(res.data.items || []);
            setTotal(res.data.total || 0);
        } catch {
            message.error('Impossible de charger les plannings');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter, userIdFilter, weekFrom, weekTo, message]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        api.get('/users')
            .then((r) => setUsers(r.data || []))
            .catch(() => setUsers([]));
    }, []);

    const getMonday = (d) => {
        const date = new Date(d);
        date.setDate(date.getDate() - date.getDay() + 1);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const handleCreate = async (values) => {
        setCreateLoading(true);
        try {
            const weekStart = getMonday(values.weekStart?.toDate?.() || values.weekStart || new Date());
            await api.post('/plannings/admin/create', {
                userId: values.userId,
                weekStart: weekStart.toISOString(),
            });
            message.success('Planning créé');
            setCreateOpen(false);
            form.resetFields();
            load();
        } catch (err) {
            if (err.response?.status === 409) {
                message.warning(err.response?.data?.error || 'Planning déjà existant');
                if (err.response?.data?.planningId) navigate(`/planning/${err.response.data.planningId}`);
            } else {
                message.error(err.response?.data?.error || 'Erreur');
            }
        } finally {
            setCreateLoading(false);
        }
    };

    const runAction = async (id, fn) => {
        setActionId(id);
        try {
            await fn();
            message.success('Opération effectuée');
            load();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setActionId(null);
        }
    };

    const handleReturn = async () => {
        if (!returnComment.trim()) {
            message.warning('Commentaire requis');
            return;
        }
        setActionId(returnModal.id);
        try {
            await api.put(`/plannings/${returnModal.id}/return`, { comment: returnComment });
            message.success('Planning retourné');
            setReturnModal({ open: false, id: null });
            setReturnComment('');
            load();
        } catch (e) {
            message.error(e.response?.data?.error || 'Erreur');
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (id) => {
        setDeleteId(id);
        try {
            await api.delete(`/plannings/${id}`);
            message.success('Planning supprimé');
            load();
        } catch (e) {
            message.error(e.response?.data?.error || 'Erreur');
        } finally {
            setDeleteId(null);
        }
    };

    const columns = [
        {
            title: 'Semaine du',
            dataIndex: 'weekStart',
            key: 'weekStart',
            render: (d) =>
                d
                    ? new Date(d).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                      })
                    : '—',
        },
        {
            title: 'Responsable',
            key: 'user',
            ellipsis: true,
            render: (_, r) => (
                <span>
                    {r.user?.name}
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {r.user?.email}
                    </Text>
                </span>
            ),
        },
        { title: 'Événements', key: 'c', width: 90, render: (_, r) => r._count?.events ?? 0 },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s] || s}</Tag>,
        },
        {
            title: 'Soumis le',
            dataIndex: 'submittedAt',
            key: 'submittedAt',
            render: (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short' }) : '—'),
        },
        {
            title: 'Actions',
            key: 'a',
            width: 320,
            render: (_, record) => {
                const busy = actionId === record.id;
                return (
                    <Space wrap size={[4, 4]}>
                        <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => navigate(`/planning/${record.id}`)}
                        >
                            Détail
                        </Button>
                        {record.status === 'DRAFT' && (
                            <Button
                                size="small"
                                type="primary"
                                icon={<SendOutlined />}
                                loading={busy}
                                onClick={() => runAction(record.id, () => api.put(`/plannings/${record.id}/admin-submit`))}
                            >
                                Soumettre
                            </Button>
                        )}
                        {record.status === 'SUBMITTED' && (
                            <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                loading={busy}
                                onClick={() => runAction(record.id, () => api.put(`/plannings/${record.id}/consolidate`))}
                            >
                                Consolider
                            </Button>
                        )}
                        {(record.status === 'CP_PENDING' || record.status === 'IN_CONSOLIDATION') && (
                            <>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={busy}
                                    onClick={() => runAction(record.id, () => api.put(`/plannings/${record.id}/approve-cp`))}
                                >
                                    Accord coord.
                                </Button>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={busy}
                                    onClick={() => runAction(record.id, () => api.put(`/plannings/${record.id}/validate`))}
                                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                >
                                    Valider déf. (court-circuit)
                                </Button>
                                <Button
                                    size="small"
                                    danger
                                    icon={<RollbackOutlined />}
                                    onClick={() => setReturnModal({ open: true, id: record.id })}
                                >
                                    Retourner
                                </Button>
                            </>
                        )}
                        {record.status === 'SG_PENDING' && (
                            <>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={busy}
                                    onClick={() => runAction(record.id, () => api.put(`/plannings/${record.id}/approve-sg`))}
                                >
                                    Accord SG / dir.
                                </Button>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={busy}
                                    onClick={() => runAction(record.id, () => api.put(`/plannings/${record.id}/validate`))}
                                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                >
                                    Valider déf. (court-circuit)
                                </Button>
                                <Button
                                    size="small"
                                    danger
                                    icon={<RollbackOutlined />}
                                    onClick={() => setReturnModal({ open: true, id: record.id })}
                                >
                                    Retourner
                                </Button>
                            </>
                        )}
                        {record.status === 'DG_PENDING' && (
                            <>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={busy}
                                    onClick={() => runAction(record.id, () => api.put(`/plannings/${record.id}/validate`))}
                                >
                                    Valider déf.
                                </Button>
                                <Button
                                    size="small"
                                    danger
                                    icon={<RollbackOutlined />}
                                    onClick={() => setReturnModal({ open: true, id: record.id })}
                                >
                                    Retourner
                                </Button>
                            </>
                        )}
                        <Popconfirm
                            title="Supprimer ce planning ?"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Oui"
                            cancelText="Non"
                            okButtonProps={{ danger: true, loading: deleteId === record.id }}
                        >
                            <Button size="small" danger type="text" icon={<DeleteOutlined />} loading={deleteId === record.id}>
                                Suppr.
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Vue globale : créer des plannings pour un responsable, faire avancer le workflow (soumission → consolidation →
                coordinateur projet → accord SG ou direction → validation finale SG ou DG) ou retourner pour correction. L&apos;administration peut court-circuiter la validation finale.
            </Text>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                    <Select
                        allowClear
                        placeholder="Statut"
                        style={{ width: '100%' }}
                        value={statusFilter}
                        onChange={(v) => {
                            setStatusFilter(v);
                            setPage(1);
                        }}
                        options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                    />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Responsable"
                        style={{ width: '100%' }}
                        value={userIdFilter}
                        onChange={(v) => {
                            setUserIdFilter(v);
                            setPage(1);
                        }}
                        options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
                    />
                </Col>
                <Col xs={12} sm={12} md={5}>
                    <DatePicker
                        placeholder="Semaine à partir de"
                        style={{ width: '100%' }}
                        value={weekFrom ? dayjs(weekFrom) : null}
                        onChange={(d) => {
                            setWeekFrom(d ? d.startOf('day').toDate() : undefined);
                            setPage(1);
                        }}
                    />
                </Col>
                <Col xs={12} sm={12} md={5}>
                    <DatePicker
                        placeholder="Semaine jusqu'à"
                        style={{ width: '100%' }}
                        value={weekTo ? dayjs(weekTo) : null}
                        onChange={(d) => {
                            setWeekTo(d ? d.endOf('day').toDate() : undefined);
                            setPage(1);
                        }}
                    />
                </Col>
            </Row>
            <Space style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                    Créer un planning (utilisateur + semaine)
                </Button>
                <Button onClick={load}>Actualiser</Button>
            </Space>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={items}
                loading={loading}
                pagination={{
                    current: page,
                    pageSize: limit,
                    total,
                    onChange: setPage,
                    showSizeChanger: false,
                    showTotal: (t) => `${t} plannings`,
                }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title="Créer un planning"
                open={createOpen}
                onCancel={() => {
                    setCreateOpen(false);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
                confirmLoading={createLoading}
                destroyOnClose
                width={480}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
                    <Form.Item name="userId" label="Responsable" rules={[{ required: true, message: 'Choisir un utilisateur' }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Utilisateur"
                            options={users.map((u) => ({ value: u.id, label: `${u.name} — ${u.email}` }))}
                        />
                    </Form.Item>
                    <Form.Item name="weekStart" label="Semaine (lundi calculé automatiquement)" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Le planning est créé en brouillon pour le lundi de la semaine contenant la date choisie.
                    </Text>
                </Form>
            </Modal>

            <Modal
                title="Retourner le planning pour correction"
                open={returnModal.open}
                onOk={handleReturn}
                onCancel={() => {
                    setReturnModal({ open: false, id: null });
                    setReturnComment('');
                }}
                okText="Retourner"
                okButtonProps={{ danger: true }}
                confirmLoading={actionId === returnModal.id}
            >
                <Input.TextArea
                    rows={4}
                    value={returnComment}
                    onChange={(e) => setReturnComment(e.target.value)}
                    placeholder="Commentaire pour le responsable..."
                />
            </Modal>
        </div>
    );
}
