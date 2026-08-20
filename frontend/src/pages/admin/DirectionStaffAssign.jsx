import { useEffect, useMemo, useState } from 'react';
import { Card, Select, Space, Button, Table, Typography, Popconfirm, App, Tag } from 'antd';
import { UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { ROLES, roleLabel } from '../../utils/roles';

const { Text } = Typography;

function userOption(u, { showAvailableDg = false } = {}) {
    const role = roleLabel(u.role) || u.role;
    let dirNote = '';
    if (u.direction?.name && u.directionId) {
        dirNote = ` — ${u.direction.name}`;
    } else if (showAvailableDg && u.role === ROLES.DG && !u.directionId) {
        dirNote = ' — disponible (non affecté)';
    }
    return {
        value: u.id,
        label: `${u.name} (${u.email}) — ${role}${dirNote}`,
    };
}

/**
 * Affectation DG (rôle DG) et Assistants.
 * Pour Assistant : tout membre actif de la direction peut être promu, quel que soit son rôle.
 */
export default function DirectionStaffAssign({ directionId, direction, onChanged }) {
    const { message } = App.useApp();
    const [saving, setSaving] = useState(false);
    const [directors, setDirectors] = useState([]);
    const [assistantsPool, setAssistantsPool] = useState([]);
    const [pickedDg, setPickedDg] = useState(undefined);
    const [pickedAssistant, setPickedAssistant] = useState(undefined);

    const currentDirectorId = direction?.directorId || direction?.director?.id || null;
    const currentAssistants = Array.isArray(direction?.assistants)
        ? direction.assistants
        : (direction?.users || []).filter((u) => u.role === ROLES.ASSISTANT);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await api.get('/events/staff-candidates', {
                    params: directionId ? { directionId } : undefined,
                });
                if (!active) return;
                setDirectors(Array.isArray(data?.directors) ? data.directors : []);
                setAssistantsPool(Array.isArray(data?.assistants) ? data.assistants : []);
            } catch {
                if (active) {
                    setDirectors([]);
                    setAssistantsPool([]);
                }
            }
        })();
        return () => { active = false; };
    }, [directionId, direction?.directorId, currentAssistants.length, direction?.users?.length]);

    const dgOptions = useMemo(() => {
        return directors
            .filter((u) => !u.directionId || u.directionId === directionId)
            .map((u) => userOption(u, { showAvailableDg: true }));
    }, [directors, directionId]);

    const assistantOptions = useMemo(() => {
        const already = new Set(currentAssistants.map((a) => a.id));
        return assistantsPool
            .filter((u) => !already.has(u.id))
            .filter((u) => {
                // Déjà Assistant libre / même direction, ou membre de cette direction (tout rôle)
                if (u.role === ROLES.ASSISTANT) {
                    return !u.directionId || u.directionId === directionId;
                }
                return u.directionId === directionId;
            })
            .map((u) => userOption(u));
    }, [assistantsPool, currentAssistants, directionId]);

    const assignDg = async () => {
        if (!pickedDg) {
            message.warning('Choisissez un utilisateur au rôle Directeur (DG).');
            return;
        }
        setSaving(true);
        try {
            await api.post(`/events/directions/${directionId}/dg`, {
                userId: pickedDg,
                replace: Boolean(currentDirectorId),
            });
            message.success('DG affecté');
            setPickedDg(undefined);
            await onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Affectation DG refusée');
        } finally {
            setSaving(false);
        }
    };

    const removeDg = async () => {
        setSaving(true);
        try {
            await api.delete(`/events/directions/${directionId}/dg`);
            message.success('DG retiré');
            setPickedDg(undefined);
            await onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Impossible de retirer le DG');
        } finally {
            setSaving(false);
        }
    };

    const addAssistant = async () => {
        if (!pickedAssistant) {
            message.warning('Choisissez un membre de la direction à nommer Assistant.');
            return;
        }
        const candidate = assistantsPool.find((u) => u.id === pickedAssistant);
        const willPromote = candidate && candidate.role !== ROLES.ASSISTANT;
        setSaving(true);
        try {
            await api.post(`/events/directions/${directionId}/assistants`, {
                userId: pickedAssistant,
                replace: true,
            });
            message.success(willPromote
                ? `${candidate.name} est maintenant Assistant de cette direction`
                : 'Assistant ajouté');
            setPickedAssistant(undefined);
            await onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Ajout Assistant refusé');
        } finally {
            setSaving(false);
        }
    };

    const removeAssistant = async (userId) => {
        setSaving(true);
        try {
            await api.delete(`/events/directions/${directionId}/assistants/${userId}`);
            message.success('Assistant retiré (rôle repassé en Responsable)');
            await onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Impossible de retirer l\'Assistant');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Card
                title="DG"
                extra={<Text type="secondary">Utilisateurs au rôle DG (y compris non encore affectés)</Text>}
                style={{ marginBottom: 16 }}
            >
                <Space wrap style={{ width: '100%', marginBottom: 12 }}>
                    <Select
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        placeholder="Choisir un DG (disponible ou déjà sur cette direction)"
                        style={{ minWidth: 360 }}
                        value={pickedDg}
                        onChange={setPickedDg}
                        options={dgOptions}
                        notFoundContent="Aucun utilisateur avec le rôle DG — créez-en un dans Utilisateurs"
                    />
                    <Button type="primary" loading={saving} onClick={assignDg}>
                        Affecter / remplacer
                    </Button>
                    {direction?.director && (
                        <Popconfirm title="Retirer le DG de cette direction ?" onConfirm={removeDg}>
                            <Button danger>Retirer</Button>
                        </Popconfirm>
                    )}
                </Space>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                    Attribuez d&apos;abord le rôle Directeur général dans Utilisateurs (sans direction si besoin),
                    puis affectez-le ici à la direction.
                </Text>
                {direction?.director ? (
                    <Text>
                        DG actuel : <Text strong>{direction.director.name}</Text>
                        {' '}({direction.director.email} — {roleLabel(direction.director.role)})
                    </Text>
                ) : (
                    <Text type="secondary">Aucun DG — les demandes des Assistants seront auto-validées.</Text>
                )}
            </Card>

            <Card
                title={`Assistants (${currentAssistants.length})`}
                extra={(
                    <Text type="secondary">
                        Membres de la direction — le rôle devient Assistant à l&apos;affectation
                    </Text>
                )}
                style={{ marginBottom: 16 }}
            >
                <Space wrap style={{ marginBottom: 12 }}>
                    <Select
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        placeholder="Choisir un membre (tout rôle) à nommer Assistant"
                        style={{ minWidth: 380 }}
                        value={pickedAssistant}
                        onChange={setPickedAssistant}
                        options={assistantOptions}
                        notFoundContent="Aucun membre éligible dans cette direction"
                    />
                    <Button icon={<UserAddOutlined />} type="primary" loading={saving} onClick={addAssistant}>
                        Nommer Assistant
                    </Button>
                </Space>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                    Vous pouvez sélectionner un Responsable, Coordinateur, Consolidateur, etc. déjà
                    rattaché à cette direction : son rôle passera automatiquement à Assistant.
                </Text>
                <Table
                    rowKey="id"
                    size="small"
                    dataSource={currentAssistants}
                    pagination={false}
                    locale={{ emptyText: 'Aucun assistant' }}
                    columns={[
                        { title: 'Nom', dataIndex: 'name' },
                        { title: 'Email', dataIndex: 'email' },
                        {
                            title: 'Rôle',
                            dataIndex: 'role',
                            width: 140,
                            render: (role) => <Tag color="cyan">{roleLabel(role) || role}</Tag>,
                        },
                        {
                            title: '',
                            key: 'actions',
                            width: 90,
                            render: (_, record) => (
                                <Popconfirm title="Retirer cet Assistant ?" onConfirm={() => removeAssistant(record.id)}>
                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            </Card>
        </>
    );
}
