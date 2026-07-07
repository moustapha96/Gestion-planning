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
    Input,
} from 'antd';
import { FileTextOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin } from '../utils/roles';
import {
    AUDIT_ACTIONS,
    AUDIT_ENTITIES,
    getAuditActionColor,
    getAuditActionLabel,
} from '../constants/auditLogFilters';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const LOG_TYPE_OPTIONS = [
    { value: 'all', label: 'Tous les journaux' },
    { value: 'http', label: 'Requêtes HTTP uniquement' },
    { value: 'business', label: 'Actions métier uniquement' },
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
    const [logTypeFilter, setLogTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const limit = 20;

    const buildParams = () => {
        const params = { page, limit };
        if (actionFilter) params.action = actionFilter;
        if (entityFilter) params.entity = entityFilter;
        if (logTypeFilter === 'http') params.httpOnly = '1';
        if (logTypeFilter === 'business') params.businessOnly = '1';
        if (search.trim()) params.search = search.trim();
        if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString();
        if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString();
        return params;
    };

    const fetchLogs = async () => {
        if (!isPrivilegedAdmin(user?.role)) return;
        setLoading(true);
        try {
            const res = await api.get('/audit-logs', { params: buildParams() });
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
    }, [user?.role, page, actionFilter, entityFilter, logTypeFilter, search, dateRange]);

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
            width: 200,
            ellipsis: true,
            render: (a) => (
                <Tag color={getAuditActionColor(a)}>{getAuditActionLabel(a)}</Tag>
            ),
        },
        {
            title: 'Entité',
            dataIndex: 'entity',
            key: 'entity',
            width: 110,
        },
        {
            title: 'Détails',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
            render: (d) => (d ? <Text type="secondary">{d}</Text> : '—'),
        },
        {
            title: 'IP',
            dataIndex: 'ipAddress',
            key: 'ipAddress',
            width: 120,
            render: (ip) => ip || '—',
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
                    <Text type="secondary">Anonyme</Text>
                ),
        },
    ];

    const exportCsv = () => {
        const params = new URLSearchParams(buildParams());
        params.delete('page');
        params.delete('limit');
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
            })
            .catch(() => message.error('Erreur lors de l\'export'));
    };

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
                title="Toutes les requêtes API sont journalisées (méthode, chemin, statut, durée, utilisateur, IP). Les actions métier importantes conservent aussi un libellé dédié (connexion, réunions, plannings, etc.)."
                style={{ marginBottom: 16 }}
            />

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Input.Search
                            placeholder="Rechercher (chemin, action, entité…)"
                            allowClear
                            value={search}
                            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Type"
                            style={{ width: 220 }}
                            options={LOG_TYPE_OPTIONS}
                            value={logTypeFilter}
                            onChange={(v) => { setPage(1); setLogTypeFilter(v); }}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Action"
                            allowClear
                            style={{ width: 200 }}
                            options={AUDIT_ACTIONS}
                            value={actionFilter}
                            onChange={(v) => { setPage(1); setActionFilter(v); }}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Entité"
                            allowClear
                            style={{ width: 160 }}
                            options={AUDIT_ENTITIES}
                            value={entityFilter}
                            onChange={(v) => { setPage(1); setEntityFilter(v); }}
                        />
                    </Col>
                    <Col>
                        <RangePicker
                            value={dateRange}
                            onChange={(v) => { setPage(1); setDateRange(v); }}
                            placeholder={['Du', 'Au']}
                        />
                    </Col>
                    <Col>
                        <Button icon={<ReloadOutlined />} onClick={() => { setPage(1); fetchLogs(); }}>
                            Actualiser
                        </Button>
                    </Col>
                    <Col>
                        <Button icon={<DownloadOutlined />} onClick={exportCsv}>
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
