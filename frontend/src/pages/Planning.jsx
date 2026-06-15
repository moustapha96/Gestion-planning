import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table, Button, Card, Typography, Space, Modal, Input, App,
    DatePicker, Row, Col, Select, Empty, Badge, Alert,
} from 'antd';
import {
    LeftOutlined, RightOutlined, CalendarOutlined,
    EyeOutlined, FilterOutlined, ScheduleOutlined, ShareAltOutlined,
    CopyOutlined, TeamOutlined, FlagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    isPrivilegedAdmin,
    userConsolidatesAnyProject,
    userCoordinatesAnyProject,
} from '../utils/roles';

const { Title, Text } = Typography;

const EVENT_TYPE_LABELS = {
    REUNION: 'Réunion',
    MISSION: 'Mission',
    DEPLACEMENT: 'Déplacement',
    FORMATION: 'Formation',
    AUTRE: 'Autre',
};

function fmtTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

function fmtDateLong(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    } catch { return iso; }
}

function buildPlanningText(plannings, weekLabel) {
    const lines = [
        `Plannings ADM GP — Semaine du ${weekLabel}`,
        `Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        '',
    ];

    for (const p of plannings) {
        const events = (p.events || []).slice().sort(
            (a, b) => new Date(a.startTime) - new Date(b.startTime),
        );
        const counts = p.counts || {};
        lines.push('─'.repeat(50));
        lines.push(`👤 ${p.user?.name || '—'} (${p.project?.name || p.user?.project?.name || '—'})`);
        lines.push(
            `   ${counts.meetings ?? 0} réunion(s) · ${counts.missions ?? 0} mission(s) · ${counts.manualEvents ?? 0} événement(s) manuel(s)`,
        );

        if (!events.length) {
            lines.push('   Aucune activité cette semaine.');
        } else {
            const byDay = {};
            events.forEach((ev) => {
                const day = new Date(ev.startTime).toISOString().split('T')[0];
                if (!byDay[day]) byDay[day] = [];
                byDay[day].push(ev);
            });
            lines.push('');
            for (const [day, dayEvs] of Object.entries(byDay)) {
                lines.push(`   📅 ${fmtDateLong(day + 'T00:00:00')}`);
                for (const ev of dayEvs) {
                    const start = fmtTime(ev.startTime);
                    const end = fmtTime(ev.endTime);
                    const time = end ? `${start} – ${end}` : start;
                    const type = ev.eventType?.name || EVENT_TYPE_LABELS[ev.type] || ev.type || '';
                    const loc = ev.room?.name || ev.destination || '';
                    lines.push(`      ${time}  [${type}]  ${ev.title || ''}${loc ? `  📍 ${loc}` : ''}`);
                }
            }
        }
        lines.push('');
    }
    return lines.join('\n');
}

function getMondayOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    date.setHours(0, 0, 0, 0);
    return date;
}

function getSundayOfWeek(d) {
    const sun = getMondayOfWeek(d);
    sun.setDate(sun.getDate() + 6);
    return sun;
}

function weekRangeLabel(d) {
    const mon = getMondayOfWeek(d);
    const sun = getSundayOfWeek(d);
    const sameMonth = mon.getMonth() === sun.getMonth();
    const monStr = mon.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: sameMonth ? undefined : 'short',
    });
    const sunStr = sun.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    return `${monStr} – ${sunStr}`;
}

export default function Planning() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { message } = App.useApp();

    const [plannings, setPlannings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [mineOnly, setMineOnly] = useState(false);
    const [shareModal, setShareModal] = useState({ open: false, text: '' });
    const [taxonomyProjects, setTaxonomyProjects] = useState([]);

    const isResponsable = user?.role === 'RESPONSABLE';
    const isAdmin = isPrivilegedAdmin(user?.role);
    const isProjectConsolidator = userConsolidatesAnyProject(taxonomyProjects, user?.id);
    const isProjectCoordinator = userCoordinatesAnyProject(taxonomyProjects, user?.id);
    const canSeeAll = isAdmin || isProjectConsolidator || isProjectCoordinator;

    useEffect(() => {
        api.get('/events/taxonomy')
            .then((res) => setTaxonomyProjects(res.data?.projects || []))
            .catch(() => setTaxonomyProjects([]));
    }, [user?.id]);

    useEffect(() => {
        if (isResponsable) setMineOnly(true);
    }, [isResponsable]);

    const fetchPlannings = async (dateObj, mine = false) => {
        setLoading(true);
        try {
            const iso = (dateObj instanceof Date ? dateObj : new Date()).toISOString().split('T')[0];
            const res = await api.get(`/plannings/week/${iso}`, { params: mine ? { mine: '1' } : {} });
            setPlannings(res.data || []);
        } catch {
            message.error('Impossible de charger les plannings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlannings(selectedDate, mineOnly); }, [selectedDate, mineOnly]); // eslint-disable-line

    const handleShare = () => {
        if (!plannings.length) {
            message.warning('Aucune activité à partager pour cette semaine.');
            return;
        }
        setShareModal({ open: true, text: buildPlanningText(plannings, weekRangeLabel(selectedDate)) });
    };

    const handleCopyShare = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            message.success('Planning copié dans le presse-papiers.');
        } catch {
            message.error('Impossible de copier — sélectionnez le texte manuellement.');
        }
    };

    const nav = (dir) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'next' ? 7 : -7));
        setSelectedDate(d);
    };

    const columns = [
        {
            title: 'Responsable',
            key: 'user',
            render: (_, r) => (
                <div>
                    <Text strong style={{ display: 'block', fontSize: 13 }}>{r.user?.name || '—'}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.user?.email}</Text>
                </div>
            ),
        },
        {
            title: 'Projet',
            key: 'project',
            render: (_, r) => (
                <Text style={{ fontSize: 12 }}>
                    {r.project?.name || r.user?.project?.name || '—'}
                </Text>
            ),
        },
        {
            title: <><TeamOutlined /> Réunions</>,
            key: 'meetings',
            align: 'center',
            width: 100,
            render: (_, r) => (
                <Badge
                    count={r.counts?.meetings ?? 0}
                    showZero
                    style={{ backgroundColor: (r.counts?.meetings ?? 0) > 0 ? '#1565C0' : '#d9d9d9' }}
                />
            ),
        },
        {
            title: <><FlagOutlined /> Missions</>,
            key: 'missions',
            align: 'center',
            width: 100,
            render: (_, r) => (
                <Badge
                    count={r.counts?.missions ?? 0}
                    showZero
                    style={{ backgroundColor: (r.counts?.missions ?? 0) > 0 ? '#722ed1' : '#d9d9d9' }}
                />
            ),
        },
        {
            title: 'Événements',
            key: 'manual',
            align: 'center',
            width: 110,
            render: (_, r) => (
                <Badge
                    count={r.counts?.manualEvents ?? 0}
                    showZero
                    style={{ backgroundColor: (r.counts?.manualEvents ?? 0) > 0 ? '#52c41a' : '#d9d9d9' }}
                />
            ),
        },
        {
            title: 'Total',
            key: 'total',
            align: 'center',
            width: 80,
            render: (_, r) => {
                const count = r.counts?.total ?? r.events?.length ?? 0;
                return <Text strong>{count}</Text>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            render: (_, record) => (
                <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<EyeOutlined />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/planning/${record.id}`); }}
                >
                    Voir le détail
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <Row gutter={[16, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={14}>
                        <Title level={3} style={{ margin: 0 }}>
                            <ScheduleOutlined style={{ marginRight: 8 }} />
                            Plannings hebdomadaires
                        </Title>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                            Semaine du <strong>{weekRangeLabel(selectedDate)}</strong>
                            {' — '}réunions publiées, missions confirmées et événements manuels
                        </Text>
                    </Col>
                    <Col xs={24} md={10}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }} size={6}>
                            <Button icon={<LeftOutlined />} size="small" onClick={() => nav('prev')} aria-label="Semaine précédente" />
                            <Button icon={<CalendarOutlined />} size="small" onClick={() => setSelectedDate(new Date())}>
                                Cette semaine
                            </Button>
                            <Button icon={<RightOutlined />} size="small" onClick={() => nav('next')} aria-label="Semaine suivante" />
                            <DatePicker
                                allowClear={false}
                                value={selectedDate ? dayjs(selectedDate) : null}
                                onChange={(d) => d && setSelectedDate(d.toDate())}
                                format="DD/MM/YYYY"
                                style={{ width: 130 }}
                                size="small"
                            />
                        </Space>
                    </Col>
                </Row>
            </div>

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16, borderRadius: 10 }}
                message="Vue consolidée automatique"
                description="Les plannings sont générés automatiquement pour chaque responsable de projet. Aucune création ni validation n'est nécessaire : les réunions publiées et missions confirmées s'affichent directement."
            />

            <Card style={{ marginBottom: 16, borderRadius: 10 }} styles={{ body: { padding: '10px 16px' } }}>
                <Row gutter={[12, 8]} align="middle" justify="space-between">
                    <Col>
                        <Space size={8} wrap>
                            <FilterOutlined style={{ color: '#8c8c8c' }} />
                            {canSeeAll && (
                                <Select
                                    value={mineOnly ? 'mine' : 'all'}
                                    onChange={(v) => setMineOnly(v === 'mine')}
                                    options={[
                                        { value: 'all', label: 'Tous les responsables' },
                                        { value: 'mine', label: 'Mon planning seulement' },
                                    ]}
                                    style={{ width: 200 }}
                                    size="small"
                                />
                            )}
                        </Space>
                    </Col>
                    <Col>
                        <Space align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {plannings.length} responsable(s)
                            </Text>
                            <Button icon={<ShareAltOutlined />} size="small" onClick={handleShare}>
                                Partager
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: 10 }}>
                <Table
                    columns={columns}
                    dataSource={plannings}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 12, showSizeChanger: false }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    onRow={(record) => ({
                        style: { cursor: 'pointer', background: '#fafafa' },
                        onClick: (e) => {
                            if (e.target.closest('button')) return;
                            navigate(`/planning/${record.id}`);
                        },
                    })}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    isResponsable
                                        ? 'Aucune activité cette semaine. Vérifiez que vous êtes responsable d\'un projet actif, ou créez des réunions et missions.'
                                        : 'Aucun planning pour cette semaine'
                                }
                            />
                        ),
                    }}
                />
            </Card>

            <Modal
                title={<><ShareAltOutlined style={{ marginRight: 8 }} />Partager le planning</>}
                open={shareModal.open}
                onCancel={() => setShareModal({ open: false, text: '' })}
                footer={[
                    <Button
                        key="copy"
                        type="primary"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyShare(shareModal.text)}
                    >
                        Copier le texte
                    </Button>,
                    <Button key="close" onClick={() => setShareModal({ open: false, text: '' })}>
                        Fermer
                    </Button>,
                ]}
                width={620}
                destroyOnClose
            >
                <Input.TextArea
                    value={shareModal.text}
                    readOnly
                    autoSize={{ minRows: 10, maxRows: 20 }}
                    style={{ fontFamily: 'monospace', fontSize: 12, background: '#fafafa' }}
                />
            </Modal>
        </div>
    );
}
