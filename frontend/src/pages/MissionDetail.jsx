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
    Modal,
    Form,
    Select,
    Alert,
} from 'antd';
import {
    ArrowLeftOutlined,
    EnvironmentOutlined,
    EditOutlined,
    DeleteOutlined,
    FlagOutlined,
    UserOutlined,
    UserAddOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    PaperClipOutlined,
    RollbackOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { API_BASE } from '../api/client';
import ValidationWorkflowBanner from '../components/ValidationWorkflowBanner';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin, canManageMission, canEditMission, canPrivilegedForceDelete } from '../utils/roles';
import {
    canConsolidateMission,
    canCoordinateMission,
    canFinalizeMission,
    canApproveMission,
    isPendingCoordinatorStatus,
    isPendingConsolidatorStatus,
    missionNeedsConsolidatorApproval,
} from '../utils/roles';
import { forceDeleteDescription, forceDeleteTitle } from '../utils/deleteConfirm';
import ForceDeletePopconfirm from '../components/ForceDeletePopconfirm';
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
    const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(false);
    const [reactivateLoading, setReactivateLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [addVisible, setAddVisible] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [addForm] = Form.useForm();
    const [addParticipantsLoading, setAddParticipantsLoading] = useState(false);
    const [approveLoading, setApproveLoading] = useState(false);

    const fetchMission = async () => {
        try {
            const res = await api.get(`/missions/${id}`);
            setMission(res.data);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 403) {
                message.error('Vous n\'avez pas accès à cette mission');
            } else if (status === 404) {
                message.error('Mission introuvable');
            } else {
                message.error(err?.response?.data?.error || 'Impossible de charger la mission');
            }
            navigate('/missions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMission();
    }, [id]);

    const isCreator = mission?.createdById === user?.id;
    const needsCoordinator = missionNeedsConsolidatorApproval(mission) && mission?.status === 'DRAFT';
    const needsConsolidator = isPendingConsolidatorStatus(mission?.status);
    const needsFinalApproval = isPendingCoordinatorStatus(mission?.status);
    const canManage = canManageMission(mission, user);
    const canEdit = canEditMission(mission, user);
    const canForceDelete = canPrivilegedForceDelete(user?.role);
    const canCoordinate = canCoordinateMission(mission, user);
    const canConsolidate = canConsolidateMission(mission, user);
    const canFinalize = canFinalizeMission(mission, user);
    const canApproveDirect = canApproveMission(mission, user) && needsCoordinator && !canCoordinate;
    const isAdmin = isPrivilegedAdmin(user?.role);
    const canUpload = mission?.status !== 'CANCELLED' && (
        mission?.createdById === user?.id ||
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

    const handleReactivateMission = async () => {
        setReactivateLoading(true);
        try {
            await api.put(`/missions/${id}`, { status: 'CONFIRMED' });
            message.success('Mission réactivée');
            await fetchMission();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setReactivateLoading(false);
        }
    };

    const openAddParticipants = async () => {
        setAddVisible(true);
        if (allUsers.length === 0) {
            try {
                const res = await api.get('/users/participants');
                setAllUsers(res.data || []);
            } catch {
                message.error('Impossible de charger la liste des utilisateurs');
            }
        }
    };

    const handleAddParticipants = async () => {
        setAddParticipantsLoading(true);
        try {
            const v = await addForm.validateFields();
            const ids = v.userIds || [];
            if (!ids.length) {
                message.warning('Sélectionnez au moins un intervenant');
                return;
            }
            await api.post(`/missions/${id}/participants`, { userIds: ids });
            message.success('Intervenants ajoutés et notifiés');
            setAddVisible(false);
            addForm.resetFields();
            await fetchMission();
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.error || 'Erreur lors de l\'ajout d\'intervenants');
        } finally {
            setAddParticipantsLoading(false);
        }
    };

    const handlePermanentDelete = async () => {
        setPermanentDeleteLoading(true);
        try {
            await api.delete(`/missions/${id}?permanent=1`);
            message.success('Mission supprimée définitivement');
            navigate('/missions');
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setPermanentDeleteLoading(false);
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

    const handleApprove = async (mode = 'approve') => {
        setApproveLoading(true);
        try {
            if (mode === 'coordinate' || mode === 'finalize') {
                await api.put(`/missions/${id}/approve-coordinator`);
                message.success(
                    mode === 'finalize'
                        ? 'Mission validée et confirmée'
                        : 'Mission validée par le coordinateur — transmise au rôle Consolidateur',
                );
            } else if (mode === 'consolidate') {
                await api.put(`/missions/${id}/approve`);
                message.success('Mission consolidée et confirmée');
            } else {
                await api.put(`/missions/${id}/approve`);
                message.success('Mission validée et confirmée');
            }
            await fetchMission();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de la validation');
        } finally {
            setApproveLoading(false);
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
            <Space style={{ marginBottom: 24 }} wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/missions')}>
                    Retour aux missions
                </Button>
                {canEdit && (
                    <Button icon={<EditOutlined />} onClick={() => navigate(`/missions/${id}/edit`)}>
                        Modifier la mission
                    </Button>
                )}
                {canCoordinate && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('coordinate')} loading={approveLoading}>
                        Valider (coordinateur)
                    </Button>
                )}
                {canConsolidate && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('consolidate')} loading={approveLoading}>
                        Consolider et confirmer
                    </Button>
                )}
                {canFinalize && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('finalize')} loading={approveLoading}>
                        Valider et confirmer
                    </Button>
                )}
                {canApproveDirect && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove('approve')} loading={approveLoading}>
                        Valider et confirmer
                    </Button>
                )}
                {canManage && mission.status === 'CANCELLED' && isAdmin && (
                    <Button
                        icon={<RollbackOutlined />}
                        loading={reactivateLoading}
                        onClick={handleReactivateMission}
                    >
                        Réactiver la mission
                    </Button>
                )}
                {canManage && mission.status !== 'CANCELLED' && (
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
                )}
                {canForceDelete && (
                    <ForceDeletePopconfirm
                        title={forceDeleteTitle('cette mission')}
                        description={forceDeleteDescription({ entityLabel: 'cette mission' })}
                        loading={permanentDeleteLoading}
                        onConfirm={handlePermanentDelete}
                    >
                        <Button danger type="primary" icon={<DeleteOutlined />} loading={permanentDeleteLoading}>
                            Supprimer la mission
                        </Button>
                    </ForceDeletePopconfirm>
                )}
            </Space>

            <ValidationWorkflowBanner workflow={mission.validation?.workflow} />

            {!mission.validation?.workflow?.inWorkflow && needsCoordinator && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={
                        isCreator
                            ? 'Cette mission est en attente de validation par le coordinateur du projet (1er palier). Elle sera ensuite transmise au rôle Consolidateur.'
                            : 'Mission en attente de validation coordinateur (1er palier). La confirmation interviendra après consolidation par le rôle Consolidateur.'
                    }
                />
            )}
            {!mission.validation?.workflow?.inWorkflow && needsConsolidator && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={
                        isCreator
                            ? 'Cette mission a été validée par le coordinateur et attend la consolidation par le rôle Consolidateur (2e palier).'
                            : 'Mission en attente de consolidation par le rôle Consolidateur (2e palier) avant confirmation sur le calendrier.'
                    }
                />
            )}
            {needsFinalApproval && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Validation finale requise par le coordinateur du projet (élément en attente legacy)."
                />
            )}

            <Card
                title={
                    <Space>
                        <FlagOutlined style={{ color: '#722ed1' }} />
                        {mission.title}
                    </Space>
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
                            <Space direction="vertical" size={0}>
                                <Tag color="blue">
                                    {mission.project.code
                                        ? `${mission.project.name} (${mission.project.code})`
                                        : mission.project.name}
                                </Tag>
                                {mission.project.responsible?.name && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Responsable : {mission.project.responsible.name}
                                    </Text>
                                )}
                            </Space>
                        ) : '—'}
                    </Descriptions.Item>
                    {mission.description && (
                        <Descriptions.Item label="Description">
                            <Text>{mission.description}</Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                <Card
                    type="inner"
                    title="Intervenants assignés"
                    style={{ marginTop: 24 }}
                    extra={
                        canEdit && mission.status !== 'CANCELLED' && (
                            <Button
                                size="small"
                                icon={<UserAddOutlined />}
                                onClick={openAddParticipants}
                            >
                                Ajouter des intervenants
                            </Button>
                        )
                    }
                >
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

                <Modal
                    title="Ajouter des intervenants"
                    open={addVisible}
                    onCancel={() => { setAddVisible(false); addForm.resetFields(); }}
                    onOk={handleAddParticipants}
                    okText="Ajouter les intervenants"
                    cancelText="Annuler"
                    confirmLoading={addParticipantsLoading}
                    width={520}
                    destroyOnClose
                >
                    <Form form={addForm} layout="vertical" style={{ marginTop: 8 }}>
                        <Form.Item
                            name="userIds"
                            label="Intervenants à ajouter"
                            rules={[{ required: true, message: 'Sélectionner au moins un intervenant' }]}
                            extra="Les personnes peuvent être invitées même si elles ont déjà une mission ou un autre événement sur ce créneau."
                        >
                            <Select
                                mode="multiple"
                                placeholder="Rechercher des utilisateurs"
                                optionFilterProp="children"
                            >
                                {allUsers
                                    .filter((u) => !mission.assignments?.some((a) => a.userId === u.id) && u.id !== mission.createdById)
                                    .map((u) => (
                                        <Select.Option key={u.id} value={u.id}>
                                            {u.name} — {u.email}
                                        </Select.Option>
                                    ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>

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
