import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table, Tag, Button, Card, Typography, Space, Modal, Input, App,
    DatePicker, Row, Col, Select, Empty, Popconfirm, Badge,
} from 'antd';
import {
    PlusOutlined, SendOutlined, CheckOutlined, RollbackOutlined,
    LeftOutlined, RightOutlined, CalendarOutlined, DeleteOutlined,
    EyeOutlined, FilterOutlined, ScheduleOutlined, ShareAltOutlined,
    CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    isPrivilegedAdmin,
    canConsolidatePlanning,
    canCoordinatePlanning,
    canReturnPlanning,
    planningAutoFinalizeOnConsolidate,
    userConsolidatesAnyProject,
    userCoordinatesAnyProject,
} from '../utils/roles';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Constantes ───────────────────────────────────────────────────
const STATUS_COLORS = {
    DRAFT:            'default',
    SUBMITTED:        'blue',
    IN_CONSOLIDATION: 'purple',
    CP_PENDING:       'geekblue',
    SG_PENDING:       'cyan',
    DG_PENDING:       'gold',
    VALIDATED:        'green',
    RETURNED:         'orange',
    CANCELLED:        'red',
};
const STATUS_LABELS = {
    DRAFT:            'Brouillon',
    SUBMITTED:        'Soumis',
    IN_CONSOLIDATION: 'En consolidation',
    CP_PENDING:       'Att. coordinateur projet',
    SG_PENDING:       'Att. SG ou direction',
    DG_PENDING:       'Att. validation finale (SG ou DG)',
    VALIDATED:        'Validé',
    RETURNED:         'Retourné',
    CANCELLED:        'Annulé',
};
const STATUS_ROW_BG = {
    DRAFT:            '#fff',
    SUBMITTED:        '#f0f9ff',
    IN_CONSOLIDATION: '#faf5ff',
    CP_PENDING:       '#f0f5ff',
    SG_PENDING:       '#e6fffb',
    DG_PENDING:       '#fffbe6',
    VALIDATED:        '#f6ffed',
    RETURNED:         '#fff7e6',
    CANCELLED:        '#fff1f0',
};

const PENDING_VALIDATION = ['CP_PENDING', 'SG_PENDING', 'DG_PENDING', 'IN_CONSOLIDATION'];

// ── Helpers affichage ────────────────────────────────────────────
function fmtTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

function fmtDateLong(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return iso; }
}

const EVENT_TYPE_LABELS = {
    REUNION:     'Réunion',
    MISSION:     'Mission',
    DEPLACEMENT: 'Déplacement',
    FORMATION:   'Formation',
    AUTRE:       'Autre',
};

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
        lines.push('─'.repeat(50));
        lines.push(
            `👤 ${p.user?.name || '—'}  (${p.user?.direction?.name || p.user?.email || ''})`,
        );
        lines.push(`   Statut : ${STATUS_LABELS[p.status] || p.status}`);

        if (!events.length) {
            lines.push('   Aucun événement cette semaine.');
        } else {
            // Regrouper par jour
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
                    const end   = fmtTime(ev.endTime);
                    const time  = end ? `${start} – ${end}` : start;
                    const type  = ev.eventType?.name || EVENT_TYPE_LABELS[ev.type] || ev.type || '';
                    const loc   = ev.room?.name || ev.destination || '';
                    lines.push(
                        `      ${time}  [${type}]  ${ev.title || ''}${loc ? `  📍 ${loc}` : ''}`,
                    );
                }
            }
        }
        lines.push('');
    }
    return lines.join('\n');
}

