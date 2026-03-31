import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Tag, Button, Space, Descriptions, List, Upload, Popconfirm, App, Spin, Modal, Form, Input, Switch } from 'antd';
import {
    ArrowLeftOutlined,
    ProjectOutlined,
    FlagOutlined,
    TeamOutlined,
    FileAddOutlined,
    FileTextOutlined,
    UploadOutlined,
    DeleteOutlined,
    EditOutlined,
    PauseCircleOutlined,
    CheckCircleOutlined,
    StopOutlined,
} from '@ant-design/icons';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const STATUS_COLORS = { ACTIVE: 'success', PAUSED: 'warning', COMPLETED: 'default' };
const STATUS_LABELS = { ACTIVE: 'Actif', PAUSED: 'En pause', COMPLETED: 'Terminé' };
const CAN_EDIT = ['ADMIN', 'SUPER_ADMIN', 'DG'];

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { message } = App.useApp();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [form] = Form.useForm();

    const canEdit = CAN_EDIT.includes(user?.role);
    const canManageStatus = project && (canEdit || user?.role === 'RESPONSABLE' || project.createdById === user?.id);
    const canUploadFiles = project && project.status !== 'COMPLETED' && (
        canEdit || user?.role === 'RESPONSABLE' || project.createdById === user?.id
    );

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
        } catch (err) {
            message.error(err?.response?.data?.error || 'Projet introuvable');
            navigate('/projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const handleUpload = async ({ file, onSuccess, onError }) => {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.post(`/projects/${id}/files`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('Fichier ajouté');
            onSuccess?.('ok');
            load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur upload');
            onError?.(err);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        try {
            await api.delete(`/projects/${id}/files/${fileId}`);
            message.success('Fichier supprimé');
            load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur suppression fichier');
        }
    };

    const openEdit = () => {
        form.setFieldsValue({
            name: project.name,
            code: project.code || '',
            description: project.description || '',
            isActive: Boolean(project.isActive),
        });
        setEditOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await api.put(`/projects/${id}`, values);
            message.success('Projet mis à jour');
            setEditOpen(false);
            load();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.error || 'Erreur sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleStatus = async (status) => {
        try {
            await api.put(`/projects/${id}/status`, { status });
            message.success(`Projet mis à jour : ${STATUS_LABELS[status] || status}`);
            load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur mise à jour statut');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/projects/${id}`);
            message.success('Projet supprimé');
            navigate('/projects');
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur suppression');
        }
    };

    if (loading || !project) {
        return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
                    Retour aux projets
                </Button>
                {canEdit && (
                    <Popconfirm
                        title="Ouvrir l'édition du projet ?"
                        okText="Oui"
                        cancelText="Annuler"
                        onConfirm={openEdit}
                    >
                        <Button icon={<EditOutlined />}>
                            Modifier
                        </Button>
                    </Popconfirm>
                )}
                {canManageStatus && project.status !== 'COMPLETED' && (
                    <Popconfirm
                        title="Mettre ce projet en pause ?"
                        okText="Confirmer"
                        cancelText="Annuler"
                        onConfirm={() => handleStatus('PAUSED')}
                    >
                        <Button icon={<PauseCircleOutlined />}>
                            Mettre en pause
                        </Button>
                    </Popconfirm>
                )}
                {canManageStatus && project.status !== 'COMPLETED' && (
                    <Popconfirm
                        title="Terminer ce projet ?"
                        description="Un projet terminé ne sera plus sélectionnable pour les missions/réunions."
                        okText="Terminer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleStatus('COMPLETED')}
                    >
                        <Button icon={<CheckCircleOutlined />}>
                            Terminer
                        </Button>
                    </Popconfirm>
                )}
                {canManageStatus && project.status !== 'ACTIVE' && (
                    <Popconfirm
                        title="Réactiver ce projet ?"
                        okText="Réactiver"
                        cancelText="Annuler"
                        onConfirm={() => handleStatus('ACTIVE')}
                    >
                        <Button icon={<StopOutlined />}>
                            Réactiver
                        </Button>
                    </Popconfirm>
                )}
                {canEdit && (
                    <Popconfirm
                        title="Supprimer ce projet ?"
                        description="Les missions et réunions liées seront détachées."
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                        onConfirm={handleDelete}
                    >
                        <Button danger icon={<DeleteOutlined />}>Supprimer</Button>
                    </Popconfirm>
                )}
                <Title level={3} style={{ margin: 0 }}>
                    <ProjectOutlined style={{ marginRight: 8 }} />
                    {project.name}
                </Title>
            </Space>

            <Card style={{ marginBottom: 16 }}>
                <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Code">{project.code ? <Tag>{project.code}</Tag> : '—'}</Descriptions.Item>
                    <Descriptions.Item label="Statut">
                        <Tag color={STATUS_COLORS[project.status] || 'default'}>
                            {STATUS_LABELS[project.status] || project.status}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Créateur">
                        {project.createdBy?.name || project.createdBy?.email || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">
                        {project.description || <Text type="secondary">—</Text>}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title={<><FlagOutlined style={{ marginRight: 6 }} />Missions ({project._count?.missions || 0})</>} style={{ marginBottom: 16 }}>
                {project.missions?.length > 0 ? (
                    <List
                        size="small"
                        dataSource={project.missions}
                        renderItem={(m) => (
                            <List.Item onClick={() => navigate(`/missions/${m.id}`)} style={{ cursor: 'pointer' }}>
                                <Text>{m.title}</Text>
                            </List.Item>
                        )}
                    />
                ) : <Text type="secondary">Aucune mission</Text>}
            </Card>

            <Card title={<><TeamOutlined style={{ marginRight: 6 }} />Réunions ({project._count?.meetings || 0})</>} style={{ marginBottom: 16 }}>
                {project.meetings?.length > 0 ? (
                    <List
                        size="small"
                        dataSource={project.meetings}
                        renderItem={(m) => (
                            <List.Item onClick={() => navigate(`/meetings/${m.id}`)} style={{ cursor: 'pointer' }}>
                                <Text>{m.title}</Text>
                            </List.Item>
                        )}
                    />
                ) : <Text type="secondary">Aucune réunion</Text>}
            </Card>

            <Card
                title={<><FileAddOutlined style={{ marginRight: 6 }} />Fichiers ({project._count?.files || 0})</>}
                extra={
                    canUploadFiles && (
                        <Upload showUploadList={false} customRequest={handleUpload} disabled={uploading}>
                            <Button size="small" icon={<UploadOutlined />} loading={uploading}>Ajouter</Button>
                        </Upload>
                    )
                }
            >
                {project.files?.length > 0 ? (
                    <List
                        size="small"
                        dataSource={project.files}
                        renderItem={(f) => (
                            <List.Item
                                actions={[
                                    canUploadFiles && (
                                        <Popconfirm
                                            key="delete"
                                            title="Supprimer ce fichier ?"
                                            okText="Supprimer"
                                            cancelText="Annuler"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={() => handleDeleteFile(f.id)}
                                        >
                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    ),
                                ].filter(Boolean)}
                            >
                                <List.Item.Meta
                                    avatar={<FileTextOutlined style={{ color: '#1677ff', fontSize: 18 }} />}
                                    title={<a href={`${API_BASE}${f.fileUrl}`} target="_blank" rel="noopener noreferrer">{f.fileName}</a>}
                                    description={`${f.uploadedBy?.name || 'Utilisateur'} · ${new Date(f.createdAt).toLocaleString('fr-FR')}`}
                                />
                            </List.Item>
                        )}
                    />
                ) : <Text type="secondary">Aucun fichier</Text>}
            </Card>

            <Modal
                open={editOpen}
                title="Modifier le projet"
                onCancel={() => setEditOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                okText="Enregistrer"
                cancelText="Annuler"
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="name" label="Nom du projet" rules={[{ required: true, message: 'Requis' }]}>
                        <Input maxLength={120} />
                    </Form.Item>
                    <Form.Item name="code" label="Code (optionnel)">
                        <Input maxLength={30} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} maxLength={500} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Actif" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

