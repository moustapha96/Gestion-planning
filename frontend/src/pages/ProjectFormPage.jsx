import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert, Button, Card, Col, Divider, Form, Input, List, Popconfirm, Result, Row, Select,
    Space, Spin, Tag, Typography, Upload, App,
} from 'antd';
import {
    ArrowLeftOutlined, DeleteOutlined, FileTextOutlined,
    ProjectOutlined, SaveOutlined, UploadOutlined, UserOutlined,
} from '@ant-design/icons';
import api, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PDF_ACCEPT, isAcceptedPdfFile } from '../utils/pdfAttachment';
import { resolveImageSrc } from '../utils/mediaUrl';
import { canManageProjects, isResponsable } from '../utils/roles';

const { Title, Text, Paragraph } = Typography;

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Actif', color: 'success' },
    { value: 'PAUSED', label: 'En pause', color: 'warning' },
    { value: 'COMPLETED', label: 'Terminé', color: 'default' },
];

function isValidOptionalLogoUrl(value) {
    const v = String(value || '').trim();
    if (!v) return true;
    return /^https?:\/\//i.test(v) || v.startsWith('/');
}

function projectListPath(adminContext) {
    return adminContext ? '/admin/projects' : '/projects';
}

export default function ProjectFormPage({ adminContext = false }) {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { message } = App.useApp();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [fileUploading, setFileUploading] = useState(false);
    const [pendingLogoFile, setPendingLogoFile] = useState(null);
    const [pendingLogoPreview, setPendingLogoPreview] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [project, setProject] = useState(null);
    const [initialStatus, setInitialStatus] = useState('ACTIVE');

    const listPath = projectListPath(adminContext);
    const canManage = adminContext || canManageProjects(user?.role);
    const isResponsibleUser = isResponsable(user?.role);
    const logoUrl = Form.useWatch('logoUrl', form);

    const logoPreview = useMemo(() => {
        if (pendingLogoPreview) return pendingLogoPreview;
        return resolveImageSrc(logoUrl);
    }, [logoUrl, pendingLogoPreview]);

    useEffect(() => {
        if (canManage || !user) return;
        if (isEdit && isResponsibleUser) {
            message.warning('Seuls les administrateurs peuvent modifier un projet.');
            navigate(`/projects/${id}`, { replace: true });
            return;
        }
        navigate(listPath, { replace: true });
    }, [canManage, user, isEdit, isResponsibleUser, id, listPath, navigate, message]);

    useEffect(() => {
        api.get('/users/participants')
            .then((res) => setAllUsers(res.data || []))
            .catch(() => setAllUsers([]));
    }, []);

    const loadProject = useCallback(async () => {
        if (!isEdit) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
            setInitialStatus(data.status || 'ACTIVE');
            form.setFieldsValue({
                name: data.name,
                code: data.code || '',
                description: data.description || '',
                logoUrl: data.logoUrl || '',
                status: data.status || 'ACTIVE',
                responsibleId: data.responsibleId || undefined,
                consolidatorId: data.consolidatorId || undefined,
                coordinatorId: data.coordinatorId || undefined,
            });
        } catch (err) {
            message.error(err?.response?.data?.error || 'Projet introuvable');
            navigate(listPath);
        } finally {
            setLoading(false);
        }
    }, [form, id, isEdit, listPath, message, navigate]);

    useEffect(() => { loadProject(); }, [loadProject]);

    useEffect(() => () => {
        if (pendingLogoPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(pendingLogoPreview);
        }
    }, [pendingLogoPreview]);

    const handleLogoPick = async ({ file, onSuccess, onError }) => {
        if (!file.type?.startsWith('image/')) {
            message.error('Veuillez choisir une image.');
            onError?.(new Error('not image'));
            return;
        }
        if (isEdit) {
            setLogoUploading(true);
            try {
                const fd = new FormData();
                fd.append('logo', file);
                const { data } = await api.post(`/projects/${id}/logo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                form.setFieldsValue({ logoUrl: data?.logoUrl || '' });
                message.success('Logo mis à jour');
                onSuccess?.(data);
                loadProject();
            } catch (err) {
                message.error(err?.response?.data?.error || 'Erreur upload logo');
                onError?.(err);
            } finally {
                setLogoUploading(false);
            }
        } else {
            if (pendingLogoPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(pendingLogoPreview);
            }
            setPendingLogoFile(file);
            setPendingLogoPreview(URL.createObjectURL(file));
            message.success('Logo sera envoyé à la création du projet');
            onSuccess?.('ok');
        }
    };

    const handleFileUpload = async ({ file, onSuccess, onError }) => {
        if (!isAcceptedPdfFile(file)) {
            message.error('Seuls les fichiers PDF (.pdf) sont acceptés.');
            onError?.(new Error('not pdf'));
            return;
        }
        setFileUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.post(`/projects/${id}/files`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('PDF ajouté');
            onSuccess?.('ok');
            loadProject();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur upload');
            onError?.(err);
        } finally {
            setFileUploading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        try {
            await api.delete(`/projects/${id}/files/${fileId}`);
            message.success('Fichier supprimé');
            loadProject();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur suppression fichier');
        }
    };

    const handleDeleteProject = async () => {
        try {
            await api.delete(`/projects/${id}`);
            message.success('Projet supprimé');
            navigate(listPath);
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur suppression');
        }
    };

    const handleSubmit = async () => {
        const values = await form.validateFields();
        const { logoUrl: logoUrlVal, responsibleId, consolidatorId, coordinatorId, status, ...rest } = values;
        const payload = { ...rest };
        payload.responsibleId = responsibleId || null;
        payload.consolidatorId = consolidatorId || null;
        payload.coordinatorId = coordinatorId || null;

        setSaving(true);
        try {
            if (isEdit) {
                if (logoUrlVal !== undefined) {
                    payload.logoUrl = String(logoUrlVal || '').trim() || '/logo-gp.png';
                }
                await api.put(`/projects/${id}`, payload);
                if (status && status !== initialStatus) {
                    await api.put(`/projects/${id}/status`, { status });
                }
                message.success('Projet mis à jour');
                navigate(`${listPath}`);
            } else {
                const trimmedLogo = String(logoUrlVal || '').trim();
                if (trimmedLogo) {
                    payload.logoUrl = trimmedLogo;
                }
                const { data: created } = await api.post('/projects', payload);
                if (pendingLogoFile && created?.id) {
                    const fd = new FormData();
                    fd.append('logo', pendingLogoFile);
                    await api.post(`/projects/${created.id}/logo`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                }
                message.success('Projet créé');
                navigate(adminContext ? `${listPath}` : `/projects/${created.id}`);
            }
        } catch (err) {
            if (err?.errorFields) return;
            message.error(err?.response?.data?.error || 'Erreur sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const userOptions = allUsers.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.email}) — ${u.role}`,
    }));

    const responsableOptions = allUsers
        .filter((u) => u.role === 'RESPONSABLE')
        .map((u) => ({
            value: u.id,
            label: `${u.name} (${u.email})`,
        }));

    if (!canManage) {
        return (
            <Result
                status="403"
                title="Accès refusé"
                subTitle={
                    isResponsibleUser
                        ? 'La modification des projets est réservée aux administrateurs. Consultez la fiche projet pour créer des réunions ou missions.'
                        : 'Vous n\'avez pas les droits pour créer ou modifier un projet.'
                }
                extra={(
                    <Button type="primary" onClick={() => navigate(isEdit && id ? `/projects/${id}` : listPath)}>
                        {isEdit && isResponsibleUser ? 'Voir la fiche projet' : 'Retour à la liste'}
                    </Button>
                )}
            />
        );
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 64 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Space style={{ marginBottom: 20 }} wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(listPath)}>
                    Retour à la liste
                </Button>
                {isEdit && !adminContext && (
                    <Button onClick={() => navigate(`/projects/${id}`)}>
                        Voir la fiche projet
                    </Button>
                )}
            </Space>

            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <ProjectOutlined style={{ marginRight: 10, color: '#1565C0' }} />
                    {isEdit ? 'Modifier le projet' : 'Nouveau projet'}
                </Title>
                <Text type="secondary">
                    {isEdit
                        ? 'Mettez à jour les informations, le circuit de validation et les pièces jointes.'
                        : 'Créez un projet et définissez qui valide réunions et plannings.'}
                </Text>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'ACTIVE' }}>
                <Row gutter={[20, 20]}>
                    <Col xs={24} lg={16}>
                        <Card title="Informations générales" style={{ borderRadius: 12, marginBottom: 20 }}>
                            <Row gutter={16}>
                                <Col xs={24} md={16}>
                                    <Form.Item
                                        name="name"
                                        label="Nom du projet"
                                        rules={[{ required: true, message: 'Le nom est requis' }]}
                                    >
                                        <Input placeholder="Ex : Projet Alpha" maxLength={120} size="large" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="code" label="Code (optionnel)">
                                        <Input placeholder="PA-2025" maxLength={30} style={{ textTransform: 'uppercase' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="description" label="Description">
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Objectifs, périmètre, notes internes…"
                                    maxLength={500}
                                    showCount
                                />
                            </Form.Item>
                            {isEdit && (
                                <Form.Item name="status" label="Statut du projet">
                                    <Select options={STATUS_OPTIONS.map((o) => ({
                                        value: o.value,
                                        label: (
                                            <Space>
                                                <Tag color={o.color} style={{ margin: 0 }}>{o.label}</Tag>
                                            </Space>
                                        ),
                                    }))} />
                                </Form.Item>
                            )}
                        </Card>

                        <Card
                            title="Équipe projet"
                            style={{ borderRadius: 12, marginBottom: 20 }}
                            extra={<UserOutlined style={{ color: '#722ed1' }} />}
                        >
                            <Alert
                                type="info"
                                showIcon
                                style={{ marginBottom: 20 }}
                                message="Rôles du projet"
                                description={(
                                    <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                                        <li>Le <strong>responsable</strong> porte le planning hebdomadaire consolidé (un même responsable peut gérer plusieurs projets).</li>
                                        <li>Le <strong>coordinateur</strong> valide toutes les réunions et missions en brouillon (étape 1/2).</li>
                                        <li>Le <strong>consolidateur</strong> valide définitivement réunions et missions (étape 2/2) avant publication calendrier.</li>
                                    </ul>
                                )}
                            />
                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <Form.Item
                                        name="responsibleId"
                                        label="Responsable du projet"
                                        rules={[{ required: true, message: 'Choisissez un responsable' }]}
                                        extra="Utilisateur au rôle Responsable. Peut être désigné sur plusieurs projets."
                                    >
                                        <Select
                                            allowClear
                                            showSearch
                                            placeholder="Choisir un responsable"
                                            optionFilterProp="label"
                                            options={responsableOptions}
                                        />
                                    </Form.Item>
                                </Col>
                               
                                <Col xs={24} md={8}>
                                    <Form.Item
                                        name="coordinatorId"
                                        label="Coordinateur"
                                        extra="Valide les réunions en brouillon."
                                    >
                                        <Select
                                            allowClear
                                            showSearch
                                            placeholder="Choisir un utilisateur"
                                            optionFilterProp="label"
                                            options={userOptions}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} md={8}>
                                    <Form.Item
                                        name="consolidatorId"
                                        label="Consolidateur"
                                        extra="Valide définitivement les réunions et missions."
                                    >
                                        <Select
                                            allowClear
                                            showSearch
                                            placeholder="Choisir un utilisateur"
                                            optionFilterProp="label"
                                            options={userOptions}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {isEdit && project?.status !== 'COMPLETED' && (
                            <Card title="Documents PDF" style={{ borderRadius: 12 }}>
                                <Paragraph type="secondary" style={{ marginTop: 0 }}>
                                    Pièces jointes liées au projet (max. 20 Mo, format PDF uniquement).
                                </Paragraph>
                                <Upload
                                    showUploadList={false}
                                    accept={PDF_ACCEPT}
                                    customRequest={handleFileUpload}
                                    disabled={fileUploading}
                                >
                                    <Button icon={<UploadOutlined />} loading={fileUploading}>
                                        Ajouter un PDF
                                    </Button>
                                </Upload>
                                <Divider style={{ margin: '16px 0' }} />
                                {project?.files?.length > 0 ? (
                                    <List
                                        size="small"
                                        dataSource={project.files}
                                        renderItem={(f) => (
                                            <List.Item
                                                actions={[
                                                    <Popconfirm
                                                        key="del"
                                                        title="Supprimer ce fichier ?"
                                                        okText="Supprimer"
                                                        cancelText="Annuler"
                                                        okButtonProps={{ danger: true }}
                                                        onConfirm={() => handleDeleteFile(f.id)}
                                                    >
                                                        <Button size="small" danger icon={<DeleteOutlined />} />
                                                    </Popconfirm>,
                                                ]}
                                            >
                                                <List.Item.Meta
                                                    avatar={<FileTextOutlined style={{ color: '#1565C0', fontSize: 18 }} />}
                                                    title={(
                                                        <a href={`${API_BASE}${f.fileUrl}`} target="_blank" rel="noopener noreferrer">
                                                            {f.fileName}
                                                        </a>
                                                    )}
                                                    description={`${f.uploadedBy?.name || 'Utilisateur'} · ${new Date(f.createdAt).toLocaleString('fr-FR')}`}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                ) : (
                                    <Text type="secondary">Aucune pièce jointe pour l&apos;instant.</Text>
                                )}
                            </Card>
                        )}
                    </Col>

                    <Col xs={24} lg={8}>
                        <Card title="Identité visuelle" style={{ borderRadius: 12, marginBottom: 20 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 140,
                                    marginBottom: 16,
                                    borderRadius: 12,
                                    border: '1px dashed #d9d9d9',
                                    background: '#fafafa',
                                    padding: 16,
                                }}
                            >
                                {logoPreview ? (
                                    <img
                                        src={logoPreview}
                                        alt="Aperçu logo"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: 120,
                                            objectFit: 'contain',
                                        }}
                                    />
                                ) : (
                                    <Space direction="vertical" align="center">
                                        <ProjectOutlined style={{ fontSize: 36, color: '#bfbfbf' }} />
                                        <Text type="secondary">Aucun logo</Text>
                                    </Space>
                                )}
                            </div>
                            <Form.Item
                                name="logoUrl"
                                label="URL du logo (optionnel)"
                                extra="https://… ou /uploads/… — laissez vide pour le logo par défaut, ou importez une image ci-dessous."
                                rules={[
                                    {
                                        validator: (_, v) => (isValidOptionalLogoUrl(v)
                                            ? Promise.resolve()
                                            : Promise.reject(new Error('URL http(s) ou chemin commençant par /'))),
                                    },
                                ]}
                            >
                                <Input placeholder="https://exemple.com/logo.png" allowClear />
                            </Form.Item>
                            <Upload
                                accept="image/*"
                                showUploadList={false}
                                disabled={logoUploading}
                                customRequest={handleLogoPick}
                            >
                                <Button block icon={<UploadOutlined />} loading={logoUploading}>
                                    {isEdit ? 'Importer un logo' : 'Choisir une image'}
                                </Button>
                            </Upload>
                            {!isEdit && pendingLogoFile && (
                                <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
                                    Fichier sélectionné : {pendingLogoFile.name}
                                </Text>
                            )}
                        </Card>

                        {isEdit && project && (
                            <Card size="small" title="Résumé" style={{ borderRadius: 12, marginBottom: 20 }}>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    <Text type="secondary">Créé le</Text>
                                    <Text>{new Date(project.createdAt).toLocaleDateString('fr-FR')}</Text>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <Text type="secondary">Missions / Réunions</Text>
                                    <Space>
                                        <Tag color="purple">{project._count?.missions || 0} missions</Tag>
                                        <Tag color="blue">{project._count?.meetings || 0} réunions</Tag>
                                    </Space>
                                </Space>
                            </Card>
                        )}

                        <Card style={{ borderRadius: 12 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<SaveOutlined />}
                                    loading={saving}
                                    block
                                    size="large"
                                >
                                    {isEdit ? 'Enregistrer les modifications' : 'Créer le projet'}
                                </Button>
                                <Button block onClick={() => navigate(listPath)}>
                                    Annuler
                                </Button>
                                {isEdit && (
                                    <Popconfirm
                                        title="Supprimer ce projet ?"
                                        description="Les missions et réunions liées seront détachées."
                                        okText="Supprimer"
                                        cancelText="Annuler"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={handleDeleteProject}
                                    >
                                        <Button danger block icon={<DeleteOutlined />}>
                                            Supprimer le projet
                                        </Button>
                                    </Popconfirm>
                                )}
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </Form>
        </div>
    );
}
