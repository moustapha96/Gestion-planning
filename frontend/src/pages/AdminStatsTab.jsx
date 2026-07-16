import { useEffect, useState } from 'react';
import {
    Row, Col, Card, Statistic, Tag, Progress, Spin, Button,
    Typography, Divider, Table, Space, Alert,
} from 'antd';
import {
    UserOutlined, FileTextOutlined, FlagOutlined, TeamOutlined,
    BankOutlined, ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined,
    RiseOutlined, BarChartOutlined,
} from '@ant-design/icons';
import api from '../api/client';

const { Title, Text } = Typography;

const ROLE_LABELS = {
    RESPONSABLE: 'Responsable', COORDINATEUR: 'Coordinateur', CONSOLIDATEUR: 'Consolidateur', COORDINATEUR_PROJET: 'Coord. projet',
    SECRETAIRE_GENERAL: 'Secr. général', DG: 'Dir. Général', ADMIN: 'Administrateur', SUPER_ADMIN: 'Super admin',
};
const ROLE_COLORS = {
    RESPONSABLE: 'blue', COORDINATEUR: 'geekblue', CONSOLIDATEUR: 'purple', COORDINATEUR_PROJET: 'geekblue', SECRETAIRE_GENERAL: 'cyan',
    DG: 'gold', ADMIN: 'red', SUPER_ADMIN: 'magenta',
};
const STATUS_LABELS = {
    DRAFT: 'Brouillon', SUBMITTED: 'Soumis', IN_CONSOLIDATION: 'En consolidation',
    CP_PENDING: 'Att. coord.', SG_PENDING: 'Att. SG/dir.', DG_PENDING: 'Att. fin. SG/DG',
    VALIDATED: 'Validé', RETURNED: 'Retourné', CANCELLED: 'Annulé',
};
const STATUS_COLORS = {
    DRAFT: 'default', SUBMITTED: 'blue', IN_CONSOLIDATION: 'purple',
    CP_PENDING: 'geekblue', SG_PENDING: 'cyan', DG_PENDING: 'gold',
    VALIDATED: 'green', RETURNED: 'orange', CANCELLED: 'red',
};

