import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Typography, Tabs, Tag, Space, Button, Empty, Spin, Alert, Badge, List, Tooltip, App,
} from 'antd';
import {
    CheckCircleOutlined, TeamOutlined, ScheduleOutlined, FlagOutlined,
    AppstoreOutlined, ReloadOutlined, EyeOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api/client';
import usePendingValidations, { notifyPendingValidationsRefresh } from '../hooks/usePendingValidations';

const { Title, Text } = Typography;

const PLANNING_STATUS_LABELS = {
    SUBMITTED: 'Soumis',
    IN_CONSOLIDATION: 'En consolidation',
    COORDINATOR_PENDING: 'Att. validation finale',
    CP_PENDING: 'Att. validation finale',
    SG_PENDING: 'Att. SG',
    DG_PENDING: 'Att. DG',
};

const MEETING_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    COORDINATOR_PENDING: 'Att. validation finale',
};

const MISSION_STATUS_LABELS = {
    DRAFT: 'Brouillon',
    COORDINATOR_PENDING: 'Att. validation finale',
};

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

function MeetingCard({ item, loading, onAction }) {
    const navigate = useNavigate();
    const isConsolidate = item.action === 'consolidate';
    const actionLabel = isConsolidate
        ? 'Consolider'
        : item.action === 'fallback'
          ? 'Valider et publier (rôle dédié)'
          : item.validationPath === 'coordinator' && item.status === 'DRAFT'
            ? 'Valider et publier (coordinateur)'
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
                        {MEETING_STATUS_LABELS[item.status] || 'À valider'}
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

function PlanningCard({ item, loading, onAction }) {
    const navigate = useNavigate();
    const isConsolidate = item.action === 'consolidate' || item.action === 'consolidate_and_validate';
    const actionLabel = item.action === 'consolidate_and_validate'
        ? 'Consolider et valider'
        : isConsolidate
            ? 'Consolider'
            : item.action === 'fallback'
                ? 'Valider (consolidateur rôle)'
                : item.validationPath === 'coordinator' && item.status === 'SUBMITTED'
                    ? 'Valider (coordinateur — sans consolidateur)'
                    : 'Valider (coordinateur)';
    const actionColor = item.action === 'consolidate_and_validate'
        ? '#52c41a'
        : isConsolidate
            ? '#722ed1'
            : item.action === 'fallback'
                ? '#fa541c'
                : '#52c41a';

    return (
        <Card size="small" style={{ marginBottom: 12 }}>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                    <ScheduleOutlined style={{ color: actionColor }} />
                    <Text strong>Planning — {item.weekLabel}</Text>
                    <Tag color={isConsolidate ? 'purple' : 'green'}>
                        {PLANNING_STATUS_LABELS[item.status] || item.status}
                    </Tag>
                </Space>
                <Text style={{ fontSize: 13 }}>
                    Responsable : <Text strong>{item.owner?.name}</Text>
                    {item.project?.name ? ` · ${item.project.name}` : ''}
                </Text>
                <Space wrap size={4}>
                    {item.missionsCount > 0 && (
                        <Tag icon={<FlagOutlined />} color="purple">{item.missionsCount} mission(s)</Tag>
                    )}
                    {item.eventsCount > 0 && (
                        <Tag icon={<AppstoreOutlined />} color="cyan">{item.eventsCount} événement(s)</Tag>
                    )}
                </Space>
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
                        Examiner le planning
                    </Button>
                </Space>
            </Space>
        </Card>
    );
}

function MissionCard({ item, loading, onAction }) {
    const navigate = useNavigate();
    const isConsolidate = item.action === 'consolidate';
    const actionLabel = isConsolidate
        ? 'Consolider'
        : item.action === 'fallback'
          ? 'Valider et confirmer (rôle dédié)'
          : item.validationPath === 'coordinator' && item.status === 'DRAFT'
            ? 'Valider et confirmer (coordinateur)'
            : 'Valider et confirmer';
    const actionColor = isConsolidate ? '#722ed1' : item.action === 'fallback' ? '#fa541c' : '#52c41a';

    return (
        <Card size="small" style={{ marginBottom: 12 }}>
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                    <FlagOutlined style={{ color: '#722ed1' }} />
                    <Text strong>{item.title}</Text>
                    <Tag color={isConsolidate ? 'purple' : 'orange'}>
                        {MISSION_STATUS_LABELS[item.status] || 'À valider'}
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
        meetings, planningsConsolidate, planningsCoordinate,
        missions, planningEvents,
    } = usePendingValidations(true);

    const [actionId, setActionId] = useState(null);

    const runAction = async (item) => {
        const { id, action, kind: entityKind } = item;
        setActionId(id);
        try {
            if (entityKind === 'meeting') {
                if (action === 'consolidate') {
                    await api.put(`/meetings/${id}/approve`);
                    message.success('Réunion consolidée — transmise pour validation finale');
                } else if (action === 'coordinate' || action === 'fallback') {
                    await api.put(`/meetings/${id}/approve-coordinator`);
                    message.success(
                        action === 'fallback'
                            ? 'Réunion validée et publiée (rôle dédié)'
                            : 'Réunion validée et publiée par le coordinateur',
                    );
                } else {
                    await api.put(`/meetings/${id}/approve`);
                    message.success('Réunion validée et publiée');
                }
            } else if (entityKind === 'mission') {
                if (action === 'consolidate') {
                    await api.put(`/missions/${id}/approve`);
                    message.success('Mission consolidée — transmise pour validation finale');
                } else if (action === 'coordinate' || action === 'fallback') {
                    await api.put(`/missions/${id}/approve-coordinator`);
                    message.success('Mission validée définitivement');
                } else {
                    await api.put(`/missions/${id}/approve`);
                    message.success('Mission validée');
                }
            } else if (entityKind === 'planning') {
                if (action === 'consolidate' || action === 'consolidate_and_validate') {
                    const res = await api.put(`/plannings/${id}/consolidate`);
                    if (res.data?.autoFinalized || res.data?.status === 'VALIDATED') {
                        message.success('Planning consolidé et validé — publié ✓');
                    } else {
                        message.success('Planning consolidé — transmis pour validation finale');
                    }
                } else {
                    await api.put(`/plannings/${id}/approve-coordinator`);
                    message.success(
                        action === 'fallback'
                            ? 'Planning validé (consolidateur rôle)'
                            : 'Planning validé par le coordinateur',
                    );
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

    if (loading && !meetings.length && !planningsConsolidate.length && !planningsCoordinate.length) {
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
    if (planningsConsolidate.length > 0 || meetings.length > 0) roleHints.push('consolidateur de projet');
    if (planningsCoordinate.length > 0) roleHints.push('coordinateur de projet');

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
                                        />
                                    ))}
                                </>
                            )}
                            {planningsConsolidate.length > 0 && (
                                <>
                                    <Title level={5}>Plannings à consolider</Title>
                                    {planningsConsolidate.map((p) => (
                                        <PlanningCard
                                            key={p.id}
                                            item={p}
                                            loading={actionId === p.id}
                                            onAction={runAction}
                                        />
                                    ))}
                                </>
                            )}
                            {planningsCoordinate.length > 0 && (
                                <>
                                    <Title level={5}>Plannings à valider (coordinateur)</Title>
                                    {planningsCoordinate.map((p) => (
                                        <PlanningCard
                                            key={p.id}
                                            item={p}
                                            loading={actionId === p.id}
                                            onAction={runAction}
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
                />
            )) : <Empty description="Aucune réunion en attente" />,
        },
        {
            key: 'consolidate',
            label: (
                <Badge count={counts.planningsConsolidate} size="small" offset={[6, 0]} color="#722ed1">
                    Plannings
                </Badge>
            ),
            children: planningsConsolidate.length ? planningsConsolidate.map((p) => (
                <PlanningCard
                    key={p.id}
                    item={p}
                    loading={actionId === p.id}
                    onAction={runAction}
                />
            )) : <Empty description="Aucun planning à consolider" />,
        },
        {
            key: 'coordinate',
            label: (
                <Badge count={counts.planningsCoordinate} size="small" offset={[6, 0]} color="#52c41a">
                    Coordination
                </Badge>
            ),
            children: planningsCoordinate.length ? planningsCoordinate.map((p) => (
                <PlanningCard
                    key={p.id}
                    item={p}
                    loading={actionId === p.id}
                    onAction={runAction}
                />
            )) : <Empty description="Aucun planning en attente de validation coordinateur" />,
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
                />
            )) : (
                <Empty description="Aucune mission liée aux plannings en attente" />
            ),
        },
        {
            key: 'events',
            label: (
                <Badge count={counts.events} size="small" offset={[6, 0]} color="#13c2c2">
                    Événements
                </Badge>
            ),
            children: planningEvents.length ? (
                <List
                    dataSource={planningEvents}
                    renderItem={(ev) => (
                        <List.Item
                            actions={[
                                <Button key="view" type="link" onClick={() => navigate(ev.link)}>
                                    Voir le planning
                                </Button>,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<AppstoreOutlined style={{ color: '#13c2c2', fontSize: 18 }} />}
                                title={(
                                    <Space wrap>
                                        <span>{ev.title}</span>
                                        <EventTypeTag eventType={ev.eventType} fallback={ev.type} />
                                    </Space>
                                )}
                                description={(
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatDateTime(ev.startTime)}
                                        {ev.room?.name ? ` · ${ev.room.name}` : ''}
                                        {' · Semaine '}{ev.weekLabel} — {ev.ownerName}
                                    </Text>
                                )}
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <Empty description="Aucun événement de planning en attente" />
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
                description="Consolidateur du projet → sinon coordinateur du projet (étape consolidateur sautée) → sinon rôle Consolidateur global si aucun des deux n'est défini sur le projet."
                style={{ marginBottom: 16 }}
            />

            <Card>
                <Tabs items={tabItems} />
            </Card>
        </div>
    );
}
