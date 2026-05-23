import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Input, Row, Select, Space, Spin, Table, Tag, Typography, Drawer, Descriptions, Button, Grid, Segmented, Dropdown } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { PlusOutlined, CalendarOutlined, DownOutlined, FlagOutlined, TeamOutlined, AppstoreOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SOURCE_LABELS = {
    MEETING: 'Réunion',
    MISSION: 'Mission',
    PLANNING_EVENT: 'Planning',
};
const STATUS_LABELS = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    CONFIRMED: 'Confirmé',
    COMPLETED: 'Terminé',
    RETURNED: 'Retourné',
    CANCELLED: 'Annulé',
    VALIDATED: 'Validé',
    IN_CONSOLIDATION: 'En consolidation',
    CP_PENDING: 'Att. coordinateur',
    SG_PENDING: 'Att. SG ou direction',
    DG_PENDING: 'Att. DG',
    ACTIVE: 'Actif',
    PAUSED: 'En pause',
    SUBMITTED: 'Soumis',
};

export default function EventsUnified() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [filtersMeta, setFiltersMeta] = useState({ directions: [], projects: [], eventTypeCategories: [] });
    const [q, setQ] = useState('');
    const [sourceType, setSourceType] = useState(undefined);
    const [categoryCode, setCategoryCode] = useState(undefined);
    const [directionId, setDirectionId] = useState(undefined);
    const [projectId, setProjectId] = useState(undefined);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [quickPeriod, setQuickPeriod] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsItem, setDetailsItem] = useState(null);
    const openDetails = (row) => {
        setDetailsItem(row);
        setDetailsOpen(true);
    };
    const closeDetails = () => {
        setDetailsOpen(false);
        setDetailsItem(null);
    };

    const statusColorMap = useMemo(() => ({
        DRAFT: 'default',
        SENT: 'blue',
        CONFIRMED: 'green',
        SUBMITTED: 'blue',
        IN_CONSOLIDATION: 'purple',
        CP_PENDING: 'geekblue',
        SG_PENDING: 'cyan',
        DG_PENDING: 'gold',
        VALIDATED: 'green',
        COMPLETED: 'default',
        RETURNED: 'orange',
        CANCELLED: 'red',
        ACTIVE: 'success',
        PAUSED: 'warning',
    }), []);

    const formatDateTime = (v) => {
        if (!v) return '-';
        try { return new Date(v).toLocaleString('fr-FR'); } catch { return '-'; }
    };
    const formatDate = (v) => {
        if (!v) return '-';
        try { return new Date(v).toLocaleDateString('fr-FR'); } catch { return '-'; }
    };

    const responsibleNames = (row) => (
        (row?.responsibleUsers || [])
            .map((u) => u?.name || u?.email || u?.id || '')
            .filter(Boolean)
            .join(', ') || '-'
    );

    const ymd = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const applyQuickPeriod = (period) => {
        const now = new Date();
        if (period === 'all') {
            setFrom('');
            setTo('');
            return;
        }
        if (period === 'today') {
            const d = ymd(now);
            setFrom(d);
            setTo(d);
            return;
        }
        if (period === 'week') {
            const jsDay = now.getDay();
            const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
            const monday = new Date(now);
            monday.setDate(now.getDate() + mondayOffset);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            setFrom(ymd(monday));
            setTo(ymd(sunday));
            return;
        }
        if (period === 'month') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setFrom(ymd(first));
            setTo(ymd(last));
        }
    };

    const onQuickPeriodChange = (period) => {
        setPage(1);
        setQuickPeriod(period);
        applyQuickPeriod(period);
    };

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/events/unified', {
                params: {
                    q: q || undefined,
                    source: sourceType || undefined,
                    categoryCode: categoryCode || undefined,
                    directionId: directionId || undefined,
                    projectId: projectId || undefined,
                    from: from || undefined,
                    to: to || undefined,
                    page,
                    limit: pageSize,
                },
            });
            setItems(data?.items || []);
            setTotal(data?.total || 0);
            setFiltersMeta(data?.filtersMeta || { directions: [], projects: [], eventTypeCategories: [] });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [q, sourceType, categoryCode, directionId, projectId, from, to, page, pageSize]);

    const eventTypeCategories = useMemo(
        () => (filtersMeta.eventTypeCategories || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        [filtersMeta.eventTypeCategories],
    );

    const categoryLabel = (code) => {
        const t = eventTypeCategories.find((x) => x.code === code);
        return t?.name || code;
    };

    const renderCategoryTag = (category) => {
        if (!category?.name) return <Tag>—</Tag>;
        return (
            <Tag style={{ margin: 0, borderColor: category.color, color: category.color }}>
                {category.name}
            </Tag>
        );
    };

    const columns = useMemo(() => ([
        {
            title: 'Catégorie',
            key: 'category',
            width: 140,
            render: (_, row) => renderCategoryTag(row.category),
        },
        {
            title: 'Source',
            dataIndex: 'sourceType',
            key: 'sourceType',
            width: 110,
            render: (v) => <Tag color="default">{SOURCE_LABELS[v] || v}</Tag>,
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (v) => <Tag color={statusColorMap[v] || 'default'}>{STATUS_LABELS[v] || v || '-'}</Tag>,
        },
        {
            title: 'Événement',
            key: 'title',
            render: (_, row) => (
                    <Space orientation="vertical" size={0}>
                    <Space size={6} wrap align="center">
                        <Link to={row.link}>
                            <Text strong>{row.title}</Text>
                        </Link>
                        {row.category?.name && (
                            <Tag style={{ margin: 0, borderColor: row.category.color, color: row.category.color }}>
                                {row.category.name}
                            </Tag>
                        )}
                    </Space>
                    <Text
                        type="secondary"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            maxWidth: 520,
                        }}
                    >
                        {row.description || '-'}
                    </Text>
                    <Space size={6} wrap>
                        <Text type="secondary" style={{ fontSize: 12 }}>Lieu : {row.location || '-'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Responsable(s) : {responsibleNames(row)}</Text>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Début',
            dataIndex: 'startAt',
            key: 'startAt',
            width: 180,
            render: (v) => formatDateTime(v),
        },
        {
            title: 'Fin',
            dataIndex: 'endAt',
            key: 'endAt',
            width: 180,
            render: (v) => formatDateTime(v),
        },
        {
            title: '',
            key: 'actions',
            width: 110,
            render: (_, row) => (
                <Button size="small" onClick={(e) => { e.stopPropagation(); openDetails(row); }}>
                    Détails
                </Button>
            ),
        },
    ]), [statusColorMap, eventTypeCategories]);

    const todayParam = useMemo(() => new Date().toISOString().split('T')[0], []);

    /**
     * Construit le routage approprié pour la création d'un événement à partir d'un type.
     * - MISSION → page de création de mission
     * - REUNION (et tout autre type) → formulaire de réunion avec eventTypeId pré-sélectionné
     */
    const handleCreateByType = (eventTypeRecord) => {
        if (!eventTypeRecord) return;
        const code = String(eventTypeRecord.code || '').toUpperCase();
        if (code === 'MISSION') {
            navigate(`/missions/new?date=${todayParam}`);
            return;
        }
        // Pour REUNION et tous les autres codes (ATELIER, FORMATION, AUDIENCE, AUTRE…)
        // on utilise le formulaire de réunion avec eventTypeId pré-sélectionné.
        const params = new URLSearchParams({ date: todayParam, eventTypeId: eventTypeRecord.id });
        navigate(`/meetings/new?${params.toString()}`);
    };

    const iconForTypeCode = (code) => {
        const c = String(code || '').toUpperCase();
        if (c === 'REUNION') return <TeamOutlined />;
        if (c === 'MISSION') return <FlagOutlined />;
        return <AppstoreOutlined />;
    };

    const createMenu = useMemo(() => {
        const items = eventTypeCategories
            .map((t) => ({
                key: t.id,
                icon: iconForTypeCode(t.code),
                label: (
                    <Space>
                        <span>{t.name}</span>
                        {t.color && (
                            <span
                                title={t.code}
                                style={{
                                    display: 'inline-block', width: 8, height: 8,
                                    borderRadius: '50%', background: t.color,
                                }}
                            />
                        )}
                    </Space>
                ),
            }));
        if (!items.length) {
            items.push({ key: 'no-types', label: 'Aucun type configuré', disabled: true });
        }
        return {
            items,
            onClick: ({ key }) => {
                const t = eventTypeCategories.find((x) => x.id === key);
                handleCreateByType(t);
            },
        };
    }, [eventTypeCategories, todayParam]);

    return (
        <div>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                flexWrap: 'wrap', gap: 12, marginBottom: 16,
            }}>
                <Title level={3} style={{ margin: 0 }}>Événements unifiés</Title>
                {user && (
                    <Space wrap>
                        <Dropdown menu={createMenu} trigger={['click']} placement="bottomRight">
                            <Button type="primary" icon={<PlusOutlined />}>
                                Créer un événement <DownOutlined />
                            </Button>
                        </Dropdown>
                        <Button icon={<CalendarOutlined />} onClick={() => navigate('/calendar')}>
                            Calendrier
                        </Button>
                        <Button onClick={() => navigate('/planning')}>Planning hebdomadaire</Button>
                    </Space>
                )}
            </div>

            {eventTypeCategories.length > 0 && (
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Types d&apos;événement</Text>
                    <Space size={[8, 8]} wrap>
                        <Tag
                            style={{ cursor: 'pointer', margin: 0 }}
                            color={!categoryCode ? 'processing' : 'default'}
                            onClick={() => { setPage(1); setCategoryCode(undefined); }}
                        >
                            Tous
                        </Tag>
                        {eventTypeCategories.map((t) => (
                            <Tag
                                key={t.id || t.code}
                                style={{
                                    cursor: 'pointer',
                                    margin: 0,
                                    borderColor: t.color,
                                    color: categoryCode === t.code ? '#fff' : t.color,
                                    background: categoryCode === t.code ? (t.color || '#1565C0') : 'transparent',
                                }}
                                onClick={() => {
                                    setPage(1);
                                    setCategoryCode(categoryCode === t.code ? undefined : t.code);
                                }}
                            >
                                {t.name}
                            </Tag>
                        ))}
                    </Space>
                </Card>
            )}

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
                    <Col xs={24}>
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                            <Text strong>Période rapide</Text>
                            <Segmented
                                value={quickPeriod}
                                onChange={onQuickPeriodChange}
                                options={[
                                    { label: 'Tout', value: 'all' },
                                    { label: "Aujourd'hui", value: 'today' },
                                    { label: 'Cette semaine', value: 'week' },
                                    { label: 'Ce mois', value: 'month' },
                                ]}
                                block={isMobile}
                            />
                        </Space>
                    </Col>
                </Row>
                <Row gutter={[12, 12]}>
                    <Col xs={24} md={8} lg={6}>
                        <Input.Search
                            allowClear
                            placeholder="Rechercher titre, description, responsable..."
                            value={q}
                            onChange={(e) => { setPage(1); setQ(e.target.value); }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={4} lg={3}>
                        <Select
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Direction"
                            value={directionId}
                            onChange={(v) => { setPage(1); setDirectionId(v); }}
                            options={(filtersMeta.directions || []).map((x) => ({ value: x.id, label: x.code ? `${x.name} (${x.code})` : x.name }))}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={4} lg={3}>
                        <Select
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Projet"
                            value={projectId}
                            onChange={(v) => { setPage(1); setProjectId(v); }}
                            options={(filtersMeta.projects || []).map((x) => ({ value: x.id, label: x.code ? `${x.name} (${x.code})` : x.name }))}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={4} lg={3}>
                        <Select
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Source"
                            value={sourceType}
                            onChange={(v) => { setPage(1); setSourceType(v); }}
                            options={(filtersMeta.sourceTypes || []).map((x) => ({ value: x, label: SOURCE_LABELS[x] || x }))}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={4} lg={3}>
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            style={{ width: '100%' }}
                            placeholder="Catégorie"
                            value={categoryCode}
                            onChange={(v) => { setPage(1); setCategoryCode(v); }}
                            options={eventTypeCategories.map((t) => ({
                                value: t.code,
                                label: t.name,
                            }))}
                        />
                    </Col>
                    <Col xs={12} sm={12} md={2} lg={3}>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => { setPage(1); setQuickPeriod('all'); setFrom(e.target.value); }}
                            style={{ width: '100%', height: 32 }}
                        />
                    </Col>
                    <Col xs={12} sm={12} md={2} lg={3}>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => { setPage(1); setQuickPeriod('all'); setTo(e.target.value); }}
                            style={{ width: '100%', height: 32 }}
                        />
                    </Col>
                </Row>
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                        Filtrez par catégorie (types configurés), source, direction, projet et période. Cliquez sur « Détails » pour afficher toutes les informations.
                    </Text>
                </div>
            </Card>

            <Spin spinning={loading}>
                {items.length === 0 ? (
                    <Card><Empty description="Aucun événement trouvé" /></Card>
                ) : (
                    <Card>
                        {isMobile ? (
                            <Row gutter={[12, 12]}>
                                {items.map((row) => (
                                    <Col xs={24} key={row.id}>
                                        <Card
                                            size="small"
                                            style={{ borderRadius: 12 }}
                                            title={(
                                                <Space wrap>
                                                    {renderCategoryTag(row.category)}
                                                    <Tag color="default">{SOURCE_LABELS[row.sourceType] || row.sourceType}</Tag>
                                                    <Tag color={statusColorMap[row.status] || 'default'}>{STATUS_LABELS[row.status] || row.status || '-'}</Tag>
                                                </Space>
                                            )}
                                            extra={
                                                <Button size="small" onClick={() => openDetails(row)}>
                                                    Détails
                                                </Button>
                                            }
                                        >
                                            <Space direction="vertical" size={4}>
                                                <Link to={row.link}><Text strong style={{ fontSize: 16 }}>{row.title}</Text></Link>
                                                <Text type="secondary">{row.description || '-'}</Text>
                                                <div>
                                                    <Text type="secondary">Début :</Text> <Text>{formatDateTime(row.startAt)}</Text>
                                                </div>
                                                <div>
                                                    <Text type="secondary">Fin :</Text> <Text>{formatDateTime(row.endAt)}</Text>
                                                </div>
                                                <div>
                                                    <Text type="secondary">Lieu :</Text> <Text>{row.location || '-'}</Text>
                                                </div>
                                                <div>
                                                    <Text type="secondary">Responsable(s) :</Text> <Text>{responsibleNames(row)}</Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Table
                                rowKey="id"
                                dataSource={items}
                                columns={columns}
                                scroll={{ x: 980 }}
                                pagination={{
                                    current: page,
                                    pageSize,
                                    total,
                                    showSizeChanger: true,
                                    onChange: (p, s) => {
                                        setPage(p);
                                        setPageSize(s);
                                    },
                                }}
                            />
                        )}
                    </Card>
                )}
            </Spin>

            <Drawer
                title="Détails de l'événement"
                placement="right"
                open={detailsOpen}
                onClose={closeDetails}
                width={isMobile ? '100%' : 560}
                destroyOnClose
            >
                {detailsItem && (
                    <div>
                        <Descriptions
                            bordered
                            size="small"
                            column={isMobile ? 1 : 2}
                        >
                            <Descriptions.Item label="Catégorie">
                                {renderCategoryTag(detailsItem.category)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Source">
                                {SOURCE_LABELS[detailsItem.sourceType] || detailsItem.sourceType || '-'}
                                {detailsItem.categoryCode && (
                                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                        ({categoryLabel(detailsItem.categoryCode)})
                                    </Text>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Statut">
                                <Tag color={statusColorMap[detailsItem.status] || 'default'}>
                                    {STATUS_LABELS[detailsItem.status] || detailsItem.status || '-'}
                                </Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Titre" span={isMobile ? 1 : 2}>
                                <Text strong>{detailsItem.title}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Description" span={isMobile ? 1 : 2}>
                                <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                                    {detailsItem.description || '-'}
                                </Text>
                            </Descriptions.Item>

                            <Descriptions.Item label="Date début">
                                {formatDateTime(detailsItem.startAt)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Date fin">
                                {formatDateTime(detailsItem.endAt)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Jour">
                                {formatDate(detailsItem.startAt)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Lieu" span={isMobile ? 1 : 2}>
                                {detailsItem.location || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Direction" span={isMobile ? 1 : 2}>
                                {detailsItem.direction?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Projet" span={isMobile ? 1 : 2}>
                                {detailsItem.project?.name || '-'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Responsable(s)" span={isMobile ? 1 : 2}>
                                {responsibleNames(detailsItem)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Participants">
                                {detailsItem.participantsCount ?? '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Space style={{ marginTop: 16 }}>
                            {detailsItem.link && (
                                <Link to={detailsItem.link} onClick={closeDetails}>
                                    <Button type="primary">Ouvrir</Button>
                                </Link>
                            )}
                            <Button onClick={closeDetails}>Fermer</Button>
                        </Space>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
