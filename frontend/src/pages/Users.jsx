import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Table,
    Tag,
    Button,
    Space,
    Modal,
    Form,
    Input,
    Select,
    Row,
    Col,
    Popconfirm,
    App,
    Tooltip,
    Typography,
} from 'antd';
import { PlusOutlined, StopOutlined, CheckOutlined, KeyOutlined, UserOutlined, EditOutlined, MailOutlined, DeleteOutlined } from '@ant-design/icons';
import UserAvatar from '../components/UserAvatar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin, ROLES, ROLE_COLORS, roleLabel, normalizeRole } from '../utils/roles';

const { Title, Text } = Typography;

const USER_ROLE_OPTIONS = [
    { value: ROLES.RESPONSABLE, label: 'Responsable' },
    { value: ROLES.COORDINATEUR, label: 'Coordinateur' },
    { value: ROLES.CONSOLIDATEUR, label: 'Consolidateur' },
    { value: ROLES.ADMIN, label: 'Administrateur' },
    { value: ROLES.SUPER_ADMIN, label: 'Super administrateur' },
];

export default function Users() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { message } = App.useApp();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [resetModal, setResetModal] = useState({ open: false, userId: null, userName: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [sendingLinkUserId, setSendingLinkUserId] = useState(null);
    const [toggleLoadingId, setToggleLoadingId] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [resetForm] = Form.useForm();
    const [directions, setDirections] = useState([]);
    const [projectsList, setProjectsList] = useState([]);

    useEffect(() => {
        if (!isPrivilegedAdmin(currentUser?.role)) {
            navigate('/dashboard');
            return;
        }
        fetchUsers();
    }, [currentUser?.role]);

    useEffect(() => {
        if (!isPrivilegedAdmin(currentUser?.role)) return;
        (async () => {
            try {
                const [dRes, pRes] = await Promise.all([
                    api.get('/repertoire/directions'),
                    api.get('/projects'),
                ]);
                setDirections(dRes.data || []);
                setProjectsList(pRes.data || []);
            } catch {
                /* selects vides si erreur */
            }
        })();
    }, [currentUser?.role]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch {
            message.error('Impossible de charger les utilisateurs');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (values) => {
        setCreateLoading(true);
        try {
            await api.post('/users', values);
            message.success('Utilisateur créé — email de bienvenue envoyé');
            setCreateModal(false);
            form.resetFields();
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de la création');
        } finally {
            setCreateLoading(false);
        }
    };

    const openEdit = (record) => {
        setEditModal({ open: true, user: record });
        editForm.setFieldsValue({
            name: record.name,
            email: record.email,
            role: record.role,
            directionId: record.directionId || undefined,
            projectId: record.projectId || undefined,
            jobTitle: record.jobTitle || '',
            cellUnit: record.cellUnit || '',
            phone: record.phone || '',
        });
    };

    const handleEditSubmit = async () => {
        const u = editModal.user;
        if (!u) return;
        setEditLoading(true);
        try {
            const values = await editForm.validateFields();
            await api.put(`/users/${u.id}`, {
                name: values.name,
                email: values.email,
                role: values.role,
                directionId: values.directionId || null,
                projectId: values.projectId || null,
                jobTitle: values.jobTitle,
                cellUnit: values.cellUnit,
                phone: values.phone,
            });
            message.success('Utilisateur modifié');
            setEditModal({ open: false, user: null });
            editForm.resetFields();
            fetchUsers();
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setEditLoading(false);
        }
    };

    const handleSendResetLink = async (userId, userName) => {
        setSendingLinkUserId(userId);
        try {
            await api.post(`/users/${userId}/send-reset-link`);
            message.success(`Un lien de réinitialisation a été envoyé à ${userName}`);
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setSendingLinkUserId(null);
        }
    };

    const handleToggleActive = async (userId, isActive) => {
        setToggleLoadingId(userId);
        try {
            await api.put(`/users/${userId}/${isActive ? 'deactivate' : 'activate'}`);
            message.success(isActive ? 'Utilisateur désactivé' : 'Utilisateur réactivé');
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setToggleLoadingId(null);
        }
    };

    const handleResetPassword = async (values) => {
        setResetLoading(true);
        try {
            await api.put(`/users/${resetModal.userId}/reset-password`, { newPassword: values.newPassword });
            message.success('Mot de passe réinitialisé — envoyé par email');
            setResetModal({ open: false, userId: null, userName: '' });
            resetForm.resetFields();
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setResetLoading(false);
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        try {
            await api.delete(`/users/${userId}`);
            message.success(`Utilisateur ${userName} supprimé`);
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur suppression');
        }
    };

    const activePrivileged = users.filter((u) => isPrivilegedAdmin(u.role) && u.isActive).length;

    const columns = [
        {
            title: '',
            key: 'avatar',
            width: 48,
            render: (_, record) => <UserAvatar user={record} size="small" />,
        },
        { title: 'Nom', dataIndex: 'name', key: 'name', width: 160 },
        { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true, width: 200 },
        {
            title: 'Direction',
            key: 'direction',
            ellipsis: true,
            width: 160,
            render: (_, r) =>
                r.direction?.name
                    ? `${r.direction.name}${r.direction.code ? ` (${r.direction.code})` : ''}`
                    : '—',
        },
        {
            title: 'Cellule',
            dataIndex: 'cellUnit',
            key: 'cellUnit',
            ellipsis: true,
            width: 120,
            render: (v) => v || '—',
        },
        {
            title: 'Poste',
            dataIndex: 'jobTitle',
            key: 'jobTitle',
            ellipsis: true,
            width: 140,
            render: (v) => v || '—',
        },
        {
            title: 'Tél.',
            dataIndex: 'phone',
            key: 'phone',
            width: 120,
            render: (v) => v || '—',
        },
        {
            title: 'Rôle',
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color={ROLE_COLORS[normalizeRole(role)] || 'default'}>{roleLabel(role)}</Tag>,
        },
        {
            title: 'Statut',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Tag>
            ),
        },
        {
            title: 'Créé le',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) =>
                date ? new Date(date).toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '—',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, record) => (
                <Space wrap>
                    <Tooltip title="Modifier fiche (nom, email, rôle, direction, projet, poste, cellule, téléphone)">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Définir un nouveau mot de passe (envoyé par email)">
                        <Button
                            size="small"
                            icon={<KeyOutlined />}
                            onClick={() =>
                                setResetModal({ open: true, userId: record.id, userName: record.name })
                            }
                        />
                    </Tooltip>
                    <Popconfirm
                        title={`Envoyer un lien de réinitialisation à ${record.name} ?`}
                        description="L'utilisateur recevra un email avec un lien pour choisir son nouveau mot de passe (valide 1 h)."
                        onConfirm={() => handleSendResetLink(record.id, record.name)}
                        okText="Envoyer"
                        cancelText="Annuler"
                    >
                        <Tooltip title="Envoyer un lien de réinitialisation par email">
                            <Button
                                size="small"
                                icon={<MailOutlined />}
                                loading={sendingLinkUserId === record.id}
                            />
                        </Tooltip>
                    </Popconfirm>
                    {record.id !== currentUser?.id && (
                        <>
                            <Popconfirm
                                title={
                                    record.isActive
                                        ? 'Désactiver cet utilisateur ?'
                                        : 'Réactiver cet utilisateur ?'
                                }
                                onConfirm={() => handleToggleActive(record.id, record.isActive)}
                                okText="Confirmer"
                                cancelText="Annuler"
                                okButtonProps={{ loading: toggleLoadingId === record.id }}
                            >
                                <Button
                                    size="small"
                                    danger={record.isActive}
                                    type={record.isActive ? 'default' : 'primary'}
                                    icon={record.isActive ? <StopOutlined /> : <CheckOutlined />}
                                    disabled={
                                        isPrivilegedAdmin(record.role) &&
                                        record.isActive &&
                                        activePrivileged <= 1
                                    }
                                >
                                    {record.isActive ? 'Désactiver' : 'Réactiver'}
                                </Button>
                            </Popconfirm>
                            {/* Soft-delete — CDC §3.9.1 */}
                            <Popconfirm
                                title={`Supprimer définitivement ${record.name} ?`}
                                description="Le compte sera supprimé, détaché de tous les projets et son e-mail sera libéré pour recréer un compte depuis le répertoire."
                                onConfirm={() => handleDeleteUser(record.id, record.name)}
                                okText="Supprimer"
                                okButtonProps={{ danger: true }}
                                cancelText="Annuler"
                            >
                                <Tooltip title="Supprimer le compte">
                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                </Tooltip>
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    if (!isPrivilegedAdmin(currentUser?.role)) return null;

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 16,
                }}
            >
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        <UserOutlined /> Utilisateurs
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                        Gérez les comptes, rôles et accès des utilisateurs. Modifiez les profils, envoyez des liens de réinitialisation ou activez/désactivez les comptes.
                    </Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                    Nouvel utilisateur
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: 'Aucun utilisateur' }}
                />
            </Card>

            <Modal
                title="Créer un utilisateur"
                open={createModal}
                onOk={() => form.submit()}
                onCancel={() => {
                    setCreateModal(false);
                    form.resetFields();
                }}
                okText="Créer"
                confirmLoading={createLoading}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                    style={{ marginTop: 16 }}
                >
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="name"
                                label="Nom complet"
                                rules={[{ required: true, message: 'Requis' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="role"
                                label="Rôle"
                                initialValue="RESPONSABLE"
                                rules={[{ required: true }]}
                            >
                                <Select options={USER_ROLE_OPTIONS} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: 'email', message: 'Email valide requis' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="directionId" label="Direction">
                                <Select allowClear placeholder="Choisir une direction" showSearch optionFilterProp="children">
                                    {directions.map((d) => (
                                        <Select.Option key={d.id} value={d.id}>
                                            {d.name}{d.code ? ` (${d.code})` : ''}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="projectId"
                                label="Projet (équipe)"
                                extra="Si un projet est choisi, l'utilisateur devient consolidateur de ce projet."
                            >
                                <Select allowClear placeholder="Choisir un projet" showSearch optionFilterProp="children">
                                    {projectsList.map((p) => (
                                        <Select.Option key={p.id} value={p.id}>
                                            {p.name}{p.code ? ` (${p.code})` : ''}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item name="jobTitle" label="Poste / fonction">
                                <Input maxLength={120} placeholder="Ex. Chargé de mission" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="cellUnit" label="Cellule ou service">
                                <Input maxLength={120} placeholder="Ex. Cellule suivi" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="phone" label="Téléphone">
                                <Input maxLength={40} placeholder="Ex. +221 …" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="password"
                        label="Mot de passe initial"
                        rules={[{ required: true, min: 8, message: 'Minimum 8 caractères' }]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Modifier l'utilisateur"
                open={editModal.open}
                onOk={() => handleEditSubmit()}
                onCancel={() => {
                    setEditModal({ open: false, user: null });
                    editForm.resetFields();
                }}
                okText="Enregistrer"
                confirmLoading={editLoading}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nom complet" rules={[{ required: true, message: 'Requis' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: 'email', message: 'Email valide requis' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item name="role" label="Rôle" rules={[{ required: true }]}>
                        <Select options={USER_ROLE_OPTIONS} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="directionId" label="Direction">
                                <Select allowClear placeholder="Choisir une direction" showSearch optionFilterProp="children">
                                    {directions.map((d) => (
                                        <Select.Option key={d.id} value={d.id}>
                                            {d.name}{d.code ? ` (${d.code})` : ''}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="projectId"
                                label="Projet (équipe)"
                                extra="Si un projet est choisi, l'utilisateur devient consolidateur de ce projet."
                            >
                                <Select allowClear placeholder="Choisir un projet" showSearch optionFilterProp="children">
                                    {projectsList.map((p) => (
                                        <Select.Option key={p.id} value={p.id}>
                                            {p.name}{p.code ? ` (${p.code})` : ''}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item name="jobTitle" label="Poste / fonction">
                                <Input maxLength={120} placeholder="Ex. Chargé de mission" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="cellUnit" label="Cellule ou service">
                                <Input maxLength={120} placeholder="Ex. Cellule suivi" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="phone" label="Téléphone">
                                <Input maxLength={40} placeholder="Ex. +221 …" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            <Modal
                title={`Réinitialiser le mot de passe — ${resetModal.userName}`}
                open={resetModal.open}
                onOk={() => resetForm.submit()}
                onCancel={() => {
                    setResetModal({ open: false, userId: null, userName: '' });
                    resetForm.resetFields();
                }}
                okText="Réinitialiser"
                confirmLoading={resetLoading}
            >
                <Form
                    form={resetForm}
                    layout="vertical"
                    onFinish={handleResetPassword}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="newPassword"
                        label="Nouveau mot de passe"
                        rules={[{ required: true, min: 8, message: 'Minimum 8 caractères' }]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        name="confirm"
                        label="Confirmer le mot de passe"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Requis' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value)
                                        return Promise.resolve();
                                    return Promise.reject('Les mots de passe ne correspondent pas');
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
