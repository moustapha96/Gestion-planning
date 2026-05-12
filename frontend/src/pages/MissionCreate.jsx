import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Card,
    Form,
    Input,
    DatePicker,
    Select,
    Button,
    Space,
    Typography,
    App,
    Tag,
    Alert,
} from 'antd';
import { ArrowLeftOutlined, FlagOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';

const { Title, Text } = Typography;

export default function MissionCreate() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [users, setUsers] = useState([]);
    const [directions, setDirections] = useState([]);
    const [projects, setProjects] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const formatConflictError = (err) => {
        const data = err?.response?.data || {};
        const base = data.error || 'Conflit de planning détecté';
        if (!data.userId) return base;
        const u = users.find((x) => x.id === data.userId);
        if (!u) return base;
        return `${base} Utilisateur concerné : ${u.name} (${u.email}).`;
    };

    useEffect(() => {
        Promise.all([
            api.get('/users/participants'),
            api.get('/events/taxonomy'),
        ])
            .then(([usersRes, taxonomyRes]) => {
                setUsers(usersRes.data || []);
                setDirections(taxonomyRes?.data?.directions || []);
                setProjects(taxonomyRes?.data?.projects || []);
            })
            .catch(() => {
                setUsers([]);
                setDirections([]);
                setProjects([]);
            });
    }, []);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return;
        const d = dayjs(dateParam);
        form.setFieldsValue({
            startTime: d.hour(9).minute(0).second(0),
            endTime: d.hour(12).minute(0).second(0),
        });
    }, [searchParams, form]);

    const handleSubmit = async (values) => {
        const start = values.startTime?.toISOString?.() ?? values.startTime;
        const end = values.endTime?.toISOString?.() ?? values.endTime;
        if (!start || !end || new Date(start) >= new Date(end)) {
            message.error('La fin doit être après le début.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/missions', {
                title: values.title,
                description: values.description || undefined,
                location: values.location,
                directionId: values.directionId || undefined,
                projectId: values.projectId || undefined,
                startTime: start,
                endTime: end,
                userIds: values.userIds || [],
            });
            message.success('Mission créée. Les intervenants ont été notifiés.');
            navigate(`/missions/${res.data?.id}`);
        } catch (err) {
            message.error(formatConflictError(err) || 'Erreur lors de la création');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/missions')}>
                    Retour aux missions
                </Button>
            </div>

            <Card>
                <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                    marginBottom: 16,
                }}>
                    <Title level={4} style={{ margin: 0 }}>
                        <FlagOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                        Nouvelle mission
                    </Title>
                    <Tag
                        icon={<FlagOutlined />}
                        color="purple"
                        style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', margin: 0 }}
                    >
                        Type : Mission
                    </Tag>
                </div>

                {/* <Alert
                    type="info"
                    showIcon
                    title="Type d'événement verrouillé"
                    description={
                        <Text style={{ fontSize: 13 }}>
                            Toutes les entrées créées ici sont automatiquement de type <Text strong>Mission</Text>.
                            Pour créer un autre type d'événement (réunion, atelier, formation…), utilisez la
                            page <Text strong>« Événements »</Text> ou <Text strong>« Réunions »</Text>.
                        </Text>
                    }
                    style={{ marginBottom: 20 }}
                /> */}

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        startTime: dayjs().hour(9).minute(0).second(0),
                        endTime: dayjs().hour(12).minute(0).second(0),
                    }}
                    style={{ maxWidth: 560 }}
                >
                    <Form.Item
                        name="title"
                        label="Titre de la mission"
                        rules={[{ required: true, message: 'Requis' }]}
                    >
                        <Input placeholder="Ex. Intervention client X" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="location"
                        label="Lieu"
                        rules={[{ required: true, message: 'Requis' }]}
                    >
                        <Input placeholder="Adresse ou lieu de la mission" size="large" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={4} placeholder="Détails de la mission..." />
                    </Form.Item>
                    <Form.Item name="directionId" label="Direction (optionnel)">
                        <Select
                            allowClear
                            placeholder="Choisir une direction"
                            options={directions.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item name="projectId" label="Projet (optionnel)">
                        <Select
                            allowClear
                            placeholder="Choisir un projet"
                            options={projects.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name }))}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="startTime"
                        label="Date et heure de début"
                        rules={[{ required: true, message: 'Requis' }]}
                    >
                        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} size="large" />
                    </Form.Item>
                    <Form.Item
                        name="endTime"
                        label="Date et heure de fin"
                        rules={[{ required: true, message: 'Requis' }]}
                    >
                        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} size="large" />
                    </Form.Item>
                    <Form.Item
                        name="userIds"
                        label="Intervenants (optionnel)"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Sélectionner les personnes à assigner"
                            optionFilterProp="label"
                            options={users.map((u) => ({
                                value: u.id,
                                label: `${u.name}${u.jobTitle ? ` — ${u.jobTitle}` : ''} (${u.email})`,
                            }))}
                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={submitting} size="large">
                                Créer et notifier les intervenants
                            </Button>
                            <Button size="large" onClick={() => navigate('/missions')}>
                                Annuler
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
