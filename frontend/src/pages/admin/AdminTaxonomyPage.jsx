import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Table, Tag, Button, Typography, Space, Modal, Form, Input, Popconfirm, App, Tooltip, Row, Col, Spin, Switch, Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined, ProjectOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const { Text } = Typography;

/**
 * Gestion admin des directions OU des projets (taxonomie événements).
 * @param {{ variant: 'directions' | 'projects' }} props
 */
export default function AdminTaxonomyPage({ variant }) {
    const { message } = App.useApp();
    const isDirections = variant === 'directions';

    const [loading, setLoading] = useState(true);
    const [directions, setDirections] = useState([]);
    const [projects, setProjects] = useState([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [editState, setEditState] = useState({ open: false, item: null });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

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
        setEditState({ open: true, item });
        editForm.setFieldsValue({
            name: item?.name || '',
            code: item?.code || '',
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
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            width: 150,
            render: (v) => v || '—',
        },
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
                <Space>
                    <Switch
                        checked={Boolean(record.isActive)}
                        loading={saving}
                        onChange={(checked) => toggleActive(record, checked)}
                    />
                    <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Actif' : 'Inactif'}</Tag>
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space>
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
                <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Champ requis' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="code" label="Code">
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Actif" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
