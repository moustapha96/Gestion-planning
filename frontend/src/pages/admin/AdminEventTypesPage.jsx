import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Table, Button, Typography, Space, Modal, Form, Input, InputNumber, Switch, App, Tag, Grid,
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import api from '../../api/client';

const { Text } = Typography;

export default function AdminEventTypesPage() {
    const { message } = App.useApp();
    const screens = Grid.useBreakpoint();
    const compact = !screens.md;
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState({ open: false, record: null });
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/events/event-types', { params: { all: '1' } });
            setRows(Array.isArray(data) ? data : []);
        } catch {
            message.error('Impossible de charger les types d\'événement');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        form.resetFields();
        form.setFieldsValue({ color: '#1565C0', sortOrder: 100, isActive: true });
        setModal({ open: true, record: null });
    };

    const openEdit = (record) => {
        form.setFieldsValue({
            name: record.name,
            code: record.code,
            color: record.color || '#1565C0',
            sortOrder: record.sortOrder ?? 0,
            isActive: record.isActive !== false,
        });
        setModal({ open: true, record });
    };

    const handleSave = async () => {
        try {
            const v = await form.validateFields();
            setSaving(true);
            if (modal.record) {
                await api.put(`/events/event-types/${modal.record.id}`, v);
                message.success('Type mis à jour');
            } else {
                await api.post('/events/event-types', v);
                message.success('Type créé');
            }
            setModal({ open: false, record: null });
            load();
        } catch (err) {
            if (err.errorFields) return;
            message.error(err.response?.data?.error || 'Erreur');
        } finally {
            setSaving(false);
        }
    };

    const columns = useMemo(() => [
        {
            title: 'Libellé',
            dataIndex: 'name',
            key: 'name',
            render: (name, r) => (
                <Space>
                    <span
                        style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: r.color || '#ccc',
                            verticalAlign: 'middle',
                        }}
                    />
                    {name}
                </Space>
            ),
        },
        { title: 'Code', dataIndex: 'code', key: 'code', width: 140 },
        {
            title: 'Actif',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 90,
            render: (a) => (a !== false ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag>),
        },
        { title: 'Ordre', dataIndex: 'sortOrder', key: 'sortOrder', width: 80 },
        {
            title: '',
            key: 'actions',
            width: 100,
            render: (_, r) => (
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
                    Modifier
                </Button>
            ),
        },
    ], []);

    return (
        <div>
            <Space style={{ marginBottom: 16 }} wrap>
                <Text type="secondary">
                    Ces types sont proposés lors de la création d&apos;événements de planning et de réunions.
                </Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Nouveau type
                </Button>
            </Space>
            <Table
                rowKey="id"
                loading={loading}
                dataSource={rows}
                columns={columns}
                pagination={compact ? { pageSize: 8 } : { pageSize: 15 }}
                size="small"
            />
            <Modal
                title={modal.record ? 'Modifier le type' : 'Nouveau type d\'événement'}
                open={modal.open}
                onCancel={() => setModal({ open: false, record: null })}
                onOk={handleSave}
                confirmLoading={saving}
                destroyOnClose
                width={480}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item name="name" label="Libellé" rules={[{ required: true, message: 'Requis' }]}>
                        <Input placeholder="ex. Atelier interne" />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Code technique"
                        rules={[{ required: true, message: 'Requis' }]}
                        extra="Majuscules et underscores (ex. ATELIER). Unique."
                    >
                        <Input placeholder="ATELIER" disabled={Boolean(modal.record)} style={modal.record ? { color: '#888' } : undefined} />
                    </Form.Item>
                    <Form.Item name="color" label="Couleur (affichage)" rules={[{ required: true }]}>
                        <Input type="color" style={{ width: 120, height: 36, padding: 2 }} />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="Ordre d'affichage">
                        <InputNumber min={0} max={9999} style={{ width: '100%' }} />
                    </Form.Item>
                    {modal.record && (
                        <Form.Item name="isActive" label="Actif" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
