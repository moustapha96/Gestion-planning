import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Typography, Tabs, Tag, Space, Button, Empty, Spin, Alert, Badge, Tooltip, App,
} from 'antd';
import {
    CheckCircleOutlined, TeamOutlined, FlagOutlined,
    ReloadOutlined, EyeOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import usePendingValidations, { notifyPendingValidationsRefresh } from '../hooks/usePendingValidations';
import { useAuth } from '../context/AuthContext';
import { isPrivilegedAdmin } from '../utils/roles';

const { Title, Text } = Typography;

import {
    MEETING_STATUS_LABELS,
    MISSION_STATUS_LABELS,
    meetingStatusLabel,
    missionStatusLabel,
} from '../utils/statusLabels';

function formatDateTime(value) {
    if (!value) return '—';
    return dayjs(value).format('ddd D MMM YYYY · HH:mm');
}

function EventTypeTag({ eventType, fallback }) {
    const label = eventType?.name || fallback;
    if (!label) return null;
    return (
        <Tag style={{ borderColor: eventType?.color, color: eventType?.color, margin: 0 }}>
            {label}
        </Tag>
    );
}

function MeetingCard({ item, loading, onAction, isAdmin }) {
    const navigate = useNavigate();
    const isConsolidate = item.action === 'consolidate';
    const isAdminDirect = isAdmin && item.action === 'approve';
    const actionLabel = isAdminDirect
        ? (item.status === 'DRAFT' ? 'Valider et publier (admin)' : 'Valider et publier (admin)')
        : isConsolidate
          ? (isAdmin ? 'Consolider et publier (admin)' : 'Consolider et publier')
          : item.action === 'fallback'
            ? 'Valider et publier (rôle dédié)'
            : item.action === 'coordinate' && item.status === 'DRAFT'
              ? 'Valider (coordinateur)'
              : 'Valider et publier';
    const actionColor = isConsolidate ? '#722ed1' : item.action === 'fallback' ? '#fa541c' : '#52c41a';

    return (
        <Card size="small" style={{ marginBottom: 12 }}>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                    <TeamOutlined style={{ color: '#1565C0' }} />
                    <Text strong>{item.title}</Text>
                    <EventTypeTag eventType={item.eventType} fallback="Réunion" />
                    <Tag color={isConsolidate ? 'purple' : 'orange'}>
                        {item.statusLabel || MEETING_STATUS_LABELS[item.status] || meetingStatusLabel(item) || 'À valider'}
                    </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {formatDateTime(item.startTime)} → {dayjs(item.endTime).format('HH:mm')}
                    {item.room?.name ? ` · ${item.room.name}` : ''}
                </Text>
                <Text style={{ fontSize: 13 }}>
                    Organisateur : <Text strong>{item.organizer?.name}</Text>
                    {item.project?.name ? ` · Projet : ${item.project.name}` : ''}
                </Text>
                <Space wrap>
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={loading}
                        style={{ background: actionColor, borderColor: actionColor }}
                        onClick={() => onAction(item)}
                    >
                        {actionLabel}
                    </Button>
                    <Button icon={<EyeOutlined />} onClick={() => navigate(item.link)}>
                        Voir la fiche
                    </Button>
                </Space>
            </Space>
        </Card>
    );
}

function MissionCard({ item, loading, onAction, isAdmin }) {
    const navigate = useNavigate();
    const isConsolidate = item.action === 'consolidate';
    const isAdminDirect = isAdmin && item.action === 'approve';
    const actionLabel = isAdminDirect
        ? (item.status === 'DRAFT' ? 'Valider et confirmer (admin)' : 'Valider et confirmer (admin)')
        : isConsolidate
          ? (isAdmin ? 'Consolider et confirmer (admin)' : 'Consolider et confirmer')
          : item.action === 'fallback'
            ? 'Valider et confirmer (rôle dédié)'
            : item.action === 'coordinate' && item.status === 'DRAFT'
              ? 'Valider (coordinateur)'
              : 'Valider et confirmer';
    const actionColor = isConsolidate ? '#722ed1' : item.action === 'fallback' ? '#fa541c' : '#52c41a';

    return (
        <Card size="small" style={{ marginBottom: 12 }}>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                    <FlagOutlined style={{ color: '#722ed1' }} />
                    <Text strong>{item.title}</Text>
                    <Tag color={isConsolidate ? 'purple' : 'orange'}>
                        {item.statusLabel || MISSION_STATUS_LABELS[item.status] || missionStatusLabel(item) || 'À valider'}
                    </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {formatDateTime(item.startTime)} → {dayjs(item.endTime).format('HH:mm')}
                    {item.location ? ` · ${item.location}` : ''}
                </Text>
                <Text style={{ fontSize: 13 }}>
                    Créée par : <Text strong>{item.createdBy?.name}</Text>
                    {item.project?.name ? ` · Projet : ${item.project.name}` : ''}
                </Text>
                <Space wrap>
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={loading}
                        style={{ background: actionColor, borderColor: actionColor }}
                        onClick={() => onAction(item)}
                    >
                        {actionLabel}
                    </Button>
                    <Button icon={<EyeOutlined />} onClick={() => navigate(item.link)}>
                        Voir la fiche
                    </Button>
                </Space>
            </Space>
        </Card>
    );
}

export default function PendingValidations() {
    const { message } = App.useApp();
    const {
        loading, refresh, canSeeMenu, counts,
        meetings, missions,
    } = usePendingValidations(true);
    const { user } = useAuth();

    const [actionId, setActionId] = useState(null);
    const isAdmin = isPrivilegedAdmin(user?.role);

    const runAction = async (item) => {
        const { id, action, kind: entityKind } = item;
        setActionId(id);
        try {
            if (entityKind === 'meeting') {
                if (action === 'consolidate' || (isAdmin && action === 'approve')) {
                    await api.put(`/meetings/${id}/approve`);
                    message.success(
                        isAdmin && item.status === 'DRAFT'
                            ? 'Réunion validée et publiée (admin)'
                            : 'Réunion consolidée et publiée sur le calendrier',
                    );
                } else if (action === 'coordinate' || action === 'fallback') {
                    await api.put(`/meetings/${id}/approve-coordinator`);
                    message.success(
                        action === 'fallback'
                            ? 'Réunion validée et publiée (rôle dédié)'
                            : 'Réunion validée par le coordinateur — transmise au Consolidateur',
                    );
                } else {
                    await api.put(`/meetings/${id}/approve`);
                    message.success('Réunion validée et publiée');
                }
            } else if (entityKind === 'mission') {
                if (action === 'consolidate' || (isAdmin && action === 'approve')) {
                    await api.put(`/missions/${id}/approve`);
                    message.success(
                        isAdmin && item.status === 'DRAFT'
                            ? 'Mission validée et confirmée (admin)'
                            : 'Mission consolidée et confirmée',
                    );
                } else if (action === 'coordinate' || action === 'fallback') {
                    await api.put(`/missions/${id}/approve-coordinator`);
                    message.success(
                        action === 'fallback'
                            ? 'Mission validée et confirmée (rôle dédié)'
                            : 'Mission validée par le coordinateur — transmise au Consolidateur',
                    );
                } else {
                    await api.put(`/missions/${id}/approve`);
                    message.success('Mission validée');
                }
            }
            await refresh();
            notifyPendingValidationsRefresh();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de l\'action');
        } finally {
            setActionId(null);
        }
    };

    if (loading && !meetings.length && !missions.length) {
        return (
            <div style={{ textAlign: 'center', padding: 64 }}>
                <Spin size="large" />
            </div>
        );
    }
    if (!canSeeMenu) {
        return (
            <Empty
                description="Cette page est réservée aux administrateurs, consolidateurs (rôle ou projet), et coordinateurs de projet."
                style={{ marginTop: 48 }}
            />
        );
    }

    const roleHints = [];
    if (isPrivilegedAdmin(user?.role)) {
        roleHints.push('administrateur — visibilité et validation sur tous les projets');
    }
    if (meetings.some((m) => m.action === 'consolidate') || missions.some((m) => m.action === 'consolidate')) {
        roleHints.push('consolidateur de projet');
    }
    if (meetings.some((m) => m.action === 'coordinate') || missions.some((m) => m.action === 'coordinate')) {
        roleHints.push('coordinateur de projet');
    }

    const tabItems = [
        {
            key: 'all',
            label: (
                <Badge count={counts.total} size="small" offset={[6, 0]} color="#fa541c">
                    Tout
                </Badge>
            ),
            children: (
                <div>
                    {counts.total === 0 ? (
                        <Empty description="Rien à valider pour le moment" style={{ margin: '32px 0' }} />
                    ) : (
                        <>
                            {meetings.length > 0 && (
                                <>
                                    <Title level={5} style={{ marginTop: 0 }}>Réunions à valider</Title>
                                    {meetings.map((m) => (
                                        <MeetingCard
                                            key={m.id}
                                            item={m}
                                            loading={actionId === m.id}
                                            onAction={runAction}
                                            isAdmin={isAdmin}
                                        />
                                    ))}
                                </>
                            )}
                            {missions.length > 0 && (
                                <>
                                    <Title level={5}>Missions à valider</Title>
                                    {missions.map((m) => (
                                        <MissionCard
                                            key={m.id}
                                            item={m}
                                            loading={actionId === m.id}
                                            onAction={runAction}
                                            isAdmin={isAdmin}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            ),
        },
        {
            key: 'meetings',
            label: (
                <Badge count={counts.meetings} size="small" offset={[6, 0]} color="#1565C0">
                    Réunions
                </Badge>
            ),
            children: meetings.length ? meetings.map((m) => (
                <MeetingCard
                    key={m.id}
                    item={m}
                    loading={actionId === m.id}
                    onAction={runAction}
                    isAdmin={isAdmin}
                />
            )) : <Empty description="Aucune réunion en attente" />,
        },
        {
            key: 'missions',
            label: (
                <Badge count={counts.missions} size="small" offset={[6, 0]} color="#722ed1">
                    Missions
                </Badge>
            ),
            children: missions.length ? missions.map((m) => (
                <MissionCard
                    key={m.id}
                    item={m}
                    loading={actionId === m.id}
                    onAction={runAction}
                    isAdmin={isAdmin}
                />
            )) : (
                <Empty description="Aucune mission en attente" />
            ),
        },
    ];

    return (
        <div>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 20,
            }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        <CheckCircleOutlined style={{ color: '#fa541c', marginRight: 10 }} />
                        À valider
                    </Title>
                    <Text type="secondary">
                        {counts.total > 0
                            ? `${counts.total} action(s) en attente`
                            : 'Tout est à jour'}
                        {roleHints.length > 0 ? ` · ${roleHints.join(', ')}` : ''}
                    </Text>
                </div>
                <Tooltip title="Actualiser">
                    <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
                        Actualiser
                    </Button>
                </Tooltip>
            </div>

            <Alert
                type="info"
                showIcon
                icon={<CalendarOutlined />}
                title="Circuit de validation"
                description="Étape 1/2 : coordinateur du projet. Étape 2/2 : consolidateur du projet, sinon consolidateur de la direction, sinon rôle Consolidateur global. Les administrateurs voient et peuvent valider tous les éléments en attente, même hors de leurs projets. Publication calendrier uniquement après consolidation."
                style={{ marginBottom: 16 }}
            />

            <Card>
                <Tabs items={tabItems} />
            </Card>
        </div>
    );
}
