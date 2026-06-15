import { useEffect, useState, useMemo } from 'react';
import {
    Table, Tag, Button, Card, Typography, Space, Modal, Form, Input, Select,
    Popconfirm, App, Tooltip, Row, Col, List, Spin, TimePicker, Switch, Upload, Grid,
    Divider, Alert, Descriptions,
} from 'antd';
import {
    PlusOutlined, StopOutlined, CheckOutlined, KeyOutlined, EditOutlined,
    MailOutlined, UserOutlined, FileTextOutlined,
    BankOutlined, DeleteOutlined, SearchOutlined,
    SafetyCertificateOutlined, SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { API_BASE } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
    DEFAULT_APP_LOGO_PATH,
    hasCustomAppLogo,
    resolveAppLogoSrc,
} from '../../utils/appBranding';

const { Title, Text, Paragraph } = Typography;
export const ROLE_COLORS = {
    RESPONSABLE: 'blue',
    CONSOLIDATEUR: 'purple',
    ADMIN: 'red',
    SUPER_ADMIN: 'magenta',
};
export const ROLE_LABELS = {
    RESPONSABLE: 'Responsable',
    CONSOLIDATEUR: 'Consolidateur',
    ADMIN: 'Administrateur',
    SUPER_ADMIN: 'Super administrateur',
};

