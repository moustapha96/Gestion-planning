import { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Button, Input, Popconfirm, Tag, Space,
    Typography, App, Drawer, Descriptions, List, Statistic, Row, Col, Tooltip, Badge, Upload,
    Grid, Dropdown, Alert,
} from 'antd';
import {
    ProjectOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    EyeOutlined, TeamOutlined, FlagOutlined, CheckCircleOutlined, StopOutlined, PauseCircleOutlined,
    FileAddOutlined, FileTextOutlined, UploadOutlined, UserOutlined, MoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PDF_ACCEPT, isAcceptedPdfFile } from '../utils/pdfAttachment';
import { resolveImageSrc } from '../utils/mediaUrl';
import { canManageProjects, isResponsable } from '../utils/roles';
import { isUserProjectResponsibleOrCoordinator } from '../utils/projectScope';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const STATUS_COLORS = { ACTIVE: 'success', PAUSED: 'warning', COMPLETED: 'default' };
const STATUS_LABELS = { ACTIVE: 'Actif', PAUSED: 'En pause', COMPLETED: 'Terminé' };

function projectFormPath(adminContext, projectId) {
    const base = adminContext ? '/admin/projects' : '/projects';
    return projectId ? `${base}/${projectId}/edit` : `${base}/new`;
}

