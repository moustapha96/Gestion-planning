import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table, Tag, Button, Typography, Space, Modal, Form, Input, Popconfirm, App, Tooltip, Row, Col, Spin, Switch, Alert, Upload, List, Grid,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined, ProjectOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const { Text } = Typography;

/**
 * Gestion admin des directions OU des projets (taxonomie événements).
 * @param {{ variant: 'directions' | 'projects' }} props
 */
export default function AdminTaxonomyPage({ variant }) {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const isDirections = variant === 'directions';

    const [loading, setLoading] = useState(true);
    const [directions, setDirections] = useState([]);
    const [projects, setProjects] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [editState, setEditState] = useState({ open: false, item: null });
    const [saving, setSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [search, setSearch] = useState('');
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const createLogoUrl = Form.useWatch('logoUrl', createForm);
    const editLogoUrl = Form.useWatch('logoUrl', editForm);

    const isValidLogoValue = (value) => {
        const v = String(value || '').trim();
        if (!v) return false;
        return /^https?:\/\//i.test(v) || v.startsWith('/');
    };

    const logoRules = [
        { required: true, message: 'Le logo est obligatoire' },
        {
            validator: (_, value) => {
                if (isValidLogoValue(value)) return Promise.resolve();
                return Promise.reject(new Error('Utilisez une URL (http/https) ou un chemin local commençant par /.'));
            },
        },
    ];

    const uploadLogoToServer = async (file, formInstance) => {
        const fd = new FormData();
        fd.append('logo', file);
        const { data } = await api.post('/events/directions/logo', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const logoUrl = data?.logoUrl || '';
        formInstance.setFieldsValue({ logoUrl });
        message.success('Logo uploadé avec succès.');
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/events/taxonomy', { params: { all: '1' } });
            setDirections(data?.directions || []);
            setProjects(data?.projects || []);
        } catch (err) {
            message.error(err?.response?.data?.error || 'Impossible de charger Directions/Projets');
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => { load(); }, [load]);

    const rawItems = isDirections ? directions : projects;

    const items = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rawItems;
        return rawItems.filter((row) =>
            (row.name || '').toLowerCase().includes(q) ||
            (row.code || '').toLowerCase().includes(q) ||
            (row.description || '').toLowerCase().includes(q));
    }, [rawItems, search]);

    const PROJECT_STATUS_LABELS = {
        ACTIVE: 'Actif',
        PAUSED: 'En pause',
        COMPLETED: 'Terminé',
    };
    const PROJECT_STATUS_COLORS = {
        ACTIVE: 'green',
        PAUSED: 'orange',
        COMPLETED: 'default',
    };

    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            setSaving(true);
            if (isDirections) {
                await api.post('/events/directions', values);
                message.success('Direction créée');
            } else {
                await api.post('/events/projects', values);
                message.success('Projet créé');
            }
            setCreateOpen(false);
            createForm.resetFields();
            load();
        } catch (err) {
            if (!err?.errorFields) {
                message.error(err?.response?.data?.error || 'Erreur création');
            }
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (item) => {
        if (isDirections) {
            navigate(`/admin/directions/${item.id}/edit`);
            return;
        }
        setEditState({ open: true, item });
        editForm.setFieldsValue({
            name: item?.name || '',
            code: item?.code || '',
            logoUrl: item?.logoUrl || '',
            description: item?.description || '',
            isActive: Boolean(item?.isActive),
        });
    };

    const handleEdit = async () => {
        if (!editState?.item?.id) return;
        try {
            const values = await editForm.validateFields();
            setSaving(true);
            if (isDirections) {
                await api.put(`/events/directions/${editState.item.id}`, values);
                message.success('Direction modifiée');
            } else {
                await api.put(`/events/projects/${editState.item.id}`, values);
                message.success('Projet modifié');
            }
            setEditState({ open: false, item: null });
            editForm.resetFields();
            load();
        } catch (err) {
            if (!err?.errorFields) {
                message.error(err?.response?.data?.error || 'Erreur modification');
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (item, checked) => {
        setSaving(true);
        try {
            if (isDirections) {
                await api.put(`/events/directions/${item.id}`, { isActive: checked });
            } else {
                await api.put(`/events/projects/${item.id}`, { isActive: checked });
            }
            message.success(`${isDirections ? 'Direction' : 'Projet'} ${checked ? 'activé' : 'désactivé'}`);
            load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur mise à jour statut');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item) => {
        setSaving(true);
        try {
            if (isDirections) {
                await api.delete(`/events/directions/${item.id}`);
                message.success('Direction supprimée');
            } else {
                await api.delete(`/events/projects/${item.id}`);
                message.success('Projet supprimé');
            }
            load();
        } catch (err) {
            const usage = err?.response?.data?.usage;
            if (usage?.total > 0) {
                message.error(
                    `${isDirections ? 'Direction' : 'Projet'} utilisé(e): ` +
                    `${usage.meetings || 0} réunion(s), ${usage.missions || 0} mission(s), ${usage.planningEvents || 0} événement(s).`
                );
            } else {
                message.error(err?.response?.data?.error || 'Erreur suppression');
            }
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: 'Nom',
            dataIndex: 'name',
            key: 'name',
            render: (v) => <Text strong>{v}</Text>,
        },
        {
            title: isDirections ? 'Logo' : 'Code',
            dataIndex: isDirections ? 'logoUrl' : 'code',
            key: isDirections ? 'logoUrl' : 'code',
            width: 180,
            render: (v) => {
                if (!isDirections) return v || '—';
                if (!v) return '—';
                return (
                    <Tooltip title={v}>
                        <img
                            src={v}
                            alt="Logo direction"
                            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee', background: '#fff' }}
                            onError={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                        />
                    </Tooltip>
                );
            },
        },
        ...(!isDirections ? [{
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            width: 150,
            render: (v) => v || '—',
        }] : []),
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (v) => v || '—',
        },
        {
            title: 'Statut',
            key: 'isActive',
            width: 140,
            render: (_, record) => (
                isDirections ? (
                    <Space>
                        <Switch
                            checked={Boolean(record.isActive)}
                            loading={saving}
                            onChange={(checked) => toggleActive(record, checked)}
                        />
                        <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Actif' : 'Inactif'}</Tag>
                    </Space>
                ) : (
                    <Space direction="vertical" size={4}>
                        <Tag color={PROJECT_STATUS_COLORS[record.status] || 'default'}>
                            {PROJECT_STATUS_LABELS[record.status] || record.status || '-'}
                        </Tag>
                        <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Actif' : 'Inactif'}</Tag>
                    </Space>
                )
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: isDirections ? 260 : 150,
            render: (_, record) => (
                <Space>
                    {isDirections && (
                        <Button size="small" onClick={() => navigate(`/admin/directions/${record.id}`)}>
                            Détails
                        </Button>
                    )}
                    <Tooltip title="Modifier">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Popconfirm
                        title={`Supprimer ${isDirections ? 'cette direction' : 'ce projet'} ?`}
                        description="Suppression possible seulement si non utilisé."
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true, loading: saving }}
                        onConfirm={() => handleDelete(record)}
                    >
                        <Tooltip title="Supprimer">
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={isDirections ? 'Directions organisationnelles' : 'Projets'}
                description={(
                    <>
                        {isDirections
                            ? 'Les directions classent les réunions, missions et événements. Utilisez un code court pour les filtres et exports.'
                            : 'Les projets regroupent les activités transverses. Vous pouvez les activer ou les désactiver sans supprimer l’historique.'}
                        {' '}
                        <Link to={isDirections ? '/admin/projects' : '/admin/directions'}>
                            {isDirections ? 'Gérer les projets →' : '← Gérer les directions'}
                        </Link>
                    </>
                )}
            />

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle">
                <Col xs={24} md={14}>
                    <Input.Search
                        allowClear
                        placeholder="Filtrer par nom, code ou description…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: 420 }}
                    />
                </Col>
                <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                    <Button
                        type="primary"
                        icon={isDirections ? <ApartmentOutlined /> : <ProjectOutlined />}
                        onClick={() => { setCreateOpen(true); createForm.resetFields(); }}
                    >
                        {isDirections ? 'Nouvelle direction' : 'Nouveau projet'}
                    </Button>
                </Col>
            </Row>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
            ) : isMobile ? (
                <List
                    dataSource={items}
                    rowKey="id"
                    locale={{ emptyText: isDirections ? 'Aucune direction' : 'Aucun projet' }}
                    renderItem={(record) => (
                        <List.Item style={{ padding: 0, marginBottom: 10 }}>
                            <Card size="small" style={{ width: '100%' }}>
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                    <Text strong>{record.name}</Text>
                                    <Space wrap>
                                        {!isDirections && (
                                            <Tag color={PROJECT_STATUS_COLORS[record.status] || 'default'}>
                                                {PROJECT_STATUS_LABELS[record.status] || record.status || '-'}
                                            </Tag>
                                        )}
                                        <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Actif' : 'Inactif'}</Tag>
                                        {!!record.code && <Tag>{record.code}</Tag>}
                                    </Space>
                                    <Text type="secondary">{record.description || '—'}</Text>
                                    {isDirections && record.logoUrl && (
                                        <img
                                            src={record.logoUrl}
                                            alt="Logo"
                                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0' }}
                                        />
                                    )}
                                    <Space wrap>
                                        {isDirections && (
                                            <Button size="small" onClick={() => navigate(`/admin/directions/${record.id}`)}>
                                                Détails
                                            </Button>
                                        )}
                                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                                            Modifier
                                        </Button>
                                        <Popconfirm
                                            title={`Supprimer ${isDirections ? 'cette direction' : 'ce projet'} ?`}
                                            description="Suppression possible seulement si non utilisé."
                                            okText="Supprimer"
                                            cancelText="Annuler"
                                            okButtonProps={{ danger: true, loading: saving }}
                                            onConfirm={() => handleDelete(record)}
                                        >
                                            <Button size="small" danger icon={<DeleteOutlined />}>Supprimer</Button>
                                        </Popconfirm>
                                    </Space>
                                </Space>
                            </Card>
                        </List.Item>
                    )}
                />
            ) : (
                <Table
                    rowKey="id"
                    size="middle"
                    columns={columns}
                    dataSource={items}
                    pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `${t} ${isDirections ? 'direction(s)' : 'projet(s)'}` }}
                    scroll={{ x: 'max-content' }}
                />
            )}

            <Modal
                title={isDirections ? 'Créer une direction' : 'Créer un projet'}
                open={createOpen}
                onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
                onOk={handleCreate}
                okText="Créer"
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Champ requis' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="code" label="Code">
                        <Input placeholder="Ex. DIR-RH" />
                    </Form.Item>
                    {isDirections && (
                        <Form.Item
                            name="logoUrl"
                            label="Logo (URL)"
                            rules={logoRules}
                            extra="Formats acceptés : https://... ou /uploads/... ou /logo.png"
                        >
                            <Input placeholder="https://exemple.com/logo.png ou /uploads/branding/logo.png" />
                        </Form.Item>
                    )}
                    {isDirections && (
                        <Form.Item label="Ou importer un logo (image)">
                            <Upload
                                showUploadList={false}
                                accept="image/*"
                                customRequest={async ({ file, onSuccess, onError }) => {
                                    try {
                                        setLogoUploading(true);
                                        await uploadLogoToServer(file, createForm);
                                        onSuccess?.('ok');
                                    } catch (err) {
                                        message.error(err?.response?.data?.error || "Erreur lors de l'upload du logo.");
                                        onError?.(err);
                                    } finally {
                                        setLogoUploading(false);
                                    }
                                }}
                            >
                                <Button icon={<UploadOutlined />} loading={logoUploading}>
                                    Déposer / sélectionner une image
                                </Button>
                            </Upload>
                        </Form.Item>
                    )}
                    {isDirections && (
                        <Form.Item label="Aperçu du logo">
                            {isValidLogoValue(createLogoUrl) ? (
                                <img
                                    src={String(createLogoUrl).trim()}
                                    alt="Aperçu logo direction"
                                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0', background: '#fff' }}
                                    onError={(e) => { e.currentTarget.style.opacity = '0.35'; }}
                                />
                            ) : (
                                <Text type="secondary">Saisissez une URL ou un chemin local valide pour prévisualiser.</Text>
                            )}
                        </Form.Item>
                    )}
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={isDirections ? 'Modifier la direction' : 'Modifier le projet'}
                open={editState.open}
                onCancel={() => { setEditState({ open: false, item: null }); editForm.resetFields(); }}
                onOk={handleEdit}
                okText="Enregistrer"
                confirmLoading={saving}
                destroyOnClose
            >
                {!isDirections && (
                <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Champ requis' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="code" label="Code">
                        <Input />
                    </Form.Item>
                    {isDirections && (
                        <Form.Item
                            name="logoUrl"
                            label="Logo (URL)"
                            rules={logoRules}
                            extra="Formats acceptés : https://... ou /uploads/... ou /logo.png"
                        >
                            <Input />
                        </Form.Item>
                    )}
                    {isDirections && (
                        <Form.Item label="Ou importer un logo (image)">
                            <Upload
                                showUploadList={false}
                                accept="image/*"
                                customRequest={async ({ file, onSuccess, onError }) => {
                                    try {
                                        setLogoUploading(true);
                                        await uploadLogoToServer(file, editForm);
                                        onSuccess?.('ok');
                                    } catch (err) {
                                        message.error(err?.response?.data?.error || "Erreur lors de l'upload du logo.");
                                        onError?.(err);
                                    } finally {
                                        setLogoUploading(false);
                                    }
                                }}
                            >
                                <Button icon={<UploadOutlined />} loading={logoUploading}>
                                    Déposer / sélectionner une image
                                </Button>
                            </Upload>
                        </Form.Item>
                    )}
                    {isDirections && (
                        <Form.Item label="Aperçu du logo">
                            {isValidLogoValue(editLogoUrl) ? (
                                <img
                                    src={String(editLogoUrl).trim()}
                                    alt="Aperçu logo direction"
                                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0', background: '#fff' }}
                                    onError={(e) => { e.currentTarget.style.opacity = '0.35'; }}
                                />
                            ) : (
                                <Text type="secondary">Saisissez une URL ou un chemin local valide pour prévisualiser.</Text>
                            )}
                        </Form.Item>
                    )}
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Actif" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
                )}
            </Modal>
        </div>
    );
}
