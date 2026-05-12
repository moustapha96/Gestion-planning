import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Typography,
    Button,
    Space,
    Descriptions,
    List,
    Spin,
    App,
    Popconfirm,
    Upload,
    Image,
    Tag,
    Tooltip,
} from 'antd';
import {
    ArrowLeftOutlined,
    EnvironmentOutlined,
    EditOutlined,
    DeleteOutlined,
    FlagOutlined,
    UserOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    PaperClipOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin } from '../utils/roles';
import { PDF_ACCEPT, isAcceptedPdfFile } from '../utils/pdfAttachment';

const { Text } = Typography;
const MAX_FILE_SIZE = 15 * 1024 * 1024;

export default function MissionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { message } = App.useApp();
    const [mission, setMission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);

    const fetchMission = async () => {
        try {
            const res = await api.get(`/missions/${id}`);
            setMission(res.data);
        } catch {
            message.error('Mission introuvable');
            navigate('/missions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMission();
    }, [id]);

    const isCreator = mission?.createdById === user?.id;
    const isAdmin = isPrivilegedAdmin(user?.role);
    const canEdit = (isCreator || isAdmin) && mission?.status !== 'CANCELLED';
    const canUpload = mission?.status !== 'CANCELLED' && (
        isCreator ||
        isAdmin ||
        mission?.assignments?.some((a) => a.userId === user?.id)
    );

    const handleCancelMission = async () => {
        setCancelLoading(true);
        try {
            await api.delete(`/missions/${id}`);
            message.success('Mission annulée');
            navigate('/missions');
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setCancelLoading(false);
        }
    };

    const handleUpload = async ({ file, onSuccess, onError }) => {
        if (file.size > MAX_FILE_SIZE) {
            message.error('Fichier trop volumineux (max 15 Mo)');
            onError(new Error('too large'));
            return;
        }
        if (!isAcceptedPdfFile(file)) {
            message.error('Seuls les fichiers PDF (.pdf) sont acceptés.');
            onError(new Error('not pdf'));
            return;
        }
        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('kind', 'DOCUMENT');
            await api.post(`/missions/${id}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('PDF ajouté');
            onSuccess('ok');
            await fetchMission();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de l\'upload');
            onError(err);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        try {
            await api.delete(`/missions/${id}/files/${fileId}`);
            message.success('Fichier supprimé');
            await fetchMission();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    if (loading || !mission) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" />
            </div>
        );
    }

    const images = (mission.files || []).filter((f) => f.kind === 'IMAGE');
    const documents = (mission.files || []).filter((f) => f.kind !== 'IMAGE');

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/missions')}>
                    Retour aux missions
                </Button>
            </div>

            <Card
                title={
                    <Space>
                        <FlagOutlined style={{ color: '#722ed1' }} />
                        {mission.title}
                    </Space>
                }
                extra={
                    canEdit && (
                        <Space>
                            <Button icon={<EditOutlined />} onClick={() => navigate(`/missions/${id}/edit`)}>
                                Modifier
                            </Button>
                            <Popconfirm
                                title="Annuler cette mission ?"
                                onConfirm={handleCancelMission}
                                okText="Oui, annuler"
                                cancelText="Non"
                                okButtonProps={{ danger: true, loading: cancelLoading }}
                            >
                                <Button danger icon={<DeleteOutlined />}>
                                    Annuler la mission
                                </Button>
                            </Popconfirm>
                        </Space>
                    )
                }
            >
                {mission.status === 'CANCELLED' && (
                    <Text type="danger" strong style={{ display: 'block', marginBottom: 16 }}>
                        Cette mission a été annulée.
                    </Text>
                )}
                <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label={<><EnvironmentOutlined /> Lieu</>}>
                        {mission.location}
                    </Descriptions.Item>
                    <Descriptions.Item label="Début">
                        {mission.startTime
                            ? dayjs(mission.startTime).format('dddd D MMMM YYYY à HH:mm')
                            : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Fin">
                        {mission.endTime
                            ? dayjs(mission.endTime).format('dddd D MMMM YYYY à HH:mm')
                            : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Créée par">
                        {mission.createdBy?.name} ({mission.createdBy?.email})
                    </Descriptions.Item>
                    <Descriptions.Item label="Direction">
                        {mission.direction?.name ? (
                            <Tag color="purple">{mission.direction.code ? `${mission.direction.name} (${mission.direction.code})` : mission.direction.name}</Tag>
                        ) : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Projet">
                        {mission.project?.name ? (
                            <Tag color="blue">{mission.project.code ? `${mission.project.name} (${mission.project.code})` : mission.project.name}</Tag>
                        ) : '—'}
                    </Descriptions.Item>
                    {mission.description && (
                        <Descriptions.Item label="Description">
                            <Text>{mission.description}</Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                <Card type="inner" title="Intervenants assignés" style={{ marginTop: 24 }}>
                    {mission.assignments?.length ? (
                        <List
                            dataSource={mission.assignments}
                            renderItem={(a) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<UserOutlined />}
                                        title={a.user?.name}
                                        description={a.user?.email}
                                    />
                                </List.Item>
                            )}
                        />
                    ) : (
                        <Text type="secondary">Aucun intervenant assigné.</Text>
                    )}
                </Card>

                {/* Section fichiers */}
                <Card
                    type="inner"
                    title={<Space><PaperClipOutlined /> Pièces jointes (PDF)</Space>}
                    style={{ marginTop: 24 }}
                    extra={
                        canUpload && (
                            <Upload
                                showUploadList={false}
                                accept={PDF_ACCEPT}
                                customRequest={handleUpload}
                            >
                                <Button
                                    size="small"
                                    icon={<FilePdfOutlined />}
                                    loading={uploadLoading}
                                >
                                    Ajouter un PDF
                                </Button>
                            </Upload>
                        )
                    }
                >
                    {/* Galerie images */}
                    {images.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Images ({images.length})
                            </Text>
                            <Image.PreviewGroup>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {images.map((f) => (
                                        <div key={f.id} style={{ position: 'relative' }}>
                                            <Image
                                                src={`${API_BASE}${f.fileUrl}`}
                                                alt={f.fileName}
                                                width={120}
                                                height={90}
                                                style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
                                            />
                                            <div style={{ fontSize: 11, color: '#888', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {f.fileName}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#aaa' }}>
                                                {f.uploadedBy?.name}
                                            </div>
                                            {(f.uploadedById === user?.id || isAdmin) && (
                                                <Popconfirm
                                                    title="Supprimer cette image ?"
                                                    onConfirm={() => handleDeleteFile(f.id)}
                                                    okText="Supprimer"
                                                    cancelText="Annuler"
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <Tooltip title="Supprimer">
                                                        <Button
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            style={{ marginTop: 4, width: 120 }}
                                                        />
                                                    </Tooltip>
                                                </Popconfirm>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Image.PreviewGroup>
                        </div>
                    )}

                    {/* Liste documents */}
                    {documents.length > 0 && (
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Fichiers PDF ({documents.length})
                            </Text>
                            <List
                                size="small"
                                dataSource={documents}
                                renderItem={(f) => (
                                    <List.Item
                                        actions={[
                                            (f.uploadedById === user?.id || isAdmin) && (
                                                <Popconfirm
                                                    key="del"
                                                    title="Supprimer ce fichier ?"
                                                    onConfirm={() => handleDeleteFile(f.id)}
                                                    okText="Supprimer"
                                                    cancelText="Annuler"
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            ),
                                        ].filter(Boolean)}
                                    >
                                        <List.Item.Meta
                                            avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1565C0' }} />}
                                            title={
                                                <a
                                                    href={`${API_BASE}${f.fileUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {f.fileName}
                                                </a>
                                            }
                                            description={
                                                <Space size={4}>
                                                    <Tag color="blue">PDF</Tag>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {f.uploadedBy?.name} · {dayjs(f.createdAt).format('D MMM YYYY HH:mm')}
                                                    </Text>
                                                    {f.size && (
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            · {(f.size / 1024).toFixed(0)} Ko
                                                        </Text>
                                                    )}
                                                </Space>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        </div>
                    )}

                    {images.length === 0 && documents.length === 0 && (
                        <Text type="secondary">Aucune pièce jointe. Les nouveaux fichiers doivent être au format PDF.</Text>
                    )}
                </Card>
            </Card>
        </div>
    );
}