export default function AdminStatsTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        api.get('/dashboard/admin-stats')
            .then((r) => setStats(r.data))
            .catch(() => setStats(null))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" tip="Chargement des statistiques…" /></div>;
    if (!stats) return <Alert type="error" message="Impossible de charger les statistiques" showIcon />;

    const planningRows = Object.entries(stats.planningsByStatus || {}).map(([status, count]) => ({
        key: status,
        status,
        count,
        pct: stats.plannings > 0 ? Math.round((count / stats.plannings) * 100) : 0,
    }));

    const roleRows = Object.entries(stats.usersByRole || {}).map(([role, count]) => ({
        key: role,
        role,
        count,
        pct: stats.users > 0 ? Math.round((count / stats.users) * 100) : 0,
    }));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={5} style={{ margin: 0 }}><BarChartOutlined /> Tableau de bord — Statistiques</Title>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Actualiser</Button>
            </div>

            {/* ── KPIs principaux ── */}
            <Row gutter={[16, 16]}>
                {/* Utilisateurs */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                        <Statistic
                            title={<><UserOutlined /> Utilisateurs actifs</>}
                            value={stats.activeUsers}
                            suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {stats.users}</Text>}
                            valueStyle={{ color: '#1565C0' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Progress
                                percent={stats.users > 0 ? Math.round((stats.activeUsers / stats.users) * 100) : 0}
                                size="small"
                                strokeColor="#1565C0"
                                showInfo={false}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {stats.inactiveUsers} inactif(s)
                            </Text>
                        </div>
                    </Card>
                </Col>

                {/* Taux de validation */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                        <Statistic
                            title={<><CheckCircleOutlined /> Taux de validation</>}
                            value={stats.validationRate}
                            suffix="%"
                            valueStyle={{ color: stats.validationRate >= 70 ? '#52c41a' : stats.validationRate >= 40 ? '#faad14' : '#ff4d4f' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Progress
                                percent={stats.validationRate}
                                size="small"
                                strokeColor={stats.validationRate >= 70 ? '#52c41a' : stats.validationRate >= 40 ? '#faad14' : '#ff4d4f'}
                                showInfo={false}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {stats.planningsByStatus?.VALIDATED || 0} validé(s) / {stats.plannings - (stats.planningsByStatus?.DRAFT || 0)} soumis
                            </Text>
                        </div>
                    </Card>
                </Col>

                {/* En attente */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
                        <Statistic
                            title={<><ClockCircleOutlined /> Plannings en attente</>}
                            value={stats.pendingPlannings}
                            valueStyle={{ color: stats.pendingPlannings > 0 ? '#faad14' : '#52c41a' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {stats.planningsByStatus?.SUBMITTED || 0} soumis ·{' '}
                                {(stats.planningsByStatus?.CP_PENDING || 0)
                                    + (stats.planningsByStatus?.SG_PENDING || 0)
                                    + (stats.planningsByStatus?.DG_PENDING || 0)
                                    + (stats.planningsByStatus?.IN_CONSOLIDATION || 0)} en validation
                            </Text>
                        </div>
                    </Card>
                </Col>

                {/* Occupation salles 7j */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#fff0f6', border: '1px solid #ffadd2' }}>
                        <Statistic
                            title={<><BankOutlined /> Occupation salles (7j)</>}
                            value={stats.roomOccupancy7d}
                            suffix="%"
                            valueStyle={{ color: '#eb2f96' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Progress
                                percent={stats.roomOccupancy7d}
                                size="small"
                                strokeColor="#eb2f96"
                                showInfo={false}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {stats.rooms} salle(s) active(s)
                            </Text>
                        </div>
                    </Card>
                </Col>

                {/* Missions actives */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#fff7e6', border: '1px solid #ffd591' }}>
                        <Statistic
                            title={<><FlagOutlined /> Missions actives</>}
                            value={stats.activeMissions}
                            suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {stats.missions}</Text>}
                            valueStyle={{ color: '#fa8c16' }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>en cours aujourd\'hui.</Text>
                    </Card>
                </Col>

                {/* Réunions du mois */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                        <Statistic
                            title={<><TeamOutlined /> Réunions ce mois</>}
                            value={stats.meetingsThisMonth}
                            suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {stats.meetings} total</Text>}
                            valueStyle={{ color: '#1565C0' }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>non annulées</Text>
                    </Card>
                </Col>

                {/* Total plannings */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                        <Statistic
                            title={<><FileTextOutlined /> Total plannings</>}
                            value={stats.plannings}
                            valueStyle={{ color: '#52c41a' }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {stats.planningsByStatus?.DRAFT || 0} brouillon(s)
                        </Text>
                    </Card>
                </Col>

                {/* Missions total */}
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card variant="borderless" style={{ background: '#feffe6', border: '1px solid #eaff8f' }}>
                        <Statistic
                            title={<><RiseOutlined /> Total missions</>}
                            value={stats.missions}
                            valueStyle={{ color: '#7cb305' }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {stats.activeMissions} active(s) maintenant
                        </Text>
                    </Card>
                </Col>
            </Row>

            <Divider />

            {/* ── Répartition plannings par statut ── */}
            <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                    <Card size="small" title={<><FileTextOutlined /> Plannings par statut</>}>
                        <Table
                            size="small"
                            dataSource={planningRows}
                            pagination={false}
                            columns={[
                                {
                                    title: 'Statut',
                                    dataIndex: 'status',
                                    render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>,
                                },
                                {
                                    title: 'Nombre',
                                    dataIndex: 'count',
                                    align: 'right',
                                    render: (v) => <Text strong>{v}</Text>,
                                },
                                {
                                    title: 'Part',
                                    dataIndex: 'pct',
                                    render: (v) => (
                                        <Space>
                                            <Progress percent={v} size="small" style={{ width: 80 }} showInfo={false} />
                                            <Text type="secondary">{v}%</Text>
                                        </Space>
                                    ),
                                },
                            ]}
                            locale={{ emptyText: 'Aucun planning' }}
                        />
                    </Card>
                </Col>

                {/* ── Répartition utilisateurs par rôle ── */}
                <Col xs={24} md={12}>
                    <Card size="small" title={<><UserOutlined /> Utilisateurs par rôle</>}>
                        <Table
                            size="small"
                            dataSource={roleRows}
                            pagination={false}
                            columns={[
                                {
                                    title: 'Rôle',
                                    dataIndex: 'role',
                                    render: (r) => <Tag color={ROLE_COLORS[r] || 'default'}>{ROLE_LABELS[r] || r}</Tag>,
                                },
                                {
                                    title: 'Nombre',
                                    dataIndex: 'count',
                                    align: 'right',
                                    render: (v) => <Text strong>{v}</Text>,
                                },
                                {
                                    title: 'Part',
                                    dataIndex: 'pct',
                                    render: (v) => (
                                        <Space>
                                            <Progress percent={v} size="small" style={{ width: 80 }} showInfo={false} />
                                            <Text type="secondary">{v}%</Text>
                                        </Space>
                                    ),
                                },
                            ]}
                            locale={{ emptyText: 'Aucun utilisateur' }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
