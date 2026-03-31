import { useEffect, useState } from 'react';
import {
    Table, Tag, Typography, Spin, Space, App, Select, DatePicker, Button, Row, Col, Alert,
} from 'antd';
import { FilterOutlined, ReloadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import api, { API_BASE } from '../api/client';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ACTIONS = [
    { value: 'LOGIN', label: 'Connexion' },
    { value: 'CREATE_USER', label: 'Création utilisateur' },
    { value: 'DELETE_USER', label: 'Suppression utilisateur' },
    { value: 'DEACTIVATE_USER', label: 'Désactivation utilisateur' },
    { value: 'ACTIVATE_USER', label: 'Réactivation utilisateur' },
    { value: 'ADMIN_RESET_PASSWORD', label: 'Réinit. mot de passe' },
    { value: 'SEND_RESET_LINK', label: 'Lien réinitialisation envoyé' },
    { value: 'MEETING_CREATED', label: 'Réunion créée' },
    { value: 'MEETING_SENT', label: 'Convocations envoyées' },
    { value: 'MEETING_UPDATED', label: 'Réunion modifiée' },
    { value: 'MEETING_CANCELLED', label: 'Réunion annulée' },
    { value: 'PLANNING_SUBMITTED', label: 'Planning soumis' },
    { value: 'PLANNING_CONSOLIDATED', label: 'Planning consolidé' },
    { value: 'PLANNING_VALIDATED', label: 'Planning validé' },
    { value: 'PLANNING_RETURNED', label: 'Planning retourné' },
    { value: 'PLANNING_DELETED', label: 'Planning supprimé' },
    { value: 'MISSION_CREATED', label: 'Mission créée' },
    { value: 'MISSION_CANCELLED', label: 'Mission annulée' },
    { value: 'ADMIN_NOTIFICATIONS_SENT', label: 'Notifications broadcast' },
];

const ENTITIES = [
    { value: 'User', label: 'Utilisateur' },
    { value: 'Meeting', label: 'Réunion' },
    { value: 'Planning', label: 'Planning' },
    { value: 'Mission', label: 'Mission' },
    { value: 'Room', label: 'Salle' },
];

const ACTION_COLORS = {
    LOGIN: 'cyan',
    CREATE_USER: 'green',
    DELETE_USER: 'red',
    DEACTIVATE_USER: 'volcano',
    ACTIVATE_USER: 'green',
    ADMIN_RESET_PASSWORD: 'orange',
    MEETING_CANCELLED: 'volcano',
    PLANNING_RETURNED: 'orange',
    PLANNING_VALIDATED: 'green',
    PLANNING_CONSOLIDATED: 'purple',
};

export default function AdminAuditTab() {
    const { message } = App.useApp();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState(undefined);
    const [entityFilter, setEntityFilter] = useState(undefined);
    const [dateRange, setDateRange] = useState(null);
    const limit = 15;

    const fetchLogs = async (p = page) => {
        setLoading(true);
        try {
            const params = { page: p, limit };
            if (actionFilter) params.action = actionFilter;
            if (entityFilter) params.entity = entityFilter;
            if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString();
            if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString();
            const res = await api.get('/audit-logs', { params });
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch {
            message.error('Impossible de charger les journaux');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(page); }, [page, actionFilter, entityFilter, dateRange]);

    const handleExportCSV = () => {
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
            render: (a) => {
                const found = ACTIONS.find((x) => x.value === a);
                return <Tag color={ACTION_COLORS[a] || 'blue'}>{found?.label || a}</Tag>;
            },
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
            render: (d) => d ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> : '—',
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
                ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'IP',
            dataIndex: 'ipAddress',
            key: 'ip',
            width: 130,
            render: (ip) => ip ? <Text code style={{ fontSize: 11 }}>{ip}</Text> : '—',
        },
    ];

    return (
        <div>
            <Alert
                type="info"
                showIcon
                message="Journaux immuables — rétention 12 mois min. (CDC §3.9.2). Aucune suppression manuelle autorisée."
                style={{ marginBottom: 16 }}
            />

            {/* Filtres */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
                <Col>
                    <Select
                        placeholder={<><FilterOutlined /> Action</>}
                        allowClear
                        style={{ width: 220 }}
                        options={ACTIONS}
                        value={actionFilter}
                        onChange={(v) => { setActionFilter(v); setPage(1); }}
                    />
                </Col>
                <Col>
                    <Select
                        placeholder="Entité"
                        allowClear
                        style={{ width: 140 }}
                        options={ENTITIES}
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
