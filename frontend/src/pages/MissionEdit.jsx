import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    Spin,
} from 'antd';
import { ArrowLeftOutlined, FlagOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';

const { Title } = Typography;

export default function MissionEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [users, setUsers] = useState([]);
    const [directions, setDirections] = useState([]);
    const [projects, setProjects] = useState([]);
    const [mission, setMission] = useState(null);
    const [loading, setLoading] = useState(true);
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
            api.get(`/missions/${id}`),
            api.get('/users/participants'),
            api.get('/events/taxonomy'),
        ])
            .then(([missionRes, usersRes, taxonomyRes]) => {
                setMission(missionRes.data);
                setUsers(usersRes.data || []);
                setDirections(taxonomyRes?.data?.directions || []);
                setProjects(taxonomyRes?.data?.projects || []);
                form.setFieldsValue({
                    title: missionRes.data.title,
                    description: missionRes.data.description || '',
                    location: missionRes.data.location,
                    directionId: missionRes.data.directionId || undefined,
                    projectId: missionRes.data.projectId || undefined,
                    startTime: missionRes.data.startTime ? dayjs(missionRes.data.startTime) : null,
                    endTime: missionRes.data.endTime ? dayjs(missionRes.data.endTime) : null,
                    userIds: missionRes.data.assignments?.map((a) => a.userId) || [],
                });
            })
            .catch(() => {
                message.error('Mission introuvable');
                navigate('/missions');
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    const handleSubmit = async (values) => {
        const start = values.startTime?.toISOString?.() ?? values.startTime;
        const end = values.endTime?.toISOString?.() ?? values.endTime;
        if (!start || !end || new Date(start) >= new Date(end)) {
            message.error('La fin doit être après le début.');
            return;
        }
        setSubmitting(true);
        try {
            await api.put(`/missions/${id}`, {
                title: values.title,
                description: values.description || undefined,
                location: values.location,
                directionId: values.directionId || undefined,
                projectId: values.projectId || undefined,
                startTime: start,
                endTime: end,
                userIds: values.userIds || [],
            });
            message.success('Mission mise à jour.');
            navigate(`/missions/${id}`);
        } catch (err) {
            message.error(formatConflictError(err) || 'Erreur lors de l\'enregistrement');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!mission) return null;

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/missions/${id}`)}>
                    Retour à la mission
                </Button>
            </div>

            <Card>
                <Title level={4} style={{ marginBottom: 24 }}>
                    <FlagOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    Modifier la mission
                </Title>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
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
                        label="Intervenants"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Sélectionner les intervenants"
                            optionFilterProp="label"
                            options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={submitting} size="large">
                                Enregistrer
                            </Button>
                            <Button size="large" onClick={() => navigate(`/missions/${id}`)}>
                                Annuler
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
