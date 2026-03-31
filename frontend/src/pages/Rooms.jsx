import { useEffect, useState } from 'react';
import {
    Row,
    Col,
    Card,
    Tag,
    Typography,
    Space,
    Spin,
    Empty,
    App,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    Popconfirm,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    TeamOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    EditOutlined,
    StopOutlined,
    CheckCircleOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin } from '../utils/roles';

const { Title, Text } = Typography;

const STATUS_TAG = { FREE: 'success', BUSY: 'error', OCCUPIED: 'error', ACTIVE: 'processing', DISABLED: 'default' };
const STATUS_LABEL = {
    FREE: 'Libre',
    BUSY: 'Occupée',
    OCCUPIED: 'Occupée',
    ACTIVE: 'Active',
    DISABLED: 'Désactivée',
};

export default function Rooms() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = isPrivilegedAdmin(user?.role);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [form] = Form.useForm();

    const fetchRooms = () => {
        setLoading(true);
        const url = isAdmin ? '/rooms?all=1' : '/rooms';
        api.get(url)
            .then((res) => setRooms(res.data))
            .catch(() => message.error('Impossible de charger les salles'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchRooms();
    }, [isAdmin]);

    const openCreate = () => {
        setEditingRoom(null);
        form.resetFields();
        form.setFieldsValue({ openFrom: '08:00', openTo: '19:00', capacity: 10, equipment: [] });
        setModalOpen(true);
    };

    const openEdit = (room) => {
        setEditingRoom(room);
        let equipment = [];
        try {
            if (room.equipment) equipment = JSON.parse(room.equipment);
        } catch {
            equipment = [];
        }
        form.setFieldsValue({
            name: room.name,
            capacity: room.capacity,
            location: room.location,
            openFrom: room.openFrom,
            openTo: room.openTo,
            equipment,
            status: room.status,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values) => {
        try {
            const payload = {
                name: values.name,
                capacity: values.capacity,
                location: values.location || '',
                openFrom: values.openFrom,
                openTo: values.openTo,
                equipment: values.equipment || [],
            };
            if (editingRoom) {
                await api.put(`/rooms/${editingRoom.id}`, payload);
                message.success('Salle mise à jour');
            } else {
                await api.post('/rooms', payload);
                message.success('Salle créée');
            }
            setModalOpen(false);
            fetchRooms();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const handleDisable = async (id) => {
        try {
            await api.delete(`/rooms/${id}`);
            message.success('Salle désactivée — aucune réservation ni réunion n\'est possible tant qu\'elle n\'est pas réactivée');
            fetchRooms();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const handleActivate = async (id) => {
        try {
            await api.put(`/rooms/${id}/activate`);
            message.success('Salle réactivée');
            fetchRooms();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const renderEquipment = (room) => {
        if (!room.equipment) return null;
        try {
            const items = JSON.parse(room.equipment);
            if (!Array.isArray(items) || items.length === 0) return null;
            return (
                <div>
                    {items.map((item, i) => (
                        <Tag key={i} style={{ marginBottom: 4 }}>
                            {item}
                        </Tag>
                    ))}
                </div>
            );
        } catch {
            return null;
        }
    };

    return (
        <Spin spinning={loading}>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <Title level={3} style={{ margin: 0 }}>
                        Salles de réunion
                    </Title>
                    {isAdmin && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            Nouvelle salle
                        </Button>
                    )}
                </div>

                {rooms.length === 0 && !loading ? (
                    <Empty description="Aucune salle" />
                ) : (
                    <Row gutter={[16, 16]}>
                        {rooms.map((room) => {
                            const isDisabled = room.status === 'DISABLED';
                            const statusKey = isDisabled
                                ? 'DISABLED'
                                : room.occupancyStatus || (room.status === 'ACTIVE' ? 'FREE' : room.status);
                            const busy = !isDisabled && (statusKey === 'BUSY' || statusKey === 'OCCUPIED');
                            return (
                                <Col key={room.id} xs={24} sm={12} lg={8}>
                                    <Card
                                        style={isDisabled ? { opacity: 0.85, borderColor: '#d9d9d9' } : undefined}
                                        title={room.name}
                                        extra={
                                            <Space>
                                                <Tag color={STATUS_TAG[statusKey] || 'default'}>
                                                    {busy && room.currentBooking
                                                        ? `Occupée (${room.currentBooking.startTime}–${room.currentBooking.endTime})`
                                                        : STATUS_LABEL[statusKey] || statusKey}
                                                </Tag>
                                                {isAdmin && (
                                                    <>
                                                        {!isDisabled && (
                                                            <Button
                                                                type="text"
                                                                size="small"
                                                                icon={<EditOutlined />}
                                                                onClick={() => openEdit(room)}
                                                            />
                                                        )}
                                                        {isDisabled ? (
                                                            <Button
                                                                type="text"
                                                                size="small"
                                                                icon={<CheckCircleOutlined />}
                                                                onClick={() => handleActivate(room.id)}
                                                            >
                                                                Activer
                                                            </Button>
                                                        ) : (
                                                            <Popconfirm
                                                                title="Désactiver cette salle ?"
                                                                description="Aucune réservation ni réunion ne sera possible sur cette salle tant qu’elle reste désactivée."
                                                                onConfirm={() => handleDisable(room.id)}
                                                            >
                                                                <Button type="text" size="small" danger icon={<StopOutlined />}>
                                                                    Désactiver
                                                                </Button>
                                                            </Popconfirm>
                                                        )}
                                                    </>
                                                )}
                                            </Space>
                                        }
                                    >
                                        <Space orientation="vertical" style={{ width: '100%' }} size={8}>
                                            <Space>
                                                <TeamOutlined style={{ color: '#666' }} />
                                                <Text>{room.capacity} personnes</Text>
                                            </Space>
                                            {room.location && (
                                                <Space>
                                                    <EnvironmentOutlined style={{ color: '#666' }} />
                                                    <Text>{room.location}</Text>
                                                </Space>
                                            )}
                                            {room.openFrom && room.openTo && (
                                                <Space>
                                                    <ClockCircleOutlined style={{ color: '#666' }} />
                                                    <Text>
                                                        {room.openFrom} — {room.openTo}
                                                    </Text>
                                                </Space>
                                            )}
                                            {room.currentBooking?.meetingTitle && (
                                                <Text type="secondary">
                                                    Réunion : {room.currentBooking.meetingTitle}
                                                </Text>
                                            )}
                                            {renderEquipment(room)}
                                            {!isDisabled && (
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    icon={<CalendarOutlined />}
                                                    onClick={() => navigate(`/meetings/new?roomId=${room.id}`)}
                                                    style={{ marginTop: 8 }}
                                                >
                                                    Créer une réunion dans cette salle
                                                </Button>
                                            )}
                                        </Space>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                )}

                <Modal
                    title={editingRoom ? 'Modifier la salle' : 'Nouvelle salle'}
                    open={modalOpen}
                    onCancel={() => setModalOpen(false)}
                    onOk={() => form.submit()}
                    okText={editingRoom ? 'Enregistrer' : 'Créer'}
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
                        <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
                            <Input placeholder="Ex. Salle A" />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="capacity" label="Capacité" rules={[{ required: true }]}>
                                    <InputNumber min={1} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="location" label="Lieu / Étage">
                                    <Input placeholder="Bâtiment, étage…" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="openFrom" label="Ouverture">
                                    <Input placeholder="08:00" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item name="openTo" label="Fermeture">
                                    <Input placeholder="19:00" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="equipment" label="Équipements (tags)">
                            <Select
                                mode="tags"
                                placeholder="Vidéoprojecteur, tableau…"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </Spin>
    );
}
