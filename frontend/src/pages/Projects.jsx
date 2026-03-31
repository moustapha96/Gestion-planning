import { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Switch, Popconfirm, Tag, Space,
    Typography, App, Drawer, Descriptions, List, Statistic, Row, Col, Tooltip, Badge, Upload,
} from 'antd';
import {
    ProjectOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    EyeOutlined, TeamOutlined, FlagOutlined, CheckCircleOutlined, StopOutlined, PauseCircleOutlined,
    FileAddOutlined, FileTextOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const CAN_EDIT = ['ADMIN', 'SUPER_ADMIN', 'DG'];
const STATUS_COLORS = { ACTIVE: 'success', PAUSED: 'warning', COMPLETED: 'default' };
const STATUS_LABELS = { ACTIVE: 'Actif', PAUSED: 'En pause', COMPLETED: 'Terminé' };

export default function Projects() {
    const { user }    = useAuth();
    const { message } = App.useApp();
    const navigate    = useNavigate();

    const [projects,      setProjects]      = useState([]);
    const [loading,       setLoading]       = useState(false);
    const [modalOpen,     setModalOpen]     = useState(false);
    const [editTarget,    setEditTarget]    = useState(null);   // null = create
    const [saving,        setSaving]        = useState(false);
    const [drawerProject, setDrawerProject] = useState(null);   // détail drawer
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [uploading,      setUploading]    = useState(false);
    const [search,        setSearch]        = useState('');
    const [form] = Form.useForm();

    const canEdit = CAN_EDIT.includes(user?.role);
    const canUploadProjectFiles = (project) =>
        Boolean(project) && project.status !== 'COMPLETED' && (
            canEdit || user?.role === 'RESPONSABLE' || project.createdById === user?.id
        );

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

    // ── Ouvrir formulaire création/édition ────────────────────────
    const openCreate = () => {
        setEditTarget(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (p) => {
        setEditTarget(p);
        form.setFieldsValue({ name: p.name, code: p.code || '', description: p.description || '', isActive: p.isActive });
        setModalOpen(true);
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            if (editTarget) {
                await api.put(`/projects/${editTarget.id}`, values);
                message.success('Projet mis à jour');
            } else {
                await api.post('/projects', values);
                message.success('Projet créé');
            }
            setModalOpen(false);
            load();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur sauvegarde');
        } finally {
            setSaving(false);
        }
    };

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
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.post(`/projects/${projectId}/files`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('Fichier ajouté');
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
    const total    = projects.length;
    const actifs   = projects.filter((p) => p.isActive).length;
    const missions = projects.reduce((s, p) => s + (p._count?.missions || 0), 0);
    const meetings = projects.reduce((s, p) => s + (p._count?.meetings || 0), 0);

    // ── Filtrage local ────────────────────────────────────────────
    const filtered = projects.filter((p) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            p.name?.toLowerCase().includes(q) ||
            p.code?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
    });

    // ── Colonnes tableau ──────────────────────────────────────────
    const columns = [
        {
            title: 'Code',
            dataIndex: 'code',
            width: 90,
            render: (c) => c ? <Tag>{c}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Nom',
            dataIndex: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (name, row) => (
                <span style={{ fontWeight: 600, cursor: 'pointer', color: '#1A365D' }} onClick={() => openDetail(row)}>
                    {name}
                </span>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            ellipsis: true,
            render: (d) => d || <Text type="secondary">—</Text>,
        },
        {
            title: 'Missions',
            key: 'missions',
            width: 90,
            align: 'center',
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
            render: (_, row) => (
                <Badge count={row._count?.meetings || 0} showZero
                    style={{ background: row._count?.meetings ? '#1677ff' : '#d9d9d9' }} />
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
            width: 120,
            align: 'center',
            render: (_, row) => (
                <Space>
                    <Tooltip title="Voir détail">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(row)} />
                    </Tooltip>
                    {canEdit && (
                        <Tooltip title="Modifier">
                            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
                        </Tooltip>
                    )}
                    {(canEdit || user?.role === 'RESPONSABLE' || row.createdById === user?.id) && row.status !== 'COMPLETED' && (
                        <Tooltip title="Mettre en pause">
                            <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handleStatus(row, 'PAUSED')} />
                        </Tooltip>
                    )}
                    {(canEdit || user?.role === 'RESPONSABLE' || row.createdById === user?.id) && row.status !== 'COMPLETED' && (
                        <Tooltip title="Terminer">
                            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleStatus(row, 'COMPLETED')} />
                        </Tooltip>
                    )}
                    {(canEdit || user?.role === 'RESPONSABLE' || row.createdById === user?.id) && row.status !== 'ACTIVE' && (
                        <Tooltip title="Réactiver">
                            <Button size="small" type="default" icon={<StopOutlined />} onClick={() => handleStatus(row, 'ACTIVE')} />
                        </Tooltip>
                    )}
                    {canEdit && (
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
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* ── En-tête ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <ProjectOutlined style={{ marginRight: 8 }} />Projets
                </Title>
                {canEdit && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Nouveau projet
                    </Button>
                )}
            </div>

            {/* ── Stats ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total projets',   value: total,    color: '#1A365D', icon: <ProjectOutlined /> },
                    { title: 'Projets actifs',  value: actifs,   color: '#52c41a', icon: <CheckCircleOutlined /> },
                    { title: 'Missions liées',  value: missions, color: '#722ed1', icon: <FlagOutlined /> },
                    { title: 'Réunions liées',  value: meetings, color: '#1677ff', icon: <TeamOutlined /> },
                ].map((s) => (
                    <Col xs={12} sm={6} key={s.title}>
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
            <Card style={{ borderRadius: 10, marginBottom: 0 }} styles={{ body: { padding: '12px 16px' } }}>
                <Input.Search
                    placeholder="Rechercher par nom, code, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    style={{ maxWidth: 380 }}
                />
            </Card>

            {/* ── Tableau ── */}
            <Card style={{ borderRadius: 10, marginTop: 12 }} styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    size="middle"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} projet(s)` }}
                    locale={{ emptyText: 'Aucun projet' }}
                />
            </Card>

            {/* ── Modal création/édition ── */}
            <Modal
                open={modalOpen}
                title={editTarget ? 'Modifier le projet' : 'Nouveau projet'}
                onOk={handleSave}
                onCancel={() => setModalOpen(false)}
                confirmLoading={saving}
                okText={editTarget ? 'Enregistrer' : 'Créer'}
                cancelText="Annuler"
                width={520}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nom du projet" rules={[{ required: true, message: 'Requis' }]}>
                        <Input placeholder="Ex: Projet Alpha" maxLength={120} />
                    </Form.Item>
                    <Form.Item name="code" label="Code (optionnel)">
                        <Input placeholder="Ex: PA-2025" maxLength={30} style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} placeholder="Description du projet..." maxLength={500} />
                    </Form.Item>
                    {editTarget && (
                        <Form.Item name="isActive" label="Statut" valuePropName="checked">
                            <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* ── Drawer détail ── */}
            <Drawer
                open={!!drawerProject}
                onClose={() => setDrawerProject(null)}
                extra={drawerProject?.id ? (
                    <Button type="primary" size="small" onClick={() => navigate(`/projects/${drawerProject.id}`)}>
                        Ouvrir la page détail
                    </Button>
                ) : null}
                title={
                    <span>
                        <ProjectOutlined style={{ marginRight: 8 }} />
                        {drawerProject?.name}
                    </span>
                }
                width={480}
                loading={drawerLoading}
            >
                {drawerProject && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                        <Card size="small" title={<><TeamOutlined style={{ color: '#1677ff', marginRight: 6 }} />Réunions ({drawerProject._count?.meetings || 0})</>}>
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
                            title={<><FileAddOutlined style={{ color: '#1677ff', marginRight: 6 }} />Fichiers projet ({drawerProject._count?.files || 0})</>}
                            extra={
                                canUploadProjectFiles(drawerProject) && (
                                    <Upload
                                        showUploadList={false}
                                        customRequest={handleUploadFile(drawerProject.id)}
                                        disabled={uploading}
                                    >
                                        <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                                            Ajouter
                                        </Button>
                                    </Upload>
                                )
                            }
                        >
                            {drawerProject.files?.length > 0 ? (
                                <List
                                    size="small"
                                    dataSource={drawerProject.files}
                                    renderItem={(f) => (
                                        <List.Item
                                            actions={[
                                                canUploadProjectFiles(drawerProject) && (
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
                                                avatar={<FileTextOutlined style={{ color: '#1677ff', fontSize: 18 }} />}
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
                            ) : <Text type="secondary">Aucun fichier</Text>}
                        </Card>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
