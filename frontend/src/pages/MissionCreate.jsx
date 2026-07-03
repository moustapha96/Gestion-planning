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
} from 'antd';
import { ArrowLeftOutlined, FlagOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import { appDayjs, toUtcIso } from '../utils/datetime';
import { useAuth } from '../context/AuthContext';
import { isResponsable } from '../utils/roles';
import ResponsibleProjectField, { ResponsibleProjectBanner } from '../components/ResponsibleProjectField';
import { applyDefaultProjectToForm, useResponsibleProjectScope } from '../hooks/useResponsibleProjectScope';

const { Title } = Typography;

export default function MissionCreate() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [users, setUsers] = useState([]);
    const [directions, setDirections] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const projectIdFromUrl = searchParams.get('projectId');
    const {
        loading: projectLoading,
        assignableProjects,
        defaultProjectId,
        primaryProject,
        lockedSingle,
        canSubmit,
    } = useResponsibleProjectScope(user, { projectIdFromUrl });

    useEffect(() => {
        api.get('/users/participants')
            .then((usersRes) => setUsers(usersRes.data || []))
            .catch(() => setUsers([]));
    }, []);

    useEffect(() => {
        api.get('/events/taxonomy')
            .then((taxonomyRes) => setDirections(taxonomyRes?.data?.directions || []))
            .catch(() => setDirections([]));
    }, []);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return;
        const d = appDayjs(dateParam);
        form.setFieldsValue({
            startTime: d.hour(9).minute(0).second(0),
            endTime: d.hour(12).minute(0).second(0),
        });
    }, [searchParams, form]);

    useEffect(() => {
        if (defaultProjectId) {
            applyDefaultProjectToForm(form, defaultProjectId);
        }
    }, [defaultProjectId, form]);

    const handleSubmit = async (values) => {
        if (!canSubmit) {
            message.warning("Vous n'êtes responsable d'aucun projet actif.");
            return;
        }
        const start = toUtcIso(values.startTime);
        const end = toUtcIso(values.endTime);
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
                projectId: values.projectId || defaultProjectId || undefined,
                startTime: start,
                endTime: end,
                userIds: values.userIds || [],
            });
            message.success(
                isResponsable(user?.role)
                    ? 'Mission créée en brouillon — en attente de validation.'
                    : 'Mission créée en brouillon.',
            );
            navigate(`/missions/${res.data?.id}`);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de la création');
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

                <ResponsibleProjectBanner
                    user={user}
                    assignableProjects={assignableProjects}
                    loading={projectLoading}
                    primaryProject={primaryProject}
                />

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
                        <Input placeholder="Ex. Intervention client X" size="large" disabled={!canSubmit} />
                    </Form.Item>
                    <Form.Item
                        name="location"
                        label="Lieu"
                        rules={[{ required: true, message: 'Requis' }]}
                    >
                        <Input placeholder="Adresse ou lieu de la mission" size="large" disabled={!canSubmit} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={4} placeholder="Détails de la mission..." disabled={!canSubmit} />
                    </Form.Item>
                    <Form.Item name="directionId" label="Direction (optionnel)">
                        <Select
                            allowClear
                            placeholder="Choisir une direction"
                            options={directions.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                            size="large"
                            disabled={!canSubmit}
                        />
                    </Form.Item>
                    <ResponsibleProjectField
                        user={user}
                        assignableProjects={assignableProjects}
                        lockedSingle={lockedSingle}
                        size="large"
                    />
                    <Form.Item
                        name="startTime"
                        label="Date et heure de début"
                        rules={[{ required: true, message: 'Requis' }]}
                    >
                        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} size="large" disabled={!canSubmit} />
                    </Form.Item>
                    <Form.Item
                        name="endTime"
                        label="Date et heure de fin"
                        rules={[{ required: true, message: 'Requis' }]}
                    >
                        <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} size="large" disabled={!canSubmit} />
                    </Form.Item>
                    <Form.Item
                        name="userIds"
                        label="Intervenants (optionnel)"
                        extra="Les intervenants seront notifiés après validation de la mission."
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
                            disabled={!canSubmit}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={submitting} size="large" disabled={!canSubmit}>
                                Créer la mission
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
