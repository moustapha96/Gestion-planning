import { useEffect, useState, useMemo } from 'react';
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
    Segmented,
} from 'antd';
import {
    HomeOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    PlusOutlined,
    FlagOutlined,
    CheckCircleOutlined,
    BellOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin } from '../utils/roles';

const { Title, Text } = Typography;

function localYmd(d) {
    const x = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function eventDayKey(ev) {
    if (ev?.date && /^\d{4}-\d{2}-\d{2}$/.test(ev.date)) return ev.date;
    const raw = ev?.startTime;
    if (raw) return localYmd(raw);
    return '';
}

function mondayFirstWeekdayIndex(jsDay) {
    return jsDay === 0 ? 6 : jsDay - 1;
}

function weekDaysFromDate(anchor) {
    const d = new Date(anchor);
    const diff = d.getDate() - mondayFirstWeekdayIndex(d.getDay());
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
        const x = new Date(monday);
        x.setDate(monday.getDate() + i);
        return x;
    });
}

function formatAgendaTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function agendaEventColor(ev) {
    if (ev.type === 'meeting') return 'blue';
    if (ev.type === 'mission') return 'purple';
    if (ev.type === 'planning-event') return 'green';
    return 'default';
}

function agendaEventLink(ev) {
    if (ev.planningId) return `/planning/${ev.planningId}`;
    if (ev.meetingId) return `/meetings/${ev.meetingId}`;
    if (ev.type === 'meeting' && ev.id) return `/meetings/${ev.id}`;
    if (ev.missionId) return `/missions/${ev.missionId}`;
    if (ev.type === 'mission' && ev.id) return `/missions/${ev.id}`;
    return '/calendar';
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
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
    const [agendaView, setAgendaView] = useState('week');
    const [agendaEvents, setAgendaEvents] = useState([]);
    const [agendaLoading, setAgendaLoading] = useState(false);

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
                    scope: 'user',
                    meetingsToday: 0,
                    missionsToday: 0,
                    activitiesToday: 0,
                    pendingInvitations: 0,
                    pendingValidations: 0,
                    myMeetingsToday: [],
                });
            }
            if (weekRes.status === 'fulfilled' && weekRes.value?.data) {
                setWeekData(weekRes.value.data);
            } else {
                setWeekData({
                    scope: 'user',
                    meetingsThisWeek: 0,
                    missionsThisWeek: 0,
                    activitiesThisWeek: 0,
                    planningsThisWeek: 0,
                    pendingValidations: 0,
                });
            }
        } catch (e) {
            console.error(e);
            setData((prev) => prev || {
                meetingsToday: 0, missionsToday: 0, activitiesToday: 0, pendingInvitations: 0, myMeetingsToday: [],
            });
            setWeekData((prev) => prev || {
                meetingsThisWeek: 0, missionsThisWeek: 0, activitiesThisWeek: 0, planningsThisWeek: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadAgenda = async () => {
            setAgendaLoading(true);
            try {
                const d = new Date().toISOString().split('T')[0];
                const { data } = agendaView === 'week'
                    ? await api.get('/calendar/week', { params: { date: d } })
                    : await api.get('/calendar/day', { params: { date: d } });
                if (!cancelled) setAgendaEvents(data?.events || []);
            } catch {
                if (!cancelled) setAgendaEvents([]);
            } finally {
                if (!cancelled) setAgendaLoading(false);
            }
        };
        loadAgenda();
        return () => { cancelled = true; };
    }, [agendaView]);

    const agendaWeekDays = useMemo(() => weekDaysFromDate(new Date()), []);
    const todayStr = useMemo(() => localYmd(new Date()), []);

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

    const showValidationCard = Boolean(data?.canValidate ?? weekData?.canValidate);
    const fourthCardValue = showValidationCard
        ? (data?.pendingValidations ?? 0)
        : (data?.pendingInvitations ?? 0);
    const fourthCardTitle = showValidationCard ? 'À valider' : 'Invitations en attente';
    const fourthCardColor = fourthCardValue > 0 ? '#fa8c16' : '#8c8c8c';
    const fourthCardIcon = showValidationCard ? <CheckCircleOutlined /> : <BellOutlined />;

    const myMeetingsColumns = [
        {
            title: 'Réunion',
            dataIndex: 'title',
            key: 'title',
            render: (title, row) => <Link to={row.link || `/meetings/${row.id}`}>{title}</Link>,
        },
        {
            title: 'Horaire',
            key: 'time',
            render: (_, row) => {
                if (!row.startTime) return '—';
                const start = new Date(row.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const end = row.endTime
                    ? new Date(row.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : '';
                return end ? `${start} – ${end}` : start;
            },
        },
        {
            title: 'Salle',
            key: 'room',
            render: (_, row) => row.room?.name || <Text type="secondary">—</Text>,
        },
        {
            title: 'Projet',
            key: 'project',
            render: (_, row) => row.project?.name || <Text type="secondary">—</Text>,
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <Tag>{s}</Tag>,
        },
    ];

    const activitiesToday = data?.activitiesToday ?? ((data?.meetingsToday ?? 0) + (data?.missionsToday ?? 0));
    const activitiesWeek = weekData?.activitiesThisWeek
        ?? ((weekData?.meetingsThisWeek ?? 0) + (weekData?.missionsThisWeek ?? 0));

    return (
        <Spin spinning={loading}>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            Tableau de bord
                        </Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Vos indicateurs personnels — {user?.name || 'utilisateur connecté'}
                        </Text>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={load}>
                        Actualiser
                    </Button>
                </div>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Mes réunions aujourd'hui"
                                value={data?.meetingsToday ?? 0}
                                valueStyle={{ color: '#1F5C8B' }}
                                prefix={<CalendarOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Mes missions actives"
                                value={data?.missionsToday ?? 0}
                                valueStyle={{ color: '#722ed1' }}
                                prefix={<FlagOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic
                                title="Activités aujourd'hui"
                                value={activitiesToday}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card
                            hoverable={fourthCardValue > 0}
                            onClick={() => {
                                if (showValidationCard && fourthCardValue > 0) navigate('/a-valider');
                            }}
                            style={{ cursor: showValidationCard && fourthCardValue > 0 ? 'pointer' : 'default' }}
                        >
                            <Statistic
                                title={fourthCardTitle}
                                value={fourthCardValue}
                                valueStyle={{ color: fourthCardColor }}
                                prefix={fourthCardIcon}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                        <Card title="Ma journée">
                            <Progress
                                percent={activitiesToday > 0 ? 100 : 0}
                                status={activitiesToday > 0 ? 'active' : 'normal'}
                                format={() => `${activitiesToday} activité${activitiesToday > 1 ? 's' : ''}`}
                            />
                            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                                {data?.meetingsToday ?? 0} réunion(s) et {data?.missionsToday ?? 0} mission(s) vous concernent aujourd&apos;hui.
                            </Text>
                            <Space style={{ marginTop: 12 }} wrap>
                                <Link to="/meetings">Mes réunions</Link>
                                <Link to="/missions">Mes missions</Link>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="Ma semaine en cours">
                            <Space orientation="vertical" style={{ width: '100%' }}>
                                <Text>
                                    Activités cette semaine :{' '}
                                    <strong>{activitiesWeek}</strong>
                                </Text>
                                <Text type="secondary">
                                    {weekData?.meetingsThisWeek ?? 0} réunion(s) · {weekData?.missionsThisWeek ?? 0} mission(s)
                                    {(weekData?.planningsThisWeek ?? 0) > 0 && ` · ${weekData.planningsThisWeek} planning(s)`}
                                </Text>
                                {showValidationCard && (weekData?.pendingValidations ?? 0) > 0 && (
                                    <Text type="warning">
                                        {weekData.pendingValidations} élément(s) en attente de votre validation
                                    </Text>
                                )}
                                <Link to="/planning">Mon planning</Link>
                                <Link to="/calendar">Mon calendrier</Link>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                <Card
                    title={(
                        <Space wrap>
                            <CalendarOutlined />
                            <span>Mon agenda</span>
                            <Segmented
                                size="small"
                                value={agendaView}
                                onChange={setAgendaView}
                                options={[
                                    { label: 'Semaine', value: 'week' },
                                    { label: "aujourd\'hui.", value: 'day' },
                                ]}
                            />
                        </Space>
                    )}
                    extra={(
                        <Space wrap>
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    const p = new Date().toISOString().split('T')[0];
                                    navigate(`/meetings/new?date=${p}`);
                                }}
                            >
                                Réunion
                            </Button>
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    const p = new Date().toISOString().split('T')[0];
                                    navigate(`/missions/new?date=${p}`);
                                }}
                            >
                                Mission
                            </Button>
                            <Link to="/events">Événements</Link>
                            <Link to="/calendar">Calendrier complet</Link>
                        </Space>
                    )}
                    style={{ marginBottom: 24 }}
                >
                    <Spin spinning={agendaLoading}>
                        {agendaView === 'week' ? (
                            <Row gutter={[12, 12]}>
                                {agendaWeekDays.map((day) => {
                                    const k = localYmd(day);
                                    const dayEvs = agendaEvents
                                        .filter((e) => eventDayKey(e) === k)
                                        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
                                    const isToday = k === todayStr;
                                    return (
                                        <Col xs={24} sm={12} md={8} lg={3} key={k}>
                                            <div style={{
                                                border: `1px solid ${isToday ? '#1565C0' : '#f0f0f0'}`,
                                                borderRadius: 10,
                                                padding: 10,
                                                minHeight: 120,
                                                background: isToday ? '#f0f7ff' : '#fff',
                                            }}>
                                                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                                                    {day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </Text>
                                                {dayEvs.length === 0 ? (
                                                    <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                                                ) : (
                                                    <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                                        {dayEvs.slice(0, 5).map((ev) => (
                                                            <div key={`${ev.type}-${ev.id}`}>
                                                                <Tag color={agendaEventColor(ev)} style={{ marginRight: 4, fontSize: 10 }}>
                                                                    {formatAgendaTime(ev.startTime)}
                                                                </Tag>
                                                                <Link to={agendaEventLink(ev)} style={{ fontSize: 12 }}>
                                                                    {ev.title}
                                                                </Link>
                                                            </div>
                                                        ))}
                                                        {dayEvs.length > 5 && (
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                +{dayEvs.length - 5}…
                                                            </Text>
                                                        )}
                                                    </Space>
                                                )}
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        ) : (
                            <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                                {agendaEvents.length === 0 ? (
                                    <Text type="secondary">Aucun événement aujourd\'hui..</Text>
                                ) : (
                                    agendaEvents.map((ev) => (
                                        <div
                                            key={`${ev.type}-${ev.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                border: '1px solid #f0f0f0',
                                            }}
                                        >
                                            <Tag color={agendaEventColor(ev)}>{formatAgendaTime(ev.startTime)}</Tag>
                                            <Link to={agendaEventLink(ev)}><Text strong>{ev.title}</Text></Link>
                                        </div>
                                    ))
                                )}
                            </Space>
                        )}
                    </Spin>
                </Card>

                <Card title="Mes réunions aujourd'hui">
                    <Table
                        columns={myMeetingsColumns}
                        dataSource={data?.myMeetingsToday || []}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: 'Aucune réunion prévue aujourd\'hui' }}
                    />
                </Card>

                {isPrivilegedAdmin(user?.role) && (
                    <>
                        <Divider />
                        <Card
                            title="Statistiques globales (administration)"
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
