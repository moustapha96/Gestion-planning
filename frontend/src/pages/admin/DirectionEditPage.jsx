import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Switch, App, Space, Upload, Typography } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import api from '../../api/client';

const { Text } = Typography;

function isValidLogoValue(value) {
    const v = String(value || '').trim();
    if (!v) return false;
    return /^https?:\/\//i.test(v) || v.startsWith('/');
}

const logoRules = [
    { required: true, message: 'Le logo est obligatoire' },
    {
        validator: (_, value) => {
            if (isValidLogoValue(value)) return Promise.resolve();
            return Promise.reject(new Error('Utilisez une URL (http/https) ou un chemin local commençant par /.'));
        },
    },
];

export default function DirectionEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const logoUrl = Form.useWatch('logoUrl', form);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await api.get(`/events/directions/${id}`);
                if (!active || !data) return;
                form.setFieldsValue({
                    name: data.name || '',
                    code: data.code || '',
                    logoUrl: data.logoUrl || '',
                    description: data.description || '',
                    isActive: Boolean(data.isActive),
                });
            } catch (err) {
                message.error(err?.response?.data?.error || 'Impossible de charger la direction.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [form, id, message]);

    const uploadLogoToServer = async (file) => {
        const fd = new FormData();
        fd.append('logo', file);
        const { data } = await api.post('/events/directions/logo', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const next = data?.logoUrl || '';
        form.setFieldsValue({ logoUrl: next });
        message.success('Logo uploadé avec succès.');
    };

    const onSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await api.put(`/events/directions/${id}`, values);
            message.success('Direction modifiée.');
            navigate(`/admin/directions/${id}`);
        } catch (err) {
            if (!err?.errorFields) {
                message.error(err?.response?.data?.error || 'Erreur modification direction.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Space style={{ marginBottom: 16 }} wrap>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/admin/directions/${id}`)}>
                    Retour détails
                </Button>
            </Space>
            <Card title="Modifier la direction">
                <Form form={form} layout="vertical" disabled={loading}>
                    <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Champ requis' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="code" label="Code">
                        <Input />
                    </Form.Item>
                    <Form.Item name="logoUrl" label="Logo (URL)" rules={logoRules} extra="Formats acceptés : https://... ou /uploads/... ou /logo.png">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Ou importer un logo (image)">
                        <Upload
                            showUploadList={false}
                            accept="image/*"
                            customRequest={async ({ file, onSuccess, onError }) => {
                                try {
                                    setLogoUploading(true);
                                    await uploadLogoToServer(file);
                                    onSuccess?.('ok');
                                } catch (err) {
                                    message.error(err?.response?.data?.error || "Erreur lors de l'upload du logo.");
                                    onError?.(err);
                                } finally {
                                    setLogoUploading(false);
                                }
                            }}
                        >
                            <Button icon={<UploadOutlined />} loading={logoUploading}>
                                Déposer / sélectionner une image
                            </Button>
                        </Upload>
                    </Form.Item>
                    <Form.Item label="Aperçu du logo">
                        {isValidLogoValue(logoUrl) ? (
                            <img
                                src={String(logoUrl).trim()}
                                alt="Aperçu logo direction"
                                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0', background: '#fff' }}
                            />
                        ) : (
                            <Text type="secondary">Saisissez une URL ou un chemin local valide pour prévisualiser.</Text>
                        )}
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Actif" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Space>
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
                            Enregistrer
                        </Button>
                    </Space>
                </Form>
            </Card>
        </div>
    );
}

