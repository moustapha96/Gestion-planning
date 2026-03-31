import { useEffect, useState } from 'react';
import {
    Row,
    Col,
    Card,
    Statistic,
    Table,
    Tag,
    Typography,
    Spin,
    Progress,
    Space,
    Button,
    Divider,
    Alert,
} from 'antd';
import {
    HomeOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin } from '../utils/roles';

const { Title, Text } = Typography;

const STATUS_COLORS = { FREE: 'success', OCCUPIED: 'error', BUSY: 'error' };
const STATUS_LABELS = { FREE: 'Libre', OCCUPIED: 'Occupée', BUSY: 'Occupée' };

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [weekData, setWeekData] = useState(null);
    const [advancedData, setAdvancedData] = useState(null);
    const [advancedLoading, setAdvancedLoading] = useState(false);
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [todayRes, weekRes] = await Promise.allSettled([
                api.get('/dashboard/today'),
                api.get('/dashboard/week'),
            ]);
            if (todayRes.status === 'fulfilled' && todayRes.value?.data) {
                setData(todayRes.value.data);
            } else {
                setData({
                    freeRooms: 0,
                    occupiedRooms: 0,
                    meetingsToday: 0,
                    pendingPlannings: 0,
                    rooms: [],
                });
            }
            if (weekRes.status === 'fulfilled' && weekRes.value?.data) {
                setWeekData(weekRes.value.data);
            } else {
                setWeekData({
                    occupancyRate: '0',
                    bookedSlots: 0,
                    submittedPlannings: 0,
                    rooms: [],
                });
            }
        } catch (e) {
            console.error(e);
            setData((prev) => prev || { freeRooms: 0, occupiedRooms: 0, meetingsToday: 0, pendingPlannings: 0, rooms: [] });
            setWeekData((prev) => prev || { occupancyRate: '0', bookedSlots: 0, submittedPlannings: 0, rooms: [] });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!isPrivilegedAdmin(user?.role)) return;
        const loadAdvanced = async () => {
            setAdvancedLoading(true);
            try {
                const { data: adv } = await api.get('/dashboard/advanced', { params: { from: fromDate, to: toDate } });
                setAdvancedData(adv);
            } catch {
                setAdvancedData(null);
            } finally {
                setAdvancedLoading(false);
            }
        };
        loadAdvanced();
    }, [user?.role, fromDate, toDate]);

    const exportAdvanced = async () => {
        try {
            const res = await api.get('/dashboard/advanced/export', {
                params: { from: fromDate, to: toDate },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-avance-${fromDate}-${toDate}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export dashboard advanced failed', e);
        }
    };

    const roomColumns = [
        { title: 'Salle', dataIndex: 'name', key: 'name' },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>
            ),
        },
        {
            title: 'Créneaux réservés (aujourd\'hui)',
            key: 'details',
            render: (_, room) => {
                const list = room.bookings || [];
                if (list.length === 0) {
                    return <Text type="success">Disponible toute la journée</Text>;
                }
                return (
                    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                        {list.map((b) => (
                            <div key={b.id}>
                                <Text strong>{b.startTime} – {b.endTime}</Text>
                                {b.meetingTitle && (
                                    <Text type="secondary" style={{ display: 'block', marginLeft: 8 }}>
                                        {b.meetingTitle}
                                    </Text>
                                )}
                                {b.meetingId && (
                                    <Link to={`/meetings/${b.meetingId}`} style={{ marginLeft: 8, fontSize: 12 }}>
                                        Voir réunion
                                    </Link>
                                )}
                            </div>
                        ))}
                    </Space>
                );
            },
        },
    ];

    const totalRooms = data?.rooms?.length ?? 0;
    const occupied = data?.occupiedRooms ?? 0;
    const occupancyPct =
        totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

    return (
        <Spin spinning={loading}>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <Title level={3} style={{ margin: 0 }}>
                        Tableau de bord
                    </Title>
                    <Button icon={<ReloadOutlined />} onClick={load}>
                        Actualiser
                    </Button>
                </div>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Salles libres"
                                value={data?.freeRooms ?? 0}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<HomeOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Salles occupées"
                                value={data?.occupiedRooms ?? 0}
                                valueStyle={{ color: '#ff4d4f' }}
                                prefix={<HomeOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Réunions aujourd'hui"
                                value={data?.meetingsToday ?? 0}
                                valueStyle={{ color: '#1F5C8B' }}
                                prefix={<CalendarOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Plannings en attente"
                                value={data?.pendingPlannings ?? 0}
                                valueStyle={{ color: '#fa8c16' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                        <Card title="Taux d'occupation des salles (aujourd'hui)">
                            <Progress
                                percent={occupancyPct}
                                status={occupancyPct >= 80 ? 'exception' : 'active'}
                                format={(p) => `${p}% (${occupied}/${totalRooms} occupées)`}
                            />
                            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                                Vue en temps réel des réservations confirmées du jour.
                            </Text>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="Semaine en cours">
                            <Space orientation="vertical" style={{ width: '100%' }}>
                                <Text>
                                    Taux d&apos;occupation salles :{' '}
                                    <strong>{weekData?.occupancyRate ?? 0}%</strong>
                                </Text>
                                <Text type="secondary">
                                    Créneaux réservés : {weekData?.bookedSlots ?? 0}
                                </Text>
                                <Text>
                                    Plannings validés :{' '}
                                    <strong>{weekData?.submittedPlannings ?? 0}</strong>
                                </Text>
                                <Text>
                                    Missions actives :{' '}
                                    <strong>{weekData?.activeMissions ?? 0}</strong>
                                </Text>
                                <Link to="/calendar">Ouvrir le calendrier</Link>
                                <Link to="/rooms">Gérer les salles</Link>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                <Card title="État des salles aujourd'hui">
                    <Table
                        columns={roomColumns}
                        dataSource={data?.rooms || []}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: 'Aucune salle' }}
                    />
                </Card>

                {isPrivilegedAdmin(user?.role) && (
                    <>
                        <Divider />
                        <Card
                            title="Dashboard avancé"
                            loading={advancedLoading}
                            extra={(
                                <Space>
                                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                                    <Button onClick={exportAdvanced}>Exporter CSV</Button>
                                </Space>
                            )}
                        >
                            {!advancedData ? (
                                <Alert type="warning" title="Impossible de charger les KPI avancés." showIcon />
                            ) : (
                                <>
                                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                                        <Col xs={12} md={6}><Card size="small"><Statistic title="Réunions (période)" value={advancedData?.kpi?.meetings || 0} /></Card></Col>
                                        <Col xs={12} md={6}><Card size="small"><Statistic title="Missions (période)" value={advancedData?.kpi?.missions || 0} /></Card></Col>
                                        <Col xs={12} md={6}><Card size="small"><Statistic title="Plannings (période)" value={advancedData?.kpi?.plannings || 0} /></Card></Col>
                                        <Col xs={12} md={6}><Card size="small"><Statistic title="Taux acceptation réunions" value={advancedData?.kpi?.acceptanceRate || 0} suffix="%" /></Card></Col>
                                    </Row>
                                    <Table
                                        rowKey="userId"
                                        size="small"
                                        dataSource={advancedData?.workloadByUser || []}
                                        columns={[
                                            { title: 'Utilisateur', dataIndex: 'name', key: 'name' },
                                            { title: 'Email', dataIndex: 'email', key: 'email' },
                                            { title: 'Rôle', dataIndex: 'role', key: 'role' },
                                            { title: 'Missions', dataIndex: 'missionsAssigned', key: 'missionsAssigned' },
                                            { title: 'Réunions acceptées', dataIndex: 'meetingsAccepted', key: 'meetingsAccepted' },
                                            { title: 'Réunions en attente', dataIndex: 'meetingsPending', key: 'meetingsPending' },
                                            { title: 'Charge totale', dataIndex: 'totalLoad', key: 'totalLoad' },
                                        ]}
                                        pagination={{ pageSize: 8 }}
                                    />
                                </>
                            )}
                        </Card>
                    </>
                )}
            </div>
        </Spin>
    );
}