// ── Helpers semaine ──────────────────────────────────────────────
function getMondayOfWeek(d) {
    const date = new Date(d);
    const day  = date.getDay();
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

// ── Composant principal ──────────────────────────────────────────
export default function Planning() {
    const navigate    = useNavigate();
    const { user }    = useAuth();
    const { message } = App.useApp();

    const [plannings,       setPlannings]       = useState([]);
    const [loading,         setLoading]         = useState(true);
    const [selectedDate,    setSelectedDate]    = useState(() => new Date());
    const [statusFilter,    setStatusFilter]    = useState('ALL');
    const [mineOnly,        setMineOnly]        = useState(false);
    const [returnModal,     setReturnModal]     = useState({ open: false, planningId: null });
    const [returnComment,   setReturnComment]   = useState('');
    const [createLoading,   setCreateLoading]   = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [shareModal,      setShareModal]      = useState({ open: false, text: '' });
    const [taxonomyProjects, setTaxonomyProjects] = useState([]);

    const isSG            = user?.role === 'SECRETAIRE_GENERAL';
    const isDG            = user?.role === 'DG';
    const isResponsable   = user?.role === 'RESPONSABLE';
    const isAdmin         = isPrivilegedAdmin(user?.role);
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

    useEffect(() => { fetchPlannings(selectedDate, mineOnly); }, [selectedDate, mineOnly]); // eslint-disable-line

    // ── Fetch ────────────────────────────────────────────────────
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

    // ── Actions workflow ─────────────────────────────────────────
    const handleSubmit = async (id) => {
        setActionLoadingId(id);
        try {
            await api.put(`/plannings/${id}/submit`);
            message.success('Planning soumis');
            fetchPlannings(selectedDate, mineOnly);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setActionLoadingId(null); }
    };

    const handleConsolidate = async (id) => {
        setActionLoadingId(id);
        try {
            const res = await api.put(`/plannings/${id}/consolidate`);
            if (res.data?.autoFinalized || res.data?.status === 'VALIDATED') {
                message.success('Planning consolidé et validé ✓');
            } else {
                message.success('Planning consolidé — transmis pour validation finale');
            }
            fetchPlannings(selectedDate, mineOnly);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setActionLoadingId(null); }
    };

    const handleApproveCp = async (id) => {
        setActionLoadingId(id);
        try {
            await api.put(`/plannings/${id}/approve-cp`);
            message.success('Validation coordinateur enregistrée');
            fetchPlannings(selectedDate, mineOnly);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setActionLoadingId(null); }
    };

    const handleApproveSg = async (id) => {
        setActionLoadingId(id);
        try {
            await api.put(`/plannings/${id}/approve-sg`);
            message.success('Accord SG / direction enregistré');
            fetchPlannings(selectedDate, mineOnly);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setActionLoadingId(null); }
    };

    const handleValidate = async (id) => {
        setActionLoadingId(id);
        try {
            await api.put(`/plannings/${id}/validate`);
            message.success('Planning validé définitivement ✓');
            fetchPlannings(selectedDate, mineOnly);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setActionLoadingId(null); }
    };

    const handleReturn = async () => {
        if (!returnComment.trim()) { message.warning('Veuillez saisir un commentaire'); return; }
        try {
            await api.put(`/plannings/${returnModal.planningId}/return`, { comment: returnComment });
            message.success('Planning retourné pour correction');
            setReturnModal({ open: false, planningId: null });
            setReturnComment('');
            fetchPlannings(selectedDate, mineOnly);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const handleDelete = async (planningId) => {
        setDeleteLoadingId(planningId);
        try {
            await api.delete(`/plannings/${planningId}`);
            message.success('Planning supprimé');
            fetchPlannings(selectedDate, mineOnly);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally { setDeleteLoadingId(null); }
    };

    const handleCreate = async () => {
        setCreateLoading(true);
        try {
            const weekStart = getMondayOfWeek(selectedDate);
            const res = await api.post('/plannings', { weekStart: weekStart.toISOString() });
            message.success('Planning créé');
            if (res.data?.id) navigate(`/planning/${res.data.id}`);
        } catch (err) {
            if (err.response?.status === 409) {
                message.warning('Un planning existe déjà pour cette semaine.');
                if (err.response?.data?.planningId) navigate(`/planning/${err.response.data.planningId}`);
            } else {
                message.error(err.response?.data?.error || 'Erreur');
            }
        } finally { setCreateLoading(false); }
    };

    const handleShare = () => {
        const list = filteredPlannings || [];
        if (!list.length) {
            message.warning('Aucun planning à partager pour cette période.');
            return;
        }
        const label = weekRangeLabel(selectedDate);
        const text  = buildPlanningText(list, label);
        setShareModal({ open: true, text });
    };

    const handleCopyShare = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            message.success('Événements copiés dans le presse-papiers.');
        } catch {
            message.error('Impossible de copier — sélectionnez le texte manuellement.');
        }
    };

    // ── Données dérivées ─────────────────────────────────────────
    const filteredPlannings = plannings;

    const statusCounts = useMemo(() => {
        const c = {
            DRAFT: 0, SUBMITTED: 0, IN_CONSOLIDATION: 0, CP_PENDING: 0, SG_PENDING: 0, DG_PENDING: 0,
            VALIDATED: 0, RETURNED: 0, CANCELLED: 0,
        };
        plannings.forEach((p) => { if (c[p.status] !== undefined) c[p.status]++; });
        return c;
    }, [plannings]);

    const nav = (dir) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'next' ? 7 : -7));
        setSelectedDate(d);
    };

    // ── Colonnes table ───────────────────────────────────────────
    const columns = [
        // Colonne "Responsable" — toujours visible
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
            title: 'Activités',
            key: 'events',
            align: 'center',
            render: (_, r) => {
                const count = r.counts?.total ?? r._count?.events ?? r.events?.length ?? 0;
                return (
                    <Badge
                        count={count}
                        showZero
                        style={{ backgroundColor: count > 0 ? '#1565C0' : '#d9d9d9' }}
                    />
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            render: (_, record) => (
                <Button
                    size="small" icon={<EyeOutlined />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/planning/${record.id}`); }}
                >
                    Voir
                </Button>
            ),
        },
    ];

    return (
        <div>
            {/* ── Header ── */}
            <div style={{ marginBottom: 20 }}>
                <Row gutter={[16, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={14}>
                        <Title level={3} style={{ margin: 0 }}>
                            <ScheduleOutlined style={{ marginRight: 8 }} />Plannings
                        </Title>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                            Semaine du{' '}
                            <strong>{weekRangeLabel(selectedDate)}</strong>
                            {' — '}vue consolidée (réunions, missions, événements validés)
                        </Text>
                    </Col>
                    <Col xs={24} md={10}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }} size={6}>
                            <Button icon={<LeftOutlined />}     size="small" onClick={() => nav('prev')} />
                            <Button icon={<CalendarOutlined />} size="small" onClick={() => setSelectedDate(new Date())}>
                                Cette semaine
                            </Button>
                            <Button icon={<RightOutlined />}    size="small" onClick={() => nav('next')} />
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

            {/* ── Barre de filtres ── */}
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
                                        { value: 'all',  label: 'Tous les responsables' },
                                        { value: 'mine', label: 'Mes plannings seulement' },
                                    ]}
                                    style={{ width: 190 }}
                                    size="small"
                                />
                            )}
                        </Space>
                    </Col>
                    <Col>
                        <Space align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {filteredPlannings.length} planning(s)
                            </Text>
                            {isResponsable && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleCreate}
                                    loading={createLoading}
                                    size="small"
                                >
                                    Nouveau planning
                                </Button>
                            )}
                            <Button
                                icon={<ShareAltOutlined />}
                                size="small"
                                onClick={handleShare}
                            >
                                Partager
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* ── Tableau ── */}
            <Card style={{ borderRadius: 10 }}>
                <Table
                    columns={columns}
                    dataSource={filteredPlannings}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 12, showSizeChanger: false }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    onRow={(record) => ({
                        style: {
                            background: STATUS_ROW_BG[record.status] || '#fff',
                            cursor: 'pointer',
                        },
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
                                    plannings.length === 0
                                        ? 'Aucun planning pour cette semaine'
                                        : 'Aucun planning ne correspond au filtre'
                                }
                            >
                                {isResponsable && plannings.length === 0 && (
                                    <Button
                                        type="primary" icon={<PlusOutlined />}
                                        onClick={handleCreate} loading={createLoading}
                                    >
                                        Créer mon planning de la semaine
                                    </Button>
                                )}
                            </Empty>
                        ),
                    }}
                />
            </Card>

            {/* ── Modal retour pour correction ── */}
            <Modal
                title={
                    <span>
                        <RollbackOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
                        Retourner pour correction
                    </span>
                }
                open={returnModal.open}
                onOk={handleReturn}
                onCancel={() => {
                    setReturnModal({ open: false, planningId: null });
                    setReturnComment('');
                }}
                okText="Retourner pour correction"
                cancelText="Annuler"
                okButtonProps={{ danger: true }}
            >
                <p style={{ marginBottom: 8, color: '#595959' }}>
                    Indiquez les corrections demandées au responsable :
                </p>
                <TextArea
                    rows={4}
                    value={returnComment}
                    onChange={(e) => setReturnComment(e.target.value)}
                    placeholder="Décrivez les modifications nécessaires..."
                    showCount
                    maxLength={500}
                />
            </Modal>

            {/* ── Modale partage événements ── */}
            <Modal
                title={<><ShareAltOutlined style={{ marginRight: 8 }} />Partager les événements</>}
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
