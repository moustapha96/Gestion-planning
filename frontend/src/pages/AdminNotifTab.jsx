import { useState, useEffect } from 'react';
import {
    Form, Input, Select, Button, Card, Alert, Typography, Space,
    Divider, Tag, Row, Col, App,
} from 'antd';
import { SendOutlined, BellOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import api from '../api/client';

const { TextArea } = Input;
const { Title, Text } = Typography;

const ROLE_LABELS = {
    RESPONSABLE: 'Responsable', CONSOLIDATEUR: 'Consolidateur', COORDINATEUR_PROJET: 'Coord. projet',
    SECRETAIRE_GENERAL: 'Secr. général', DG: 'Dir. Général', ADMIN: 'Administrateur', SUPER_ADMIN: 'Super admin',
};
const ROLE_COLORS = {
    RESPONSABLE: 'blue', CONSOLIDATEUR: 'purple', COORDINATEUR_PROJET: 'geekblue', SECRETAIRE_GENERAL: 'cyan',
    DG: 'gold', ADMIN: 'red', SUPER_ADMIN: 'magenta',
};

const AUDIENCE_OPTIONS = [
    { value: 'ALL', label: 'Tous les utilisateurs actifs', icon: <TeamOutlined /> },
    { value: 'ROLE', label: 'Par rôle', icon: <UserOutlined /> },
    { value: 'USERS', label: 'Utilisateurs spécifiques', icon: <UserOutlined /> },
];

export default function AdminNotifTab() {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [audience, setAudience] = useState('ALL');
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.get('/users')
            .then((r) => setUsers(r.data || []))
            .catch(() => setUsers([]));
    }, []);

    const handleSend = async (values) => {
        setLoading(true);
        setResult(null);
        try {
            const payload = {
                audience: values.audience,
                title: values.title,
                body: values.body,
                link: values.link || null,
            };
            if (values.audience === 'ROLE') payload.role = values.role;
            if (values.audience === 'USERS') payload.userIds = values.userIds;

            const res = await api.post('/notifications/admin/send', payload);
            setResult({ success: true, sent: res.data.sent, total: res.data.total });
            message.success(`Notification envoyée à ${res.data.sent} utilisateur(s)`);
            form.resetFields(['title', 'body', 'link']);
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Erreur lors de l\'envoi';
            setResult({ success: false, error: errMsg });
            message.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Envoyez une notification in-app à un groupe d&apos;utilisateurs. Les notifications apparaissent
                dans la cloche en haut de l&apos;interface (CDC §3.8 — admin_broadcast).
            </Text>

            <Row gutter={24}>
                <Col xs={24} lg={14}>
                    <Card title={<><BellOutlined /> Nouvelle notification</>} size="small">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSend}
                            initialValues={{ audience: 'ALL' }}
                        >
                            {/* Audience */}
                            <Form.Item
                                name="audience"
                                label="Destinataires"
                                rules={[{ required: true }]}
                            >
                                <Select
                                    options={AUDIENCE_OPTIONS}
                                    onChange={(v) => { setAudience(v); }}
                                />
                            </Form.Item>

                            {/* Rôle */}
                            {audience === 'ROLE' && (
                                <Form.Item
                                    name="role"
                                    label="Rôle cible"
                                    rules={[{ required: true, message: 'Sélectionner un rôle' }]}
                                >
                                    <Select
                                        options={Object.entries(ROLE_LABELS).map(([v, l]) => ({
                                            value: v,
                                            label: <><Tag color={ROLE_COLORS[v]}>{l}</Tag></>,
                                        }))}
                                    />
                                </Form.Item>
                            )}

                            {/* Utilisateurs spécifiques */}
                            {audience === 'USERS' && (
                                <Form.Item
                                    name="userIds"
                                    label="Utilisateurs"
                                    rules={[{ required: true, message: 'Sélectionner au moins un utilisateur', type: 'array', min: 1 }]}
                                >
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Rechercher un utilisateur…"
                                        options={users.map((u) => ({
                                            value: u.id,
                                            label: `${u.name} — ${u.email}`,
                                        }))}
                                    />
                                </Form.Item>
                            )}

                            <Divider style={{ margin: '12px 0' }} />

                            {/* Titre */}
                            <Form.Item
                                name="title"
                                label="Titre"
                                rules={[{ required: true, message: 'Titre requis', max: 100 }]}
                            >
                                <Input
                                    placeholder="Ex : Maintenance prévue vendredi"
                                    maxLength={100}
                                    showCount
                                />
                            </Form.Item>

                            {/* Corps */}
                            <Form.Item
                                name="body"
                                label="Message"
                                rules={[{ required: true, message: 'Message requis', max: 500 }]}
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="Contenu de la notification…"
                                    maxLength={500}
                                    showCount
                                />
                            </Form.Item>

                            {/* Lien (optionnel) */}
                            <Form.Item
                                name="link"
                                label="Lien (optionnel)"
                                rules={[{ type: 'string', max: 200 }]}
                            >
                                <Input
                                    placeholder="Ex : /planning ou /meetings"
                                    prefix={<Text type="secondary">/</Text>}
                                />
                            </Form.Item>

                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    icon={<SendOutlined />}
                                    block
                                >
                                    Envoyer la notification
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* Résultat */}
                    {result && (
                        <div style={{ marginTop: 16 }}>
                            {result.success ? (
                                <Alert
                                    type="success"
                                    showIcon
                                    message={`Envoyé à ${result.sent} / ${result.total} utilisateur(s)`}
                                />
                            ) : (
                                <Alert type="error" showIcon message={result.error} />
                            )}
                        </div>
                    )}
                </Col>

                {/* ── Guide d'utilisation ── */}
                <Col xs={24} lg={10}>
                    <Card title="Guide" size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                                <Text strong><TeamOutlined /> Tous les utilisateurs</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Notifications, maintenances, annonces globales.
                                </Text>
                            </div>
                            <div>
                                <Text strong><UserOutlined /> Par rôle</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Ex : alerter uniquement les Consolidateurs ou DG.
                                </Text>
                            </div>
                            <div>
                                <Text strong><UserOutlined /> Utilisateurs spécifiques</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Ciblage précis d&apos;une ou plusieurs personnes.
                                </Text>
                            </div>
                            <Divider style={{ margin: '8px 0' }} />
                            <Alert
                                type="warning"
                                message="Les notifications in-app restent visibles jusqu'à ce que l'utilisateur les marque comme lues."
                                showIcon
                                style={{ fontSize: 12 }}
                            />
                            <Alert
                                type="info"
                                message="Chaque envoi est enregistré dans les journaux d'audit."
                                showIcon
                                style={{ fontSize: 12 }}
                            />
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
