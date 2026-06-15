import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Tag, Button, Space, Descriptions, List, Upload, Popconfirm, App, Spin, Alert } from 'antd';
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
    MessageOutlined,
    UserOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PDF_ACCEPT, isAcceptedPdfFile } from '../utils/pdfAttachment';
import { resolveImageSrc } from '../utils/mediaUrl';
import { canManageProjects, isResponsable } from '../utils/roles';
import { isUserProjectResponsible } from '../utils/projectScope';
import { useResponsibleProjectScope } from '../hooks/useResponsibleProjectScope';

const { Title, Text } = Typography;
const STATUS_COLORS = { ACTIVE: 'success', PAUSED: 'warning', COMPLETED: 'default' };
const STATUS_LABELS = { ACTIVE: 'Actif', PAUSED: 'En pause', COMPLETED: 'Terminé' };

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { message } = App.useApp();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const canManage = canManageProjects(user?.role);
    const isResponsible = isUserProjectResponsible(user, project);
    const canCreateOnProject = isResponsible && project?.status === 'ACTIVE';
    const { hasMultipleProjects } = useResponsibleProjectScope(user, { enabled: isResponsable(user?.role) });

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
        if (!isAcceptedPdfFile(file)) {
            message.error('Seuls les fichiers PDF (.pdf) sont acceptés.');
            onError?.(new Error('not pdf'));
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.post(`/projects/${id}/files`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('PDF ajouté');
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
                {isResponsible && (
                    <Button icon={<MessageOutlined />} onClick={() => navigate('/discussions?channel=project')}>
                        Messagerie du projet
                    </Button>
                )}
                {canCreateOnProject && (
                    <>
                        <Button
                            type="primary"
                            icon={<TeamOutlined />}
                            onClick={() => navigate(`/meetings/new?projectId=${project.id}`)}
                        >
                            Nouvelle réunion
                        </Button>
                        <Button
                            icon={<FlagOutlined />}
                            onClick={() => navigate(`/missions/new?projectId=${project.id}`)}
                        >
                            Nouvelle mission
                        </Button>
                    </>
                )}
                {canManage && (
                    <Button icon={<EditOutlined />} onClick={() => navigate(`/projects/${id}/edit`)}>
                        Modifier le projet
                    </Button>
                )}
                {canManage && project.status !== 'COMPLETED' && (
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
                {canManage && project.status !== 'COMPLETED' && (
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
                {canManage && project.status !== 'ACTIVE' && (
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
                {canManage && (
                    <Popconfirm
                        title="Supprimer ce projet ?"
                        description="Les missions et réunions liées seront détachées."
                        okText="Supprimer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                        onConfirm={handleDelete}
                    >
                        <Button danger icon={<DeleteOutlined />}>Supprimer le projet</Button>
                    </Popconfirm>
                )}
            </Space>

            {isResponsible && hasMultipleProjects && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Vous gérez plusieurs projets"
                    description="Les réunions et missions créées depuis cette fiche seront rattachées à ce projet. Pour un autre projet, utilisez la liste Mes projets."
                />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                {resolveImageSrc(project.logoUrl) ? (
                    <img
                        src={resolveImageSrc(project.logoUrl) || ''}
                        alt={`Logo ${project.name}`}
                        style={{
                            width: 64,
                            height: 64,
                            objectFit: 'contain',
                            borderRadius: 12,
                            border: '1px solid #f0f0f0',
                            background: '#fafafa',
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 12,
                            background: '#e6f4ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <ProjectOutlined style={{ fontSize: 28, color: '#1565C0' }} />
                    </div>
                )}
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        {project.name}
                    </Title>
                    <Space size={8} style={{ marginTop: 8 }} wrap>
                        <Tag color={STATUS_COLORS[project.status] || 'default'}>
                            {STATUS_LABELS[project.status] || project.status}
                        </Tag>
                        {project.responsible ? (
                            <Tag icon={<UserOutlined />} color="green">
                                Responsable : {project.responsible.name}
                            </Tag>
                        ) : (
                            <Tag color="default">Responsable non défini</Tag>
                        )}
                        {project.consolidator ? (
                            <Tag icon={<UserOutlined />} color="purple">
                                Consolidateur : {project.consolidator.name}
                            </Tag>
                        ) : (
                            <Tag color="default">Consolidateur non défini</Tag>
                        )}
                    </Space>
                </div>
            </div>

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
                    <Descriptions.Item label="Responsable">
                        {project.responsible ? (
                            <Space direction="vertical" size={0}>
                                <Text strong>
                                    <UserOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                                    {project.responsible.name}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {project.responsible.email}
                                    {project.responsible.role ? ` · ${project.responsible.role}` : ''}
                                </Text>
                            </Space>
                        ) : (
                            <Text type="secondary">Non défini — à configurer par l&apos;administration</Text>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Consolidateur">
                        {project.consolidator ? (
                            <Space direction="vertical" size={0}>
                                <Text strong>
                                    <UserOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                                    {project.consolidator.name}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {project.consolidator.email}
                                    {project.consolidator.role ? ` · ${project.consolidator.role}` : ''}
                                </Text>
                            </Space>
                        ) : (
                            <Text type="secondary">Non défini — à configurer par l&apos;administration</Text>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Coordinateur">
                        {project.coordinator ? (
                            <Space direction="vertical" size={0}>
                                <Text strong>
                                    <UserOutlined style={{ marginRight: 6, color: '#13c2c2' }} />
                                    {project.coordinator.name}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {project.coordinator.email}
                                    {project.coordinator.role ? ` · ${project.coordinator.role}` : ''}
                                </Text>
                            </Space>
                        ) : (
                            <Text type="secondary">Non défini</Text>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">
                        {project.description || <Text type="secondary">—</Text>}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <Card
                title={<><FlagOutlined style={{ marginRight: 6 }} />Missions ({project._count?.missions || 0})</>}
                style={{ marginBottom: 16 }}
                extra={canCreateOnProject && (
                    <Button
                        size="small"
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={() => navigate(`/missions/new?projectId=${project.id}`)}
                    >
                        Ajouter une mission
                    </Button>
                )}
            >
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

            <Card
                title={<><TeamOutlined style={{ marginRight: 6 }} />Réunions ({project._count?.meetings || 0})</>}
                style={{ marginBottom: 16 }}
                extra={canCreateOnProject && (
                    <Button
                        size="small"
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={() => navigate(`/meetings/new?projectId=${project.id}`)}
                    >
                        Ajouter une réunion
                    </Button>
                )}
            >
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
                title={<><FileAddOutlined style={{ marginRight: 6 }} />Pièces jointes PDF ({project._count?.files || 0})</>}
                extra={
                    canManage && project.status !== 'COMPLETED' && (
                        <Upload showUploadList={false} accept={PDF_ACCEPT} customRequest={handleUpload} disabled={uploading}>
                            <Button size="small" icon={<UploadOutlined />} loading={uploading}>Ajouter un PDF</Button>
                        </Upload>
                    )
                }
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                    Uniquement des documents PDF (max. 20 Mo).
                </Text>
                {project.files?.length > 0 ? (
                    <List
                        size="small"
                        dataSource={project.files}
                        renderItem={(f) => (
                            <List.Item
                                actions={[
                                    canManage && project.status !== 'COMPLETED' && (
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
                                    avatar={<FileTextOutlined style={{ color: '#1565C0', fontSize: 18 }} />}
                                    title={<a href={`${API_BASE}${f.fileUrl}`} target="_blank" rel="noopener noreferrer">{f.fileName}</a>}
                                    description={`${f.uploadedBy?.name || 'Utilisateur'} · ${new Date(f.createdAt).toLocaleString('fr-FR')}`}
                                />
                            </List.Item>
                        )}
                    />
                ) : <Text type="secondary">Aucun fichier</Text>}
            </Card>

        </div>
    );
}

