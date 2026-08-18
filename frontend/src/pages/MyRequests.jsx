import { useEffect, useState } from 'react';
import { Card, Typography, Tag, Space, Empty, Spin, Tabs, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api/client';
import { meetingStatusLabel, missionStatusLabel } from '../utils/statusLabels';

const { Title, Text } = Typography;

const STATUS_COLOR = {
    PENDING_DIRECTOR_APPROVAL: 'gold',
    APPROVED: 'green',
    AUTO_APPROVED: 'cyan',
    REJECTED: 'red',
    CONFIRMED: 'green',
    DRAFT: 'default',
};

function RequestCard({ item, kind }) {
    const navigate = useNavigate();
    const label = kind === 'meeting' ? meetingStatusLabel(item) : missionStatusLabel(item);
    return (
        <Card size="small" style={{ marginBottom: 12 }}>
            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                <Space wrap>
                    <Text strong>{item.title}</Text>
                    <Tag color={STATUS_COLOR[item.status] || 'default'}>{label}</Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {dayjs(item.startTime).format('DD/MM/YYYY HH:mm')}
                    {item.direction?.name ? ` · ${item.direction.name}` : ''}
                </Text>
                {item.status === 'REJECTED' && item.rejectionReason && (
                    <Text type="danger">Motif : {item.rejectionReason}</Text>
                )}
                <Button size="small" onClick={() => navigate(kind === 'meeting' ? `/meetings/${item.id}` : `/missions/${item.id}`)}>
                    Voir
                </Button>
            </Space>
        </Card>
    );
}

export default function MyRequests() {
    const [loading, setLoading] = useState(true);
    const [meetings, setMeetings] = useState([]);
    const [missions, setMissions] = useState([]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await api.get('/approvals/mine');
                if (!active) return;
                setMeetings(data?.meetings || []);
                setMissions(data?.missions || []);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false };
    }, []);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            <Title level={3} style={{ marginTop: 0 }}>Mes demandes</Title>
            <Text type="secondary">Suivi des missions et réunions que vous avez créées.</Text>
            <Card style={{ marginTop: 16 }}>
                <Tabs
                    items={[
                        {
                            key: 'missions',
                            label: `Missions (${missions.length})`,
                            children: missions.length
                                ? missions.map((m) => <RequestCard key={m.id} item={m} kind="mission" />)
                                : <Empty description="Aucune mission" />,
                        },
                        {
                            key: 'meetings',
                            label: `Réunions (${meetings.length})`,
                            children: meetings.length
                                ? meetings.map((m) => <RequestCard key={m.id} item={m} kind="meeting" />)
                                : <Empty description="Aucune réunion" />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