// ════════════════════════════════════════════════════════════════════
// ONGLET UTILISATEURS
// ════════════════════════════════════════════════════════════════════
export function UsersTab() {
    const { user: currentUser } = useAuth();
    const { message } = App.useApp();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState(undefined);
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [createModal, setCreateModal] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [resetModal, setResetModal] = useState({ open: false, userId: null, userName: '' });
    const [deleteId, setDeleteId] = useState(null);
    const [sendingLink, setSendingLink] = useState(null);
    const [createLoading, setCreateLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [toggleLoadingId, setToggleLoadingId] = useState(null);
    const [directions, setDirections] = useState([]);
    const [projects, setProjects] = useState([]);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [resetForm] = Form.useForm();

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch {
            message.error('Impossible de charger les utilisateurs');
        } finally {
            setLoading(false);
        }
    };

    const fetchDirections = async () => {
        try {
            const res = await api.get('/events/taxonomy');
            setDirections(res.data?.directions || []);
            setProjects(res.data?.projects || []);
        } catch {
            setDirections([]);
            setProjects([]);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchDirections();
    }, []);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const q = search.toLowerCase();
            if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
            if (roleFilter && u.role !== roleFilter) return false;
            if (statusFilter === 'active' && !u.isActive) return false;
            if (statusFilter === 'inactive' && u.isActive) return false;
            return true;
        });
    }, [users, search, roleFilter, statusFilter]);

    const handleCreate = async (values) => {
        setCreateLoading(true);
        try {
            await api.post('/users', values);
            message.success('Utilisateur créé — email d\'activation envoyé');
            setCreateModal(false);
            form.resetFields();
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de la création');
        } finally {
            setCreateLoading(false);
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
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setResetLoading(false);
        }
    };

    const openEdit = (record) => {
        setEditModal({ open: true, user: record });
        editForm.setFieldsValue({
            name: record.name,
            email: record.email,
            role: record.role,
            directionId: record.directionId || null,
            projectId: record.projectId || null,
        });
    };

    const handleEditSubmit = async () => {
        if (!editModal.user) return;
        setEditLoading(true);
        try {
            const values = await editForm.validateFields();
            await api.put(`/users/${editModal.user.id}`, {
                name: values.name,
                email: values.email,
                role: values.role,
                directionId: values.directionId || null,
                projectId: values.projectId || null,
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
        setSendingLink(userId);
        try {
            await api.post(`/users/${userId}/send-reset-link`);
            message.success(`Lien de réinitialisation envoyé à ${userName}`);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setSendingLink(null);
        }
    };

    const handleDelete = async (userId, email) => {
        setDeleteId(userId);
        try {
            await api.delete(`/users/${userId}`);
            message.success(`Utilisateur ${email} supprimé (soft-delete)`);
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setDeleteId(null);
        }
    };

    const columns = [
        {
            title: 'Nom',
            dataIndex: 'name',
            key: 'name',
            render: (name, r) => (
                <div>
                    <Text strong>{name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        Créé le {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                    </Text>
                </div>
            ),
        },
        { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
        {
            title: 'Rôle',
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role] || role}</Tag>,
        },
        {
            title: 'Direction / projet',
            key: 'directionProjet',
            render: (_, r) => (
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <div>{r.direction?.name ? <span>Dir. : {r.direction.name}</span> : <Text type="secondary">Dir. : —</Text>}</div>
                    <div>{r.project?.name ? <span>Proj. : {r.project.name}</span> : <Text type="secondary">Proj. : —</Text>}</div>
                </div>
            ),
        },
        {
            title: 'Statut',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 90,
            render: (isActive) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 290,
            render: (_, record) => (
                <Space wrap size={[4, 4]}>
                    <Tooltip title="Modifier (nom, email, rôle)">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Définir un nouveau mot de passe">
                        <Button
                            size="small"
                            icon={<KeyOutlined />}
                            onClick={() => setResetModal({ open: true, userId: record.id, userName: record.name })}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={`Envoyer un lien à ${record.name} ?`}
                        description="Lien valide 1h — l'utilisateur choisit son nouveau mot de passe."
                        onConfirm={() => handleSendResetLink(record.id, record.name)}
                        okText="Envoyer"
                        cancelText="Annuler"
                    >
                        <Tooltip title="Envoyer lien réinitialisation">
                            <Button size="small" icon={<MailOutlined />} loading={sendingLink === record.id} />
                        </Tooltip>
                    </Popconfirm>
                    {record.id !== currentUser?.id && (
                        <Popconfirm
                            title={record.isActive ? 'Désactiver cet utilisateur ?' : 'Réactiver cet utilisateur ?'}
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
                                loading={toggleLoadingId === record.id}
                            >
                                {record.isActive ? 'Désactiver' : 'Réactiver'}
                            </Button>
                        </Popconfirm>
                    )}
                    {record.id !== currentUser?.id && (
                        <Popconfirm
                            title="Supprimer cet utilisateur ?"
                            description="Soft-delete : les données liées sont préservées (CDC §3.9.1)."
                            onConfirm={() => handleDelete(record.id, record.email)}
                            okText="Supprimer"
                            cancelText="Annuler"
                            okButtonProps={{ danger: true, loading: deleteId === record.id }}
                        >
                            <Tooltip title="Supprimer (soft-delete)">
                                <Button size="small" danger type="text" icon={<DeleteOutlined />} loading={deleteId === record.id} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8} md={7}>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Rechercher nom ou email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                    />
                </Col>
                <Col xs={12} sm={5} md={4}>
                    <Select
                        allowClear
                        placeholder="Rôle"
                        style={{ width: '100%' }}
                        value={roleFilter}
                        onChange={setRoleFilter}
                        options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                    />
                </Col>
                <Col xs={12} sm={5} md={4}>
                    <Select
                        allowClear
                        placeholder="Statut"
                        style={{ width: '100%' }}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[{ value: 'active', label: 'Actif' }, { value: 'inactive', label: 'Inactif' }]}
                    />
                </Col>
                <Col xs={24} sm={6} md={9} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{filtered.length} résultat(s)</Text>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                        Nouvel utilisateur
                    </Button>
                </Col>
            </Row>

            {isMobile ? (
                <List
                    loading={loading}
                    dataSource={filtered}
                    locale={{ emptyText: 'Aucun utilisateur' }}
                    renderItem={(record) => (
                        <List.Item style={{ padding: 0, marginBottom: 10 }}>
                            <Card size="small" style={{ width: '100%' }}>
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                    <div>
                                        <Text strong>{record.name}</Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                                    </div>
                                    <Space wrap>
                                        <Tag color={ROLE_COLORS[record.role]}>{ROLE_LABELS[record.role] || record.role}</Tag>
                                        <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Actif' : 'Inactif'}</Tag>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            Créé le {new Date(record.createdAt).toLocaleDateString('fr-FR')}
                                        </Text>
                                    </Space>
                                    <Space wrap>
                                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                                            Modifier
                                        </Button>
                                        <Button
                                            size="small"
                                            icon={<KeyOutlined />}
                                            onClick={() => setResetModal({ open: true, userId: record.id, userName: record.name })}
                                        >
                                            Mot de passe
                                        </Button>
                                        <Popconfirm
                                            title={`Envoyer un lien à ${record.name} ?`}
                                            description="Lien valide 1h — l'utilisateur choisit son nouveau mot de passe."
                                            onConfirm={() => handleSendResetLink(record.id, record.name)}
                                            okText="Envoyer"
                                            cancelText="Annuler"
                                        >
                                            <Button size="small" icon={<MailOutlined />} loading={sendingLink === record.id}>
                                                Lien reset
                                            </Button>
                                        </Popconfirm>
                                        {record.id !== currentUser?.id && (
                                            <Popconfirm
                                                title={record.isActive ? 'Désactiver cet utilisateur ?' : 'Réactiver cet utilisateur ?'}
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
                                                    loading={toggleLoadingId === record.id}
                                                >
                                                    {record.isActive ? 'Désactiver' : 'Réactiver'}
                                                </Button>
                                            </Popconfirm>
                                        )}
                                        {record.id !== currentUser?.id && (
                                            <Popconfirm
                                                title="Supprimer cet utilisateur ?"
                                                description="Soft-delete : les données liées sont préservées (CDC §3.9.1)."
                                                onConfirm={() => handleDelete(record.id, record.email)}
                                                okText="Supprimer"
                                                cancelText="Annuler"
                                                okButtonProps={{ danger: true, loading: deleteId === record.id }}
                                            >
                                                <Button size="small" danger icon={<DeleteOutlined />} loading={deleteId === record.id}>
                                                    Supprimer
                                                </Button>
                                            </Popconfirm>
                                        )}
                                    </Space>
                                </Space>
                            </Card>
                        </List.Item>
                    )}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={filtered}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showTotal: (t) => `${t} utilisateur(s)` }}
                    scroll={{ x: 'max-content' }}
                    size="small"
                />
            )}

            {/* Modal création */}
            <Modal
                title="Créer un utilisateur"
                open={createModal}
                onOk={() => form.submit()}
                onCancel={() => { setCreateModal(false); form.resetFields(); }}
                okText="Créer"
                confirmLoading={createLoading}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={14}>
                            <Form.Item name="name" label="Nom complet" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={10}>
                            <Form.Item name="role" label="Rôle" initialValue="RESPONSABLE" rules={[{ required: true }]}>
                                <Select options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="directionId" label="Direction (canal équipe)">
                        <Select
                            allowClear
                            placeholder="Aucune direction"
                            options={directions.map((d) => ({
                                value: d.id,
                                label: d.code ? `${d.name} (${d.code})` : d.name,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="projectId"
                        label="Projet (canal équipe)"
                        extra="Si un projet est choisi, cet utilisateur devient automatiquement consolidateur de ce projet."
                    >
                        <Select
                            allowClear
                            placeholder="Aucun projet"
                            options={projects.map((p) => ({
                                value: p.id,
                                label: p.code ? `${p.name} (${p.code})` : p.name,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Mot de passe initial"
                        rules={[
                            { required: true, min: 8 },
                            {
                                pattern: /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
                                message: 'Doit contenir 1 majuscule, 1 chiffre, 1 caractère spécial (CDC §3.1.2)',
                            },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal modification */}
            <Modal
                title="Modifier l'utilisateur"
                open={editModal.open}
                onOk={handleEditSubmit}
                onCancel={() => { setEditModal({ open: false, user: null }); editForm.resetFields(); }}
                okText="Enregistrer"
                confirmLoading={editLoading}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nom complet" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="role" label="Rôle" rules={[{ required: true }]}>
                        <Select options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                    </Form.Item>
                    <Form.Item name="directionId" label="Direction (canal équipe)">
                        <Select
                            allowClear
                            placeholder="Aucune direction"
                            options={directions.map((d) => ({
                                value: d.id,
                                label: d.code ? `${d.name} (${d.code})` : d.name,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="projectId"
                        label="Projet (canal équipe)"
                        extra="Si un projet est choisi, cet utilisateur devient automatiquement consolidateur de ce projet."
                    >
                        <Select
                            allowClear
                            placeholder="Aucun projet"
                            options={projects.map((p) => ({
                                value: p.id,
                                label: p.code ? `${p.name} (${p.code})` : p.name,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal réinitialisation */}
            <Modal
                title={`Réinitialiser le mot de passe — ${resetModal.userName}`}
                open={resetModal.open}
                onOk={() => resetForm.submit()}
                onCancel={() => { setResetModal({ open: false, userId: null, userName: '' }); resetForm.resetFields(); }}
                okText="Réinitialiser"
                confirmLoading={resetLoading}
                destroyOnClose
            >
                <Form form={resetForm} layout="vertical" onFinish={handleResetPassword} style={{ marginTop: 16 }}>
                    <Form.Item
                        name="newPassword"
                        label="Nouveau mot de passe"
                        rules={[
                            { required: true, min: 8 },
                            { pattern: /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, message: '1 majuscule, 1 chiffre, 1 spécial requis' },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        name="confirm"
                        label="Confirmer le mot de passe"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                    return Promise.reject('Les mots de passe ne correspondent pas');
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

// ════════════════════════════════════════════════════════════════════
// ONGLET SALLES
// ════════════════════════════════════════════════════════════════════
export function RoomsTab() {
    const { message } = App.useApp();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, room: null });
    const [createLoading, setCreateLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [toggleId, setToggleId] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const fetchRooms = async () => {
        try {
            const res = await api.get('/rooms', { params: { all: '1' } });
            setRooms(res.data);
        } catch {
            message.error('Impossible de charger les salles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRooms(); }, []);

    const parseEquipment = (eq) => {
        if (!eq) return [];
        if (Array.isArray(eq)) return eq;
        try { return JSON.parse(eq); } catch { return eq.split(',').map(s => s.trim()).filter(Boolean); }
    };

    const handleCreate = async (values) => {
        setCreateLoading(true);
        try {
            const equipment = values.equipment
                ? values.equipment.split(',').map(s => s.trim()).filter(Boolean)
                : [];
            await api.post('/rooms', {
                ...values,
                capacity: parseInt(values.capacity),
                equipment,
                openFrom: values.openFrom ? dayjs(values.openFrom).format('HH:mm') : '08:00',
                openTo: values.openTo ? dayjs(values.openTo).format('HH:mm') : '19:00',
            });
            message.success('Salle créée');
            setCreateModal(false);
            form.resetFields();
            fetchRooms();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setCreateLoading(false);
        }
    };

    const openEdit = (room) => {
        setEditModal({ open: true, room });
        const eq = parseEquipment(room.equipment);
        editForm.setFieldsValue({
            name: room.name,
            capacity: room.capacity,
            location: room.location,
            equipment: eq.join(', '),
            openFrom: room.openFrom ? dayjs(room.openFrom, 'HH:mm') : dayjs('08:00', 'HH:mm'),
            openTo: room.openTo ? dayjs(room.openTo, 'HH:mm') : dayjs('19:00', 'HH:mm'),
        });
    };

    const handleEditSubmit = async () => {
        if (!editModal.room) return;
        setEditLoading(true);
        try {
            const values = await editForm.validateFields();
            const equipment = values.equipment
                ? values.equipment.split(',').map(s => s.trim()).filter(Boolean)
                : [];
            await api.put(`/rooms/${editModal.room.id}`, {
                name: values.name,
                capacity: parseInt(values.capacity),
                location: values.location,
                equipment,
                openFrom: values.openFrom ? dayjs(values.openFrom).format('HH:mm') : undefined,
                openTo: values.openTo ? dayjs(values.openTo).format('HH:mm') : undefined,
            });
            message.success('Salle modifiée');
            setEditModal({ open: false, room: null });
            editForm.resetFields();
            fetchRooms();
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setEditLoading(false);
        }
    };

    const handleToggle = async (room) => {
        setToggleId(room.id);
        try {
            if (room.status === 'ACTIVE') {
                await api.delete(`/rooms/${room.id}`);
                message.success('Salle désactivée');
            } else {
                await api.put(`/rooms/${room.id}/activate`);
                message.success('Salle réactivée');
            }
            fetchRooms();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setToggleId(null);
        }
    };

    const RoomFormFields = ({ f }) => (
        <Form form={f} layout="vertical" style={{ marginTop: 16 }}>
            <Row gutter={16}>
                <Col xs={24} sm={14}>
                    <Form.Item name="name" label="Nom de la salle" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={10}>
                    <Form.Item name="capacity" label="Capacité (pers.)" rules={[{ required: true }]}>
                        <Input type="number" min={1} />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="location" label="Localisation">
                <Input placeholder="Bâtiment A, 2ème étage, salle 201" />
            </Form.Item>
            <Row gutter={16}>
                <Col xs={24} sm={12}>
                    <Form.Item name="openFrom" label="Ouverture">
                        <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item name="openTo" label="Fermeture">
                        <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="equipment" label="Équipements (séparés par virgule)">
                <Input placeholder="Projecteur, Tableau blanc, Visioconférence" />
            </Form.Item>
        </Form>
    );

    const columns = [
        {
            title: 'Salle',
            key: 'name',
            render: (_, r) => (
                <div>
                    <Text strong>{r.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.location || '—'}</Text>
                </div>
            ),
        },
        { title: 'Capacité', dataIndex: 'capacity', key: 'capacity', width: 90, render: (c) => `${c} pers.` },
        {
            title: 'Horaires',
            key: 'hours',
            width: 120,
            render: (_, r) => <Text type="secondary" style={{ fontSize: 12 }}>{r.openFrom || '08:00'} – {r.openTo || '19:00'}</Text>,
        },
        {
            title: 'Équipements',
            key: 'equipment',
            ellipsis: true,
            render: (_, r) => {
                const eq = parseEquipment(r.equipment);
                return eq.length > 0
                    ? eq.slice(0, 3).map((e) => <Tag key={e} style={{ marginBottom: 2, fontSize: 11 }}>{e}</Tag>)
                    : <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (s) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s === 'ACTIVE' ? 'Active' : 'Désactivée'}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 170,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Modifier">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Popconfirm
                        title={record.status === 'ACTIVE' ? 'Désactiver cette salle ?' : 'Réactiver cette salle ?'}
                        description={record.status === 'ACTIVE' ? 'Aucune nouvelle réservation ne sera possible.' : undefined}
                        onConfirm={() => handleToggle(record)}
                        okText="Confirmer"
                        cancelText="Annuler"
                        okButtonProps={{ loading: toggleId === record.id }}
                    >
                        <Button
                            size="small"
                            danger={record.status === 'ACTIVE'}
                            type={record.status !== 'ACTIVE' ? 'primary' : 'default'}
                            icon={record.status === 'ACTIVE' ? <StopOutlined /> : <CheckOutlined />}
                            loading={toggleId === record.id}
                        >
                            {record.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                    Nouvelle salle
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={rooms}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
                size="small"
            />

            {/* Modal création */}
            <Modal
                title="Créer une salle"
                open={createModal}
                onOk={() => form.submit()}
                onCancel={() => { setCreateModal(false); form.resetFields(); }}
                okText="Créer"
                confirmLoading={createLoading}
                destroyOnClose
                afterOpenChange={(open) => {
                    if (open) {
                        form.setFieldsValue({
                            openFrom: dayjs('08:00', 'HH:mm'),
                            openTo: dayjs('19:00', 'HH:mm'),
                        });
                    }
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={14}>
                            <Form.Item name="name" label="Nom de la salle" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={10}>
                            <Form.Item name="capacity" label="Capacité (pers.)" rules={[{ required: true }]}>
                                <Input type="number" min={1} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="location" label="Localisation">
                        <Input placeholder="Bâtiment A, 2ème étage, salle 201" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}>
                            <Form.Item name="openFrom" label="Ouverture">
                                <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="openTo" label="Fermeture">
                                <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="equipment" label="Équipements (séparés par virgule)">
                        <Input placeholder="Projecteur, Tableau blanc, Visioconférence" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal édition */}
            <Modal
                title={`Modifier — ${editModal.room?.name || ''}`}
                open={editModal.open}
                onOk={handleEditSubmit}
                onCancel={() => { setEditModal({ open: false, room: null }); editForm.resetFields(); }}
                okText="Enregistrer"
                confirmLoading={editLoading}
                destroyOnClose
            >
                <RoomFormFields f={editForm} />
            </Modal>
        </>
    );
}

// ════════════════════════════════════════════════════════════════════
// ONGLET RÔLES & PERMISSIONS
// ════════════════════════════════════════════════════════════════════
export function RolesPermissionsTab() {
    const [data, setData] = useState({ roles: {}, labels: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/users/role-permissions')
            .then((res) => setData({ roles: res.data?.roles || {}, labels: res.data?.labels || {} }))
            .catch(() => setData({ roles: {}, labels: {} }))
            .finally(() => setLoading(false));
    }, []);

    const roleOrder = ['RESPONSABLE', 'CONSOLIDATEUR', 'ADMIN', 'SUPER_ADMIN'];

    if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>;

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Droits et capacités associés à chaque rôle dans l&apos;application (lecture seule).
            </Text>
            <Row gutter={[16, 16]}>
                {roleOrder.map((roleKey) => (
                    <Col xs={24} md={12} key={roleKey}>
                        <Card size="small" title={<Tag color={ROLE_COLORS[roleKey]}>{data.labels[roleKey] || ROLE_LABELS[roleKey] || roleKey}</Tag>}>
                            <List
                                size="small"
                                dataSource={data.roles[roleKey] || []}
                                renderItem={(item) => (
                                    <List.Item style={{ padding: '4px 0', border: 'none' }}>
                                        <Text style={{ fontSize: 13 }}>• {item}</Text>
                                    </List.Item>
                                )}
                                locale={{ emptyText: 'Aucune permission définie' }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}

export function SecurityTab() {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [integratedVisioEnabled, setIntegratedVisioEnabled] = useState(true);
    const [directMessagesEnabled, setDirectMessagesEnabled] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/settings');
            setEnabled(String(data?.['2fa_enabled']) === 'true');
            setIntegratedVisioEnabled(String(data?.['integrated_visio_enabled'] ?? 'true') === 'true');
            setDirectMessagesEnabled(String(data?.['direct_messages_enabled'] ?? 'true') === 'true');
        } catch {
            message.error('Impossible de charger les paramètres de sécurité');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggle2FA = async (checked) => {
        setSaving(true);
        try {
            await api.put('/admin/settings', { '2fa_enabled': checked ? 'true' : 'false' });
            setEnabled(checked);
            message.success(`2FA globale ${checked ? 'activée' : 'désactivée'}`);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur mise à jour');
        } finally {
            setSaving(false);
        }
    };

    const toggleIntegratedVisio = async (checked) => {
        setSaving(true);
        try {
            await api.put('/admin/settings', { integrated_visio_enabled: checked ? 'true' : 'false' });
            setIntegratedVisioEnabled(checked);
            message.success(`Visio intégrée ${checked ? 'autorisée' : 'désactivée'} globalement`);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur mise à jour');
        } finally {
            setSaving(false);
        }
    };

    const toggleDirectMessages = async (checked) => {
        setSaving(true);
        try {
            await api.put('/admin/settings', { direct_messages_enabled: checked ? 'true' : 'false' });
            setDirectMessagesEnabled(checked);
            message.success(`Module discussion privée ${checked ? 'activé' : 'désactivé'} globalement`);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur mise à jour');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Spin />;

    return (
        <Card size="small" title={<><SafetyCertificateOutlined /> Sécurité globale</>}>
            <Space orientation="vertical" style={{ width: '100%' }}>
                <Text>Activer la double authentification (2FA) pour les utilisateurs</Text>
                <Switch checked={enabled} loading={saving} onChange={toggle2FA} />
                <Text>Autoriser la visio intégrée dans les réunions</Text>
                <Switch checked={integratedVisioEnabled} loading={saving} onChange={toggleIntegratedVisio} />
                <Text>Autoriser la discussion privée entre membres</Text>
                <Switch checked={directMessagesEnabled} loading={saving} onChange={toggleDirectMessages} />
            </Space>
        </Card>
    );
}

export function AppConfigTab() {
    const { message } = App.useApp();
    const { user: currentUser } = useAuth();
    const [form] = Form.useForm();
    const appLogoUrl = Form.useWatch('app_logo_url', form);
    const contactEmail = Form.useWatch('app_contact_email', form);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [smtpInfo, setSmtpInfo] = useState(null);
    const [smtpHint, setSmtpHint] = useState('');
    const [testEmail, setTestEmail] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [logoRemoving, setLogoRemoving] = useState(false);

    const logoPreviewSrc = resolveAppLogoSrc(appLogoUrl);
    const customLogo = hasCustomAppLogo(appLogoUrl);

    const load = async () => {
        setLoading(true);
        try {
            const [settingsRes, emailRes] = await Promise.all([
                api.get('/admin/settings'),
                api.get('/admin/settings/email-config').catch(() => ({ data: null })),
            ]);
            const data = settingsRes.data;
            form.setFieldsValue({
                app_name: data?.app_name || 'ADM GP',
                app_contact_email: data?.app_contact_email || '',
                app_contact_phone: data?.app_contact_phone || '',
                app_contact_address: data?.app_contact_address || '',
                app_footer_text: data?.app_footer_text || '© 2026 ADM GP - Tous droits réservés',
                app_logo_url: data?.app_logo_url || '',
            });
            setSmtpInfo(emailRes.data?.smtp || null);
            setSmtpHint(emailRes.data?.hint || '');
            const defaultTo = data?.app_contact_email?.trim()
                || currentUser?.email
                || '';
            setTestEmail(defaultTo);
        } catch {
            message.error('Impossible de charger la configuration globale');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await api.put('/admin/settings', values);
            message.success('Configuration globale enregistrée');
            if (values.app_contact_email?.trim()) {
                setTestEmail(values.app_contact_email.trim());
            }
        } catch (err) {
            if (!err?.errorFields) {
                message.error(err?.response?.data?.error || 'Erreur sauvegarde');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveLogo = async () => {
        setLogoRemoving(true);
        try {
            await api.delete('/admin/settings/logo');
            form.setFieldValue('app_logo_url', '');
            message.success('Logo personnalisé supprimé. Le logo par défaut sera affiché.');
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur lors de la suppression du logo');
        } finally {
            setLogoRemoving(false);
        }
    };

    const runEmailTest = async (verifyOnly) => {
        const to = testEmail?.trim() || contactEmail?.trim() || currentUser?.email;
        if (!verifyOnly && !to) {
            message.warning('Indiquez une adresse e-mail de destination.');
            return;
        }
        setTestLoading(true);
        setTestResult(null);
        try {
            const { data } = await api.post('/admin/settings/test-email', {
                to: to || undefined,
                verifyOnly,
            });
            setTestResult({ type: 'success', ...data });
            message.success(data.message || (verifyOnly ? 'Connexion SMTP OK' : 'E-mail envoyé'));
        } catch (err) {
            const payload = err?.response?.data || {};
            setTestResult({
                type: 'error',
                error: payload.error || 'Échec du test',
                hint: payload.hint,
                smtp: payload.smtp,
            });
            message.error(payload.error || 'Échec du test e-mail');
        } finally {
            setTestLoading(false);
        }
    };

    if (loading) return <Spin />;

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small" title={<><SettingOutlined /> Configuration globale</>}>
            <Form form={form} layout="vertical">
                <Form.Item name="app_name" label="Nom de l'application" rules={[{ required: true, message: 'Champ requis' }]}>
                    <Input placeholder="ADM GP" />
                </Form.Item>
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <Form.Item name="app_contact_email" label="Email de contact" rules={[{ type: 'email', message: 'Email invalide' }]}>
                            <Input placeholder="contact@entreprise.com" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="app_contact_phone" label="Téléphone de contact">
                            <Input placeholder="+221 77 000 00 00" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="app_contact_address" label="Adresse">
                    <Input placeholder="Adresse postale / siège" />
                </Form.Item>
                <Form.Item name="app_footer_text" label="Texte du footer" rules={[{ required: true, message: 'Champ requis' }]}>
                    <Input />
                </Form.Item>
                <Form.Item
                    label="Logo de l'application"
                    extra={customLogo
                        ? 'Logo personnalisé actif. Supprimez-le pour revenir au logo par défaut.'
                        : `Aucun logo personnalisé — le logo par défaut (${DEFAULT_APP_LOGO_PATH}) est affiché.`}
                >
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Space wrap>
                            <Upload
                                showUploadList={false}
                                accept="image/*"
                                customRequest={async ({ file, onSuccess, onError }) => {
                                    try {
                                        const fd = new FormData();
                                        fd.append('logo', file);
                                        const { data } = await api.post('/admin/settings/logo', fd, {
                                            headers: { 'Content-Type': 'multipart/form-data' },
                                        });
                                        form.setFieldValue('app_logo_url', data?.app_logo_url || '');
                                        onSuccess?.('ok');
                                        message.success('Logo mis à jour');
                                    } catch (err) {
                                        onError?.(err);
                                        message.error(err?.response?.data?.error || 'Erreur upload logo');
                                    }
                                }}
                            >
                                <Button>Importer un logo</Button>
                            </Upload>
                            {customLogo && (
                                <Popconfirm
                                    title="Supprimer le logo personnalisé ?"
                                    description="Le logo par défaut (gp-64.png) sera utilisé dans toute l'application."
                                    okText="Supprimer"
                                    cancelText="Annuler"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={handleRemoveLogo}
                                >
                                    <Button danger icon={<DeleteOutlined />} loading={logoRemoving}>
                                        Supprimer le logo
                                    </Button>
                                </Popconfirm>
                            )}
                        </Space>
                        <Form.Item name="app_logo_url" noStyle>
                            <Input type="hidden" />
                        </Form.Item>
                        <div>
                            <img
                                src={logoPreviewSrc}
                                alt="Aperçu du logo"
                                style={{
                                    maxHeight: 64,
                                    objectFit: 'contain',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6,
                                    padding: 6,
                                    background: '#fafafa',
                                }}
                            />
                            <div style={{ marginTop: 6 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {customLogo ? 'Aperçu du logo personnalisé' : 'Logo par défaut'}
                                </Text>
                            </div>
                        </div>
                    </Space>
                </Form.Item>
                <Button type="primary" loading={saving} onClick={handleSave}>
                    Enregistrer
                </Button>
            </Form>
        </Card>

        <Card
            size="small"
            title={<><MailOutlined /> Test d&apos;envoi des e-mails</>}
        >
            {/* <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
                Vérifie la connexion au serveur SMTP (variables <Text code>SMTP_*</Text> dans{' '}
                <Text code>backend/.env</Text> sur le serveur). Un e-mail de test reprend le nom
                de l&apos;application et le logo configurés ci-dessus.
            </Paragraph> */}

            {smtpInfo && (
                <Descriptions
                    size="small"
                    bordered
                    column={1}
                    style={{ marginBottom: 16 }}
                    items={[
                        { key: 'host', label: 'Serveur', children: `${smtpInfo.host}:${smtpInfo.port}${smtpInfo.secure ? ' (TLS)' : ''}` },
                        { key: 'from', label: 'Expéditeur', children: smtpInfo.from },
                        { key: 'user', label: 'Compte SMTP', children: smtpInfo.user || '—' },
                        {
                            key: 'auth',
                            label: 'Authentification',
                            children: smtpInfo.authConfigured
                                ? <Tag color="green">Configurée</Tag>
                                : <Tag color="orange">Non configurée (localhost / relais ouvert)</Tag>,
                        },
                    ]}
                />
            )}
            {smtpHint && (
                <Alert type="info" showIcon message={smtpHint} style={{ marginBottom: 16 }} />
            )}

            <Form layout="vertical" onFinish={() => runEmailTest(false)}>
                <Form.Item
                    label="Adresse de destination"
                    extra="Par défaut : e-mail de contact ci-dessus, sinon votre compte connecté."
                >
                    <Input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="exemple@adm.gouv.sn"
                        prefix={<MailOutlined />}
                        allowClear
                    />
                </Form.Item>
                <Space wrap>
                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<MailOutlined />}
                        loading={testLoading}
                    >
                        Envoyer un e-mail de test
                    </Button>
                    <Button
                        loading={testLoading}
                        onClick={() => runEmailTest(true)}
                    >
                        Vérifier la connexion SMTP seulement
                    </Button>
                </Space>
            </Form>

            {testResult && (
                <Alert
                    style={{ marginTop: 16 }}
                    type={testResult.type === 'success' ? 'success' : 'error'}
                    showIcon
                    message={testResult.type === 'success' ? 'Test réussi' : 'Test échoué'}
                    description={
                        <div>
                            <div>{testResult.message || testResult.error}</div>
                            {testResult.hint && <div style={{ marginTop: 8 }}>{testResult.hint}</div>}
                            {testResult.messageId && (
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                                    ID message : {testResult.messageId}
                                </Text>
                            )}
                        </div>
                    }
                />
            )}
        </Card>
        </Space>
    );
}

