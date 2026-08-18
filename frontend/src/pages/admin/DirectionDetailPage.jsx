import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Card, Typography, Space, Button, Tag, Descriptions, Table, Spin, App, Select, Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, MessageOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { ROLE_COLORS, ROLE_LABELS, ROLES, roleLabel, isEligibleDirectionDirector } from '../../utils/roles';

const { Title, Text } = Typography;

export default function DirectionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [direction, setDirection] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [dgUserId, setDgUserId] = useState(null);
    const [assistantUserId, setAssistantUserId] = useState(null);

    const load = async () => {
        const { data } = await api.get(`/events/directions/${id}`);
        setDirection(data || null);
        setDgUserId(data?.directorId || data?.director?.id || null);
    };

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const [dirRes, usersRes] = await Promise.all([
                    api.get(`/events/directions/${id}`),
                    api.get('/users').catch(() => ({ data: [] })),
                ]);
                if (!active) return;
                setDirection(dirRes.data || null);
                setDgUserId(dirRes.data?.directorId || dirRes.data?.director?.id || null);
                setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []));
            } catch (err) {
                message.error(err?.response?.data?.error || 'Impossible de charger la direction.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false };
    }, [id, message]);

    const users = Array.isArray(direction?.users) ? direction.users : [];
    const assistants = Array.isArray(direction?.assistants)
        ? direction.assistants
        : users.filter((u) => u.role === ROLES.ASSISTANT);

    const assignableUsers = allUsers.filter((u) => u.isActive !== false && !u.isDeleted);
    const dgCandidates = assignableUsers.filter((u) => isEligibleDirectionDirector(u));

    const assignDg = async () => {
        if (!dgUserId) return;
        setSaving(true);
        try {
            await api.post(`/events/directions/${id}/dg`, { userId: dgUserId });
            message.success('DG affecté');
            await load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Affectation DG refusée');
        } finally {
            setSaving(false);
        }
    };

    const removeDg = async () => {
        setSaving(true);
        try {
            await api.delete(`/events/directions/${id}/dg`);
            message.success('DG retiré');
            setDgUserId(null);
            await load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Impossible de retirer le DG');
        } finally {
            setSaving(false);
        }
    };

    const addAssistant = async () => {
        if (!assistantUserId) return;
        setSaving(true);
        try {
            await api.post(`/events/directions/${id}/assistants`, { userId: assistantUserId });
            message.success('Assistant ajouté');
            setAssistantUserId(null);
            await load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Ajout Assistant refusé');
        } finally {
            setSaving(false);
        }
    };

    const removeAssistant = async (userId) => {
        setSaving(true);
        try {
            await api.delete(`/events/directions/${id}/assistants/${userId}`);
            message.success('Assistant retiré');
            await load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Impossible de retirer l\'Assistant');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Space style={{ marginBottom: 16 }} wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/directions')}>
                    Retour
                </Button>
                <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/admin/directions/${id}/edit`)}>
                    Modifier
                </Button>
                <Button icon={<MessageOutlined />} onClick={() => navigate('/discussions?channel=direction')}>
                    Messagerie de la direction
                </Button>
            </Space>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
            ) : !direction ? (
                <Card><Text type="secondary">Direction introuvable.</Text></Card>
            ) : (
                <>
                    <Card style={{ marginBottom: 16 }}>
                        <Title level={4} style={{ marginTop: 0 }}>{direction.name}</Title>
                        <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Logo">
                                {direction.logoUrl ? (
                                    <Space>
                                        <img
                                            src={direction.logoUrl}
                                            alt={`Logo ${direction.name}`}
                                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0' }}
                                        />
                                        <Text code>{direction.logoUrl}</Text>
                                    </Space>
                                ) : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Code">{direction.code || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Description">{direction.description || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Statut">
                                <Tag color={direction.isActive ? 'green' : 'red'}>{direction.isActive ? 'Actif' : 'Inactif'}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Utilisateurs">{users.length}</Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card
                        title="DG"
                        extra={<Text type="secondary">Rôles autorisés : DG, Directeur, Admin, Super admin</Text>}
                        style={{ marginBottom: 16 }}
                    >
                        <Space wrap style={{ width: '100%', marginBottom: 12 }}>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Choisir un DG (DG, Directeur, Admin)"
                                style={{ minWidth: 280 }}
                                value={dgUserId}
                                onChange={setDgUserId}
                                options={dgCandidates.map((u) => ({
                                    value: u.id,
                                    label: `${u.name} (${roleLabel(u.role)}${u.jobTitle ? ` — ${u.jobTitle}` : ''})`,
                                }))}
                            />
                            <Button type="primary" loading={saving} onClick={assignDg}>
                                Affecter / remplacer
                            </Button>
                            {direction.director && (
                                <Popconfirm title="Retirer le DG de cette direction ?" onConfirm={removeDg}>
                                    <Button danger>Retirer</Button>
                                </Popconfirm>
                            )}
                        </Space>
                        {direction.director ? (
                            <Text>
                                DG actuel : <Text strong>{direction.director.name}</Text> ({direction.director.email})
                            </Text>
                        ) : (
                            <Text type="secondary">Aucun DG — les demandes des Assistants seront auto-validées.</Text>
                        )}
                    </Card>

                    <Card title={`Assistants (${assistants.length})`} style={{ marginBottom: 16 }}>
                        <Space wrap style={{ marginBottom: 12 }}>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Ajouter un Assistant"
                                style={{ minWidth: 280 }}
                                value={assistantUserId}
                                onChange={setAssistantUserId}
                                options={assignableUsers
                                    .filter((u) => !assistants.some((a) => a.id === u.id))
                                    .map((u) => ({
                                        value: u.id,
                                        label: `${u.name} (${roleLabel(u.role)})`,
                                    }))}
                            />
                            <Button icon={<UserAddOutlined />} loading={saving} onClick={addAssistant}>
                                Ajouter
                            </Button>
                        </Space>
                        <Table
                            rowKey="id"
                            size="small"
                            dataSource={assistants}
                            pagination={false}
                            locale={{ emptyText: 'Aucun assistant' }}
                            columns={[
                                { title: 'Nom', dataIndex: 'name' },
                                { title: 'Email', dataIndex: 'email' },
                                {
                                    title: '',
                                    key: 'actions',
                                    width: 90,
                                    render: (_, record) => (
                                        <Popconfirm title="Retirer cet Assistant ?" onConfirm={() => removeAssistant(record.id)}>
                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                    ),
                                },
                            ]}
                        />
                    </Card>

                    <Card title="Utilisateurs du département">
                        <Table
                            rowKey="id"
                            size="small"
                            dataSource={users}
                            pagination={{ pageSize: 10, showTotal: (t) => `${t} utilisateur(s)` }}
                            columns={[
                                { title: 'Nom', dataIndex: 'name', key: 'name' },
                                { title: 'Email', dataIndex: 'email', key: 'email' },
                                {
                                    title: 'Rôle',
                                    dataIndex: 'role',
                                    key: 'role',
                                    render: (role) => <Tag color={ROLE_COLORS[role] || 'default'}>{ROLE_LABELS[role] || role}</Tag>,
                                },
                                {
                                    title: 'Statut',
                                    dataIndex: 'isActive',
                                    key: 'isActive',
                                    render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Actif' : 'Inactif'}</Tag>,
                                },
                            ]}
                        />
                    </Card>
                </>
            )}
        </div>
    );
}
