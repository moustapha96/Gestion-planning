import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Tag, Descriptions, Table, Spin, App } from 'antd';
import { ArrowLeftOutlined, EditOutlined, MessageOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { ROLE_COLORS, ROLE_LABELS } from '../../utils/roles';
import DirectionStaffAssign from './DirectionStaffAssign';

const { Title, Text } = Typography;

export default function DirectionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true);
    const [direction, setDirection] = useState(null);

    const load = async () => {
        const { data } = await api.get(`/events/directions/${id}`);
        setDirection(data || null);
    };

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await api.get(`/events/directions/${id}`);
                if (!active) return;
                setDirection(data || null);
            } catch (err) {
                message.error(err?.response?.data?.error || 'Impossible de charger la direction.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [id, message]);

    const users = Array.isArray(direction?.users) ? direction.users : [];

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

                    <DirectionStaffAssign directionId={id} direction={direction} onChanged={load} />

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
