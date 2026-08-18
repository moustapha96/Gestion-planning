import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Typography, Tabs, Tag, Space, Button, Empty, Spin, Alert, Badge, Tooltip, App, Modal, Input,
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
    const isDirector = item.action === 'director_approve';
    const isConsolidate = item.action === 'consolidate';
    const isCoordinate = item.action === 'coordinate';
    const isFinalize = item.action === 'finalize';
    const actionLabel = isDirector
        ? 'Valider'
        : isConsolidate
        ? (isAdmin ? 'Consolider et publier (admin)' : 'Consolider et publier')
        : isCoordinate
          ? (isAdmin ? 'Valider étape 1/2 (admin)' : 'Valider (coordinateur)')
          : isFinalize
            ? 'Valider et publier (legacy)'
            : item.action === 'fallback'
              ? 'Valider et publier (rôle dédié)'
              : 'Valider et publier';
    const actionColor = isDirector ? '#faad14' : isConsolidate ? '#722ed1' : item.action === 'fallback' ? '#fa541c' : '#52c41a';

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
                {item.createdAt && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Créée le {formatDateTime(item.createdAt)}
                    </Text>
                )}
                <Text style={{ fontSize: 13 }}>
                    Organisateur : <Text strong>{item.organizer?.name}</Text>
                    {item.direction?.name ? ` · Direction : ${item.direction.name}` : ''}
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
                    {isDirector && (
                        <Button danger loading={loading} onClick={() => onAction({ ...item, reject: true })}>
                            Refuser
                        </Button>
                    )}
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
    const isDirector = item.action === 'director_approve';
    const isConsolidate = item.action === 'consolidate';
    const isCoordinate = item.action === 'coordinate';
    const isFinalize = item.action === 'finalize';
    const actionLabel = isDirector
        ? 'Valider'
        : isConsolidate
        ? (isAdmin ? 'Consolider et confirmer (admin)' : 'Consolider et confirmer')
        : isCoordinate
          ? (isAdmin ? 'Valider étape 1/2 (admin)' : 'Valider (coordinateur)')
          : isFinalize
            ? 'Valider et confirmer (legacy)'
            : item.action === 'fallback'
              ? 'Valider et confirmer (rôle dédié)'
              : 'Valider et confirmer';
    const actionColor = isDirector ? '#faad14' : isConsolidate ? '#722ed1' : item.action === 'fallback' ? '#fa541c' : '#52c41a';

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
                {item.createdAt && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Créée le {formatDateTime(item.createdAt)}
                    </Text>
                )}
                <Text style={{ fontSize: 13 }}>
                    Créée par : <Text strong>{item.createdBy?.name}</Text>
                    {item.direction?.name ? ` · Direction : ${item.direction.name}` : ''}
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
                    {isDirector && (
                        <Button danger loading={loading} onClick={() => onAction({ ...item, reject: true })}>
                            Refuser
                        </Button>
                    )}
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
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const isAdmin = isPrivilegedAdmin(user?.role);

    const runAction = async (item) => {
        const { id, action, kind: entityKind } = item;
        if (item.reject || action === 'director_reject') {
            setRejectTarget(item);
            setRejectReason('');
            return;
        }
        setActionId(id);
        try {
            if (action === 'director_approve') {
                await api.post(`/approvals/${entityKind}/${id}/approve`);
                message.success('Demande validée');
                await refresh();
                notifyPendingValidationsRefresh();
                return;
            }
            if (entityKind === 'meeting') {
                if (action === 'consolidate') {
                    await api.put(`/meetings/${id}/approve`);
                    message.success('Réunion consolidée et publiée sur le calendrier');
                } else if (action === 'coordinate' || action === 'fallback' || action === 'finalize') {
                    await api.put(`/meetings/${id}/approve-coordinator`);
                    message.success(
                        action === 'finalize'
                            ? 'Réunion validée définitivement et publiée'
                            : action === 'fallback'
                              ? 'Réunion validée et publiée (rôle dédié)'
                              : isAdmin
                                ? 'Réunion validée (étape 1/2) — transmise au consolidateur'
                                : 'Réunion validée par le coordinateur — transmise au consolidateur',
                    );
                } else {
                    await api.put(`/meetings/${id}/approve`);
                    message.success('Réunion validée et publiée');
                }
            } else if (entityKind === 'mission') {
                if (action === 'consolidate') {
                    await api.put(`/missions/${id}/approve`);
                    message.success('Mission consolidée et confirmée');
                } else if (action === 'coordinate' || action === 'fallback' || action === 'finalize') {
                    await api.put(`/missions/${id}/approve-coordinator`);
                    message.success(
                        action === 'finalize'
                            ? 'Mission validée définitivement et confirmée'
                            : action === 'fallback'
                              ? 'Mission validée et confirmée (rôle dédié)'
                              : isAdmin
                                ? 'Mission validée (étape 1/2) — transmise au consolidateur'
                                : 'Mission validée par le coordinateur — transmise au consolidateur',
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
    const confirmReject = async () => {
        if (!rejectTarget) return;
        if (!rejectReason.trim()) {
            message.error('Le motif de refus est obligatoire.');
            return;
        }
        setActionId(rejectTarget.id);
        try {
            await api.post(`/approvals/${rejectTarget.kind}/${rejectTarget.id}/reject`, {
                reason: rejectReason.trim(),
            });
            message.success('Demande refusée');
            setRejectTarget(null);
            setRejectReason('');
            await refresh();
            notifyPendingValidationsRefresh();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors du refus');
        } finally {
            setActionId(null);
        }
    };

    if (!canSeeMenu) {
        return (
            <Empty
                description="Cette page est réservée aux administrateurs, DG, consolidateurs et coordinateurs de projet."
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

            <Modal
                title="Refuser la demande"
                open={Boolean(rejectTarget)}
                onCancel={() => setRejectTarget(null)}
                onOk={confirmReject}
                okText="Refuser"
                okButtonProps={{ danger: true, loading: actionId === rejectTarget?.id }}
            >
                <Text type="secondary">Motif visible par l&apos;Assistant créateur.</Text>
                <Input.TextArea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motif du refus"
                    style={{ marginTop: 12 }}
                />
            </Modal>
        </div>
    );
}
