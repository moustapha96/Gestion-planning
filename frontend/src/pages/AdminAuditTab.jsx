import { useEffect, useState } from 'react';
import {
    Table, Tag, Typography, Spin, Space, App, Select, DatePicker, Button, Row, Col, Alert, Input,
} from 'antd';
import { FilterOutlined, ReloadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import api, { API_BASE } from '../api/client';
import {
    AUDIT_ACTIONS,
    AUDIT_ENTITIES,
    getAuditActionColor,
    getAuditActionLabel,
} from '../constants/auditLogFilters';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const LOG_TYPE_OPTIONS = [
    { value: 'all', label: 'Tous les journaux' },
    { value: 'http', label: 'Requêtes HTTP' },
    { value: 'business', label: 'Actions métier' },
];

export default function AdminAuditTab() {
    const { message } = App.useApp();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState(undefined);
    const [entityFilter, setEntityFilter] = useState(undefined);
    const [logTypeFilter, setLogTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const limit = 15;

    const buildParams = (p = page) => {
        const params = { page: p, limit };
        if (actionFilter) params.action = actionFilter;
        if (entityFilter) params.entity = entityFilter;
        if (logTypeFilter === 'http') params.httpOnly = '1';
        if (logTypeFilter === 'business') params.businessOnly = '1';
        if (search.trim()) params.search = search.trim();
        if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString();
        if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString();
        return params;
    };

    const fetchLogs = async (p = page) => {
        setLoading(true);
        try {
            const res = await api.get('/audit-logs', { params: buildParams(p) });
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch {
            message.error('Impossible de charger les journaux');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(page); }, [page, actionFilter, entityFilter, logTypeFilter, search, dateRange]);

    const handleExportCSV = () => {
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

    const columns = [
        {
            title: 'Date / Heure',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 155,
            render: (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            width: 220,
            render: (a) => (
                <Tag color={getAuditActionColor(a)}>{getAuditActionLabel(a)}</Tag>
            ),
        },
        {
            title: 'Entité',
            dataIndex: 'entity',
            key: 'entity',
            width: 110,
            render: (e) => <Text type="secondary">{e}</Text>,
        },
        {
            title: 'Détails',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
            render: (d) => (d ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> : '—'),
        },
        {
            title: 'Utilisateur',
            key: 'user',
            width: 190,
            render: (_, r) =>
                r.user ? (
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{r.user.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.user.email}</Text>
                    </div>
                ) : <Text type="secondary">Anonyme</Text>,
        },
        {
            title: 'IP',
            dataIndex: 'ipAddress',
            key: 'ip',
            width: 130,
            render: (ip) => (ip ? <Text code style={{ fontSize: 11 }}>{ip}</Text> : '—'),
        },
    ];

    return (
        <div>
            <Alert
                type="info"
                showIcon
                message="Toutes les requêtes API sont journalisées (méthode, chemin, statut, durée). Les actions métier conservent un libellé dédié. Rétention 12 mois min. (CDC §3.9.2)."
                style={{ marginBottom: 16 }}
            />

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
                <Col xs={24} sm={12} md={8}>
                    <Input.Search
                        placeholder="Rechercher…"
                        allowClear
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </Col>
                <Col>
                    <Select
                        style={{ width: 200 }}
                        options={LOG_TYPE_OPTIONS}
                        value={logTypeFilter}
                        onChange={(v) => { setLogTypeFilter(v); setPage(1); }}
                    />
                </Col>
                <Col>
                    <Select
                        placeholder={<><FilterOutlined /> Action</>}
                        allowClear
                        style={{ width: 220 }}
                        options={AUDIT_ACTIONS}
                        value={actionFilter}
                        onChange={(v) => { setActionFilter(v); setPage(1); }}
                    />
                </Col>
                <Col>
                    <Select
                        placeholder="Entité"
                        allowClear
                        style={{ width: 140 }}
                        options={AUDIT_ENTITIES}
                        value={entityFilter}
                        onChange={(v) => { setEntityFilter(v); setPage(1); }}
                    />
                </Col>
                <Col>
                    <RangePicker
                        value={dateRange}
                        onChange={(v) => { setDateRange(v); setPage(1); }}
                        placeholder={['Du', 'Au']}
                        style={{ width: 240 }}
                    />
                </Col>
                <Col>
                    <Button icon={<ReloadOutlined />} onClick={() => { setPage(1); fetchLogs(1); }}>
                        Actualiser
                    </Button>
                </Col>
                <Col>
                    <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                        Export CSV
                    </Button>
                </Col>
                <Col>
                    <Text type="secondary">
                        <FileTextOutlined /> {total} entrée(s)
                    </Text>
                </Col>
            </Row>

            <Spin spinning={loading}>
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    pagination={{
                        current: page,
                        total,
                        pageSize: limit,
                        onChange: setPage,
                        showSizeChanger: false,
                        showTotal: (t) => `${t} entrée(s)`,
                    }}
                    size="small"
                    scroll={{ x: 900 }}
                    locale={{ emptyText: 'Aucun log' }}
                />
            </Spin>
        </div>
    );
}
