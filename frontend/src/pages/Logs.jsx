import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Table,
    Tag,
    Typography,
    Spin,
    Alert,
    Pagination,
    Space,
    App,
    Select,
    DatePicker,
    Button,
    Row,
    Col,
} from 'antd';
import { FileTextOutlined, FilterOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin } from '../utils/roles';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ACTIONS = [
    { value: 'LOGIN', label: 'Connexion' },
    { value: 'CREATE_USER', label: 'Création utilisateur' },
    { value: 'DEACTIVATE_USER', label: 'Désactivation utilisateur' },
    { value: 'ACTIVATE_USER', label: 'Réactivation utilisateur' },
    { value: 'ADMIN_RESET_PASSWORD', label: 'Réinit. mot de passe' },
    { value: 'MEETING_CREATED', label: 'Réunion créée' },
    { value: 'MEETING_SENT', label: 'Convocations envoyées' },
    { value: 'MEETING_UPDATED', label: 'Réunion modifiée' },
    { value: 'MEETING_CANCELLED', label: 'Réunion annulée' },
    { value: 'PLANNING_SUBMITTED', label: 'Planning soumis' },
    { value: 'PLANNING_CONSOLIDATED', label: 'Planning consolidé' },
    { value: 'PLANNING_VALIDATED', label: 'Planning validé' },
    { value: 'PLANNING_RETURNED', label: 'Planning retourné' },
];

const ENTITIES = [
    { value: 'User', label: 'Utilisateur' },
    { value: 'Meeting', label: 'Réunion' },
    { value: 'Planning', label: 'Planning' },
];

export default function Logs() {
    const { message } = App.useApp();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState(undefined);
    const [entityFilter, setEntityFilter] = useState(undefined);
    const [dateRange, setDateRange] = useState(null);
    const limit = 20;

    const fetchLogs = async () => {
        if (!isPrivilegedAdmin(user?.role)) return;
        setLoading(true);
        try {
            const params = { page, limit };
            if (actionFilter) params.action = actionFilter;
            if (entityFilter) params.entity = entityFilter;
            if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString();
            if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString();
            const res = await api.get('/audit-logs', { params });
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch {
            message.error('Impossible de charger les logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isPrivilegedAdmin(user?.role)) {
            navigate('/dashboard');
            return;
        }
        fetchLogs();
    }, [user?.role, page, actionFilter, entityFilter, dateRange]);

    if (!isPrivilegedAdmin(user?.role)) return null;

    const columns = [
        {
            title: 'Date / Heure',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (d) => new Date(d).toLocaleString('fr-FR'),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            width: 180,
            ellipsis: true,
            render: (a) => <Tag color="blue">{a}</Tag>,
        },
        {
            title: 'Entité',
            dataIndex: 'entity',
            key: 'entity',
            width: 120,
        },
        {
            title: 'Détails',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
            render: (d) => d ? <Text type="secondary">{d}</Text> : '—',
        },
        {
            title: 'Utilisateur',
            key: 'user',
            width: 200,
            render: (_, r) =>
                r.user ? (
                    <Space orientation="vertical" size={0}>
                        <Text strong>{r.user.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {r.user.email}
                        </Text>
                    </Space>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
    ];

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                }}
            >
                <Title level={3} style={{ margin: 0 }}>
                    <FileTextOutlined /> Journaux d&apos;audit
                </Title>
                <Space>
                    <Typography.Text type="secondary">
                        {total} entrée(s)
                    </Typography.Text>
                    <Pagination
                        current={page}
                        total={total}
                        pageSize={limit}
                        onChange={setPage}
                        showSizeChanger={false}
                        size="small"
                    />
                </Space>
            </div>

            <Alert
                type="info"
                showIcon
                title="Les journaux d'audit enregistrent les actions importantes (connexions, créations d'utilisateurs, plannings, réunions). Les logs détaillés du serveur sont dans backend/logs/."
                style={{ marginBottom: 16 }}
            />

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col>
                        <Select
                            placeholder="Action"
                            allowClear
                            style={{ width: 200 }}
                            options={ACTIONS}
                            value={actionFilter}
                            onChange={setActionFilter}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Entité"
                            allowClear
                            style={{ width: 160 }}
                            options={ENTITIES}
                            value={entityFilter}
                            onChange={setEntityFilter}
                        />
                    </Col>
                    <Col>
                        <RangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder={['Du', 'Au']}
                        />
                    </Col>
                    <Col>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => { setPage(1); fetchLogs(); }}
                        >
                            Actualiser
                        </Button>
                    </Col>
                    <Col>
                        {/* Export CSV — CDC §3.9.2 */}
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={() => {
                                const params = new URLSearchParams();
                                if (actionFilter) params.set('action', actionFilter);
                                if (entityFilter) params.set('entity', entityFilter);
                                if (dateRange?.[0]) params.set('from', dateRange[0].startOf('day').toISOString());
                                if (dateRange?.[1]) params.set('to', dateRange[1].endOf('day').toISOString());
                                const token = localStorage.getItem('accessToken');
                                fetch(`${API_BASE}/api/audit-logs/export.csv?${params}`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                })
                                    .then((r) => r.blob())
                                    .then((blob) => {
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    });
                            }}
                        >
                            Exporter CSV
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card>
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={logs}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: 'Aucun log' }}
                    />
                </Spin>
                {total > limit && (
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Pagination
                            current={page}
                            total={total}
                            pageSize={limit}
                            onChange={setPage}
                            showSizeChanger={false}
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}