export default function Projects({ adminContext = false }) {
    const { user }    = useAuth();
    const { message, modal } = App.useApp();
    const navigate    = useNavigate();
    const screens     = useBreakpoint();
    const isMobile    = !screens.md;
    const isCompact   = !screens.lg;

    const [projects,      setProjects]      = useState([]);
    const [loading,       setLoading]       = useState(false);
    const [drawerProject, setDrawerProject] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [uploading,      setUploading]    = useState(false);
    const [search,        setSearch]        = useState('');

    const canManage = adminContext || canManageProjects(user?.role);
    const isResponsibleUser = isResponsable(user?.role) && !canManage;
    const myProjects = isResponsibleUser
        ? projects.filter((p) => isUserProjectResponsibleOrCoordinator(user, p))
        : projects;

    // ── Fetch ─────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/projects');
            setProjects(data || []);
        } catch {
            message.error('Erreur chargement projets');
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/projects/${id}`);
            message.success('Projet supprimé');
            load();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur suppression');
        }
    };

    const handleStatus = async (project, status) => {
        try {
            await api.put(`/projects/${project.id}/status`, { status });
            message.success(`Projet mis à jour : ${STATUS_LABELS[status] || status}`);
            load();
            if (drawerProject?.id === project.id) openDetail(project);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur mise à jour statut');
        }
    };

    const openDetail = async (p) => {
        setDrawerProject(p);
        setDrawerLoading(true);
        try {
            const { data } = await api.get(`/projects/${p.id}`);
            setDrawerProject(data);
        } catch {
            message.error('Erreur chargement détail');
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleUploadFile = (projectId) => async ({ file, onSuccess, onError }) => {
        if (!isAcceptedPdfFile(file)) {
            message.error('Seuls les fichiers PDF (.pdf) sont acceptés.');
            onError?.(new Error('not pdf'));
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.post(`/projects/${projectId}/files`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('PDF ajouté');
            onSuccess?.('ok');
            const current = projects.find((x) => x.id === projectId) || { id: projectId };
            openDetail(current);
            load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur upload');
            onError?.(err);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (projectId, fileId) => {
        try {
            await api.delete(`/projects/${projectId}/files/${fileId}`);
            message.success('Fichier supprimé');
            const current = projects.find((x) => x.id === projectId) || { id: projectId };
            openDetail(current);
            load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur suppression fichier');
        }
    };

    // ── Stats ─────────────────────────────────────────────────────
    const total    = myProjects.length;
    const actifs   = myProjects.filter((p) => p.isActive).length;
    const missions = myProjects.reduce((s, p) => s + (p._count?.missions || 0), 0);
    const meetings = myProjects.reduce((s, p) => s + (p._count?.meetings || 0), 0);

    // ── Filtrage local ────────────────────────────────────────────
    const filtered = myProjects.filter((p) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            p.name?.toLowerCase().includes(q) ||
            p.code?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.consolidator?.name?.toLowerCase().includes(q) ||
            p.consolidator?.email?.toLowerCase().includes(q) ||
            p.coordinator?.name?.toLowerCase().includes(q) ||
            p.coordinator?.email?.toLowerCase().includes(q) ||
            p.responsible?.name?.toLowerCase().includes(q) ||
            p.responsible?.email?.toLowerCase().includes(q)
        );
    });

    const renderPerson = (person, iconColor = '#722ed1') => {
        if (!person) return <Text type="secondary">Non défini</Text>;
        return (
            <Tooltip title={`${person.email}${person.role ? ` — ${person.role}` : ''}`}>
                <Space size={4} wrap>
                    <UserOutlined style={{ color: iconColor }} />
                    <Text ellipsis style={{ maxWidth: isMobile ? '100%' : 140 }}>{person.name}</Text>
                </Space>
            </Tooltip>
        );
    };

    const buildActionItems = (row) => {
        const items = [
            {
                key: 'view',
                label: 'Voir détail',
                icon: <EyeOutlined />,
                onClick: () => openDetail(row),
            },
        ];
        if (canManage) {
            items.push({
                key: 'edit',
                label: 'Modifier',
                icon: <EditOutlined />,
                onClick: () => navigate(projectFormPath(adminContext, row.id)),
            });
            if (row.status !== 'COMPLETED') {
                items.push(
                    {
                        key: 'pause',
                        label: 'Mettre en pause',
                        icon: <PauseCircleOutlined />,
                        onClick: () => handleStatus(row, 'PAUSED'),
                    },
                    {
                        key: 'complete',
                        label: 'Terminer',
                        icon: <CheckCircleOutlined />,
                        onClick: () => handleStatus(row, 'COMPLETED'),
                    },
                );
            }
            if (row.status !== 'ACTIVE') {
                items.push({
                    key: 'activate',
                    label: 'Réactiver',
                    icon: <StopOutlined />,
                    onClick: () => handleStatus(row, 'ACTIVE'),
                });
            }
            items.push({
                key: 'delete',
                label: 'Supprimer',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                    // handled via Popconfirm in desktop; mobile uses confirm
                },
            });
        }
        return items;
    };

    const renderRowActions = (row, block = false) => {
        const isMine = isUserProjectResponsibleOrCoordinator(user, row);
        const canCreateOnRow = isMine && row.status === 'ACTIVE';

        if (!canManage) {
            return (
                <Space wrap style={{ width: block ? '100%' : undefined }}>
                    <Button size="small" icon={<EyeOutlined />} block={block} onClick={() => openDetail(row)}>
                        Voir
                    </Button>
                    {canCreateOnRow && (
                        <>
                            <Button
                                size="small"
                                type="primary"
                                icon={<TeamOutlined />}
                                onClick={() => navigate(`/meetings/new?projectId=${row.id}`)}
                            >
                                Réunion
                            </Button>
                            <Button
                                size="small"
                                icon={<FlagOutlined />}
                                onClick={() => navigate(`/missions/new?projectId=${row.id}`)}
                            >
                                Mission
                            </Button>
                        </>
                    )}
                </Space>
            );
        }
        if (isMobile) {
            return (
                <Space wrap style={{ width: block ? '100%' : undefined }}>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(row)}>
                        Voir
                    </Button>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => navigate(projectFormPath(adminContext, row.id))}
                    >
                        Modifier
                    </Button>
                    <Dropdown
                        menu={{
                            items: buildActionItems(row).filter((i) => !['view', 'edit'].includes(i.key)),
                            onClick: ({ key }) => {
                                if (key === 'pause') handleStatus(row, 'PAUSED');
                                if (key === 'complete') handleStatus(row, 'COMPLETED');
                                if (key === 'activate') handleStatus(row, 'ACTIVE');
                                if (key === 'delete') {
                                    modal.confirm({
                                        title: 'Supprimer ce projet ?',
                                        content: 'Les missions et réunions liées seront détachées.',
                                        okText: 'Supprimer',
                                        cancelText: 'Annuler',
                                        okButtonProps: { danger: true },
                                        onOk: () => handleDelete(row.id),
                                    });
                                }
                            },
                        }}
                        trigger={['click']}
                    >
                        <Button size="small" icon={<MoreOutlined />}>Actions</Button>
                    </Dropdown>
                </Space>
            );
        }
        return (
            <Space size={4} wrap>
                <Tooltip title="Voir détail">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(row)} />
                </Tooltip>
                <Tooltip title="Modifier">
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => navigate(projectFormPath(adminContext, row.id))}
                    />
                </Tooltip>
                {row.status !== 'COMPLETED' && (
                    <Tooltip title="Mettre en pause">
                        <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handleStatus(row, 'PAUSED')} />
                    </Tooltip>
                )}
                {row.status !== 'COMPLETED' && (
                    <Tooltip title="Terminer">
                        <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleStatus(row, 'COMPLETED')} />
                    </Tooltip>
                )}
                {row.status !== 'ACTIVE' && (
                    <Tooltip title="Réactiver">
                        <Button size="small" type="default" icon={<StopOutlined />} onClick={() => handleStatus(row, 'ACTIVE')} />
                    </Tooltip>
                )}
                <Popconfirm
                    title="Supprimer ce projet ?"
                    description="Les missions et réunions liées seront détachées."
                    okText="Supprimer" cancelText="Annuler"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(row.id)}
                >
                    <Tooltip title="Supprimer">
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                </Popconfirm>
            </Space>
        );
    };

    const renderMobileProjectCard = (row) => {
        const logoSrc = resolveImageSrc(row.logoUrl);
        return (
            <Card
                size="small"
                style={{ width: '100%', borderRadius: 10 }}
                styles={{ body: { padding: isMobile ? 12 : 16 } }}
            >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {logoSrc ? (
                        <img
                            src={logoSrc}
                            alt=""
                            style={{
                                width: 52,
                                height: 52,
                                objectFit: 'contain',
                                borderRadius: 8,
                                border: '1px solid #f0f0f0',
                                background: '#fafafa',
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 8,
                                background: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <ProjectOutlined style={{ fontSize: 22, color: '#bfbfbf' }} />
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Button
                            type="link"
                            style={{ padding: 0, height: 'auto', fontWeight: 600, textAlign: 'left', whiteSpace: 'normal' }}
                            onClick={() => openDetail(row)}
                        >
                            {row.name}
                        </Button>
                        <Space wrap size={[4, 4]} style={{ marginTop: 6 }}>
                            {row.code && <Tag>{row.code}</Tag>}
                            <Tag color={STATUS_COLORS[row.status] || 'default'}>
                                {STATUS_LABELS[row.status] || row.status}
                            </Tag>
                            <Badge
                                count={`${row._count?.missions || 0} miss.`}
                                showZero
                                style={{ background: row._count?.missions ? '#722ed1' : '#d9d9d9' }}
                            />
                            <Badge
                                count={`${row._count?.meetings || 0} réu.`}
                                showZero
                                style={{ background: row._count?.meetings ? '#1565C0' : '#d9d9d9' }}
                            />
                        </Space>
                    </div>
                </div>
                {row.description && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
                        {row.description}
                    </Text>
                )}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Responsable</Text>
                    {renderPerson(row.responsible, '#1565C0')}
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>Consolidateur</Text>
                    {renderPerson(row.consolidator, '#722ed1')}
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>Coordinateur</Text>
                    {renderPerson(row.coordinator, '#13c2c2')}
                </div>
                <div style={{ marginTop: 12 }}>
                    {renderRowActions(row, true)}
                </div>
            </Card>
        );
    };

    // ── Colonnes tableau ──────────────────────────────────────────
    const columns = [
        {
            title: 'Logo',
            key: 'logo',
            width: 72,
            align: 'center',
            render: (_, row) => {
                const src = resolveImageSrc(row.logoUrl);
                if (!src) return <Text type="secondary">—</Text>;
                return (
                    <img
                        src={src}
                        alt=""
                        style={{
                            width: 44,
                            height: 44,
                            objectFit: 'contain',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0',
                            background: '#fafafa',
                            display: 'block',
                            margin: '0 auto',
                        }}
                    />
                );
            },
        },
        {
            title: 'Code',
            dataIndex: 'code',
            width: 90,
            render: (c) => c ? <Tag>{c}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Nom',
            dataIndex: 'name',
            width: 200,
            ellipsis: true,
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (name, row) => (
                <span style={{ fontWeight: 600, cursor: 'pointer', color: '#1565C0' }} onClick={() => openDetail(row)}>
                    {name}
                </span>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            width: 220,
            ellipsis: true,
            responsive: ['lg'],
            render: (d) => d || <Text type="secondary">—</Text>,
        },
        {
            title: 'Responsable',
            key: 'responsible',
            width: 160,
            ellipsis: true,
            responsive: ['md'],
            render: (_, row) => renderPerson(row.responsible, '#1565C0'),
        },
        {
            title: 'Consolidateur',
            key: 'consolidator',
            width: 160,
            ellipsis: true,
            responsive: ['lg'],
            render: (_, row) => renderPerson(row.consolidator, '#722ed1'),
        },
        {
            title: 'Coordinateur',
            key: 'coordinator',
            width: 160,
            ellipsis: true,
            responsive: ['xl'],
            render: (_, row) => renderPerson(row.coordinator, '#13c2c2'),
        },
        {
            title: 'Missions',
            key: 'missions',
            width: 90,
            align: 'center',
            responsive: ['sm'],
            render: (_, row) => (
                <Badge count={row._count?.missions || 0} showZero
                    style={{ background: row._count?.missions ? '#722ed1' : '#d9d9d9' }} />
            ),
        },
        {
            title: 'Réunions',
            key: 'meetings',
            width: 90,
            align: 'center',
            responsive: ['sm'],
            render: (_, row) => (
                <Badge count={row._count?.meetings || 0} showZero
                    style={{ background: row._count?.meetings ? '#1565C0' : '#d9d9d9' }} />
            ),
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            width: 100,
            align: 'center',
            filters: [
                { text: 'Actif', value: 'ACTIVE' },
                { text: 'En pause', value: 'PAUSED' },
                { text: 'Terminé', value: 'COMPLETED' },
            ],
            onFilter: (val, row) => row.status === val,
            render: (status) => <Tag color={STATUS_COLORS[status] || 'default'}>{STATUS_LABELS[status] || status}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: isCompact ? 100 : 120,
            align: 'center',
            fixed: isCompact ? 'right' : undefined,
            render: (_, row) => renderRowActions(row),
        },
    ];

    return (
        <div>
            {/* ── En-tête ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
            }}>
                {!adminContext && (
                    <Title level={3} style={{ margin: 0 }}>
                        <ProjectOutlined style={{ marginRight: 8 }} />
                        {isResponsibleUser ? 'Mes projets' : 'Projets'}
                    </Title>
                )}
                {canManage && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        block={isMobile}
                        onClick={() => navigate(projectFormPath(adminContext))}
                        style={isMobile ? { width: '100%' } : undefined}
                    >
                        Nouveau projet
                    </Button>
                )}
            </div>

            {isResponsibleUser && myProjects.length > 1 && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`Vous êtes responsable ou coordinateur de ${myProjects.length} projets actifs`}
                    description="Lors de la création d'une réunion, mission ou événement, choisissez le projet concerné. Vous pouvez aussi lancer une création directement depuis la fiche d'un projet."
                />
            )}

            {isResponsibleUser && myProjects.length === 0 && !loading && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Aucun projet sous votre responsabilité"
                    description="Contactez l'administration pour être désigné responsable ou coordinateur d'un projet."
                />
            )}

            {/* ── Stats ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {[
                    { title: isResponsibleUser ? 'Mes projets' : 'Total projets', value: total, color: '#1565C0', icon: <ProjectOutlined /> },
                    { title: 'Projets actifs',  value: actifs,   color: '#52c41a', icon: <CheckCircleOutlined /> },
                    { title: 'Missions liées',  value: missions, color: '#722ed1', icon: <FlagOutlined /> },
                    { title: 'Réunions liées',  value: meetings, color: '#1565C0', icon: <TeamOutlined /> },
                ].map((s) => (
                    <Col xs={12} sm={12} md={6} key={s.title}>
                        <Card size="small" style={{ borderRadius: 10 }}>
                            <Statistic
                                title={s.title}
                                value={s.value}
                                prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                                valueStyle={{ color: s.color, fontWeight: 700 }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* ── Barre recherche ── */}
            <Card style={{ borderRadius: 10, marginBottom: 0 }} styles={{ body: { padding: isMobile ? '10px 12px' : '12px 16px' } }}>
                <Input.Search
                    placeholder="Rechercher par nom, code, responsable..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    style={{ width: '100%', maxWidth: isMobile ? '100%' : 420 }}
                />
            </Card>

            {/* ── Liste / Tableau ── */}
            <Card
                style={{ borderRadius: 10, marginTop: 12 }}
                styles={{ body: { padding: isMobile ? 12 : 0 } }}
            >
                {isMobile ? (
                    <List
                        dataSource={filtered}
                        rowKey="id"
                        loading={loading}
                        locale={{ emptyText: 'Aucun projet' }}
                        pagination={{
                            pageSize: 8,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} projet(s)`,
                            size: 'small',
                        }}
                        renderItem={(row) => (
                            <List.Item style={{ padding: 0, marginBottom: 10, border: 'none' }}>
                                {renderMobileProjectCard(row)}
                            </List.Item>
                        )}
                    />
                ) : (
                    <Table
                        dataSource={filtered}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                        pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (t) => `${t} projet(s)`,
                            responsive: true,
                        }}
                        locale={{ emptyText: 'Aucun projet' }}
                    />
                )}
            </Card>

            {/* ── Drawer détail ── */}
            <Drawer
                open={!!drawerProject}
                onClose={() => setDrawerProject(null)}
                placement="right"
                width={isMobile ? '100%' : 480}
                styles={{
                    body: { padding: isMobile ? '12px 14px' : '20px 24px' },
                    header: { padding: isMobile ? '12px 14px' : undefined },
                }}
                extra={drawerProject?.id ? (
                    <Space wrap size={[8, 8]} style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                        {canManage && (
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                    setDrawerProject(null);
                                    navigate(projectFormPath(adminContext, drawerProject.id));
                                }}
                            >
                                {isMobile ? 'Modifier' : 'Modifier'}
                            </Button>
                        )}
                        <Button
                            type="primary"
                            size="small"
                            block={isMobile}
                            onClick={() => navigate(`/projects/${drawerProject.id}`)}
                        >
                            Page détail
                        </Button>
                    </Space>
                ) : null}
                title={(
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        {drawerProject?.logoUrl ? (
                            <img
                                src={resolveImageSrc(drawerProject.logoUrl) || ''}
                                alt=""
                                style={{
                                    width: 36,
                                    height: 36,
                                    objectFit: 'contain',
                                    borderRadius: 8,
                                    border: '1px solid #f0f0f0',
                                    flexShrink: 0,
                                }}
                            />
                        ) : null}
                        <ProjectOutlined style={{ marginRight: 4 }} />
                        <span style={{ wordBreak: 'break-word' }}>{drawerProject?.name}</span>
                    </span>
                )}
                loading={drawerLoading}
            >
                {drawerProject && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {drawerProject.logoUrl && resolveImageSrc(drawerProject.logoUrl) ? (
                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                <img
                                    src={resolveImageSrc(drawerProject.logoUrl) || ''}
                                    alt={`Logo ${drawerProject.name}`}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: 120,
                                        objectFit: 'contain',
                                        borderRadius: 12,
                                        border: '1px solid #f0f0f0',
                                        background: '#fafafa',
                                    }}
                                />
                            </div>
                        ) : null}
                        <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Code">
                                {drawerProject.code ? <Tag>{drawerProject.code}</Tag> : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Statut">
                                <Tag color={STATUS_COLORS[drawerProject.status] || 'default'}>
                                    {STATUS_LABELS[drawerProject.status] || drawerProject.status}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Créateur">
                                {drawerProject.createdBy?.name || drawerProject.createdBy?.email || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Responsable">
                                {drawerProject.responsible ? (
                                    <Space direction="vertical" size={0}>
                                        <Text strong>{drawerProject.responsible.name}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {drawerProject.responsible.email}
                                            {drawerProject.responsible.role ? ` · ${drawerProject.responsible.role}` : ''}
                                        </Text>
                                    </Space>
                                ) : (
                                    <Text type="secondary">Non défini</Text>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Consolidateur">
                                {drawerProject.consolidator ? (
                                    <Space direction="vertical" size={0}>
                                        <Text strong>{drawerProject.consolidator.name}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {drawerProject.consolidator.email}
                                            {drawerProject.consolidator.role ? ` · ${drawerProject.consolidator.role}` : ''}
                                        </Text>
                                    </Space>
                                ) : (
                                    <Text type="secondary">Non défini</Text>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Coordinateur">
                                {drawerProject.coordinator ? (
                                    <Space direction="vertical" size={0}>
                                        <Text strong>{drawerProject.coordinator.name}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {drawerProject.coordinator.email}
                                            {drawerProject.coordinator.role ? ` · ${drawerProject.coordinator.role}` : ''}
                                        </Text>
                                    </Space>
                                ) : (
                                    <Text type="secondary">Non défini</Text>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="Description">
                                {drawerProject.description || <Text type="secondary">—</Text>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Créé le">
                                {new Date(drawerProject.createdAt).toLocaleDateString('fr-FR')}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Missions liées */}
                        <Card size="small" title={<><FlagOutlined style={{ color: '#722ed1', marginRight: 6 }} />Missions ({drawerProject._count?.missions || 0})</>}>
                            {drawerProject.missions?.length > 0 ? (
                                <List
                                    size="small"
                                    dataSource={drawerProject.missions}
                                    renderItem={(m) => (
                                        <List.Item
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => { setDrawerProject(null); navigate(`/missions/${m.id}`); }}
                                        >
                                            <Text>{m.title}</Text>
                                            <Tag style={{ marginLeft: 8 }} color={
                                                m.status === 'COMPLETED' ? 'success' :
                                                m.status === 'IN_PROGRESS' ? 'processing' : 'default'
                                            }>{m.status}</Tag>
                                        </List.Item>
                                    )}
                                />
                            ) : <Text type="secondary">Aucune mission</Text>}
                        </Card>

                        {/* Réunions liées */}
                        <Card size="small" title={<><TeamOutlined style={{ color: '#1565C0', marginRight: 6 }} />Réunions ({drawerProject._count?.meetings || 0})</>}>
                            {drawerProject.meetings?.length > 0 ? (
                                <List
                                    size="small"
                                    dataSource={drawerProject.meetings}
                                    renderItem={(m) => (
                                        <List.Item
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => { setDrawerProject(null); navigate(`/meetings/${m.id}`); }}
                                        >
                                            <Text>{m.title}</Text>
                                            {m.startTime && (
                                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                                    {new Date(m.startTime).toLocaleString('fr-FR', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </Text>
                                            )}
                                        </List.Item>
                                    )}
                                />
                            ) : <Text type="secondary">Aucune réunion</Text>}
                        </Card>

                        <Card
                            size="small"
                            title={<><FileAddOutlined style={{ color: '#1565C0', marginRight: 6 }} />Pièces jointes PDF ({drawerProject._count?.files || 0})</>}
                            extra={
                                canManage && drawerProject.status !== 'COMPLETED' && (
                                    <Upload
                                        showUploadList={false}
                                        accept={PDF_ACCEPT}
                                        customRequest={handleUploadFile(drawerProject.id)}
                                        disabled={uploading}
                                    >
                                        <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                                            Ajouter un PDF
                                        </Button>
                                    </Upload>
                                )
                            }
                        >
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                                Uniquement des documents PDF (max. 20 Mo).
                            </Text>
                            {drawerProject.files?.length > 0 ? (
                                <List
                                    size="small"
                                    dataSource={drawerProject.files}
                                    renderItem={(f) => (
                                        <List.Item
                                            actions={[
                                                canManage && drawerProject.status !== 'COMPLETED' && (
                                                    <Popconfirm
                                                        key="del"
                                                        title="Supprimer ce fichier ?"
                                                        okText="Supprimer"
                                                        cancelText="Annuler"
                                                        okButtonProps={{ danger: true }}
                                                        onConfirm={() => handleDeleteFile(drawerProject.id, f.id)}
                                                    >
                                                        <Button size="small" danger icon={<DeleteOutlined />} />
                                                    </Popconfirm>
                                                ),
                                            ].filter(Boolean)}
                                        >
                                            <List.Item.Meta
                                                avatar={<FileTextOutlined style={{ color: '#1565C0', fontSize: 18 }} />}
                                                title={
                                                    <a href={`${API_BASE}${f.fileUrl}`} target="_blank" rel="noopener noreferrer">
                                                        {f.fileName}
                                                    </a>
                                                }
                                                description={`${f.uploadedBy?.name || 'Utilisateur'} · ${new Date(f.createdAt).toLocaleString('fr-FR')}`}
                                            />
                                        </List.Item>
                                    )}
                                />
                            ) : <Text type="secondary">Aucune pièce jointe</Text>}
                        </Card>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
