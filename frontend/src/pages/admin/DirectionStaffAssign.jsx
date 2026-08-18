import { useEffect, useMemo, useState } from 'react';
import { Card, Select, Space, Button, Table, Typography, Popconfirm, App } from 'antd';
import { UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { ROLES, roleLabel } from '../../utils/roles';

const { Text } = Typography;

function userOption(u, extra) {
    const dirNote = extra ? ` — ${extra}` : '';
    return {
        value: u.id,
        label: `${u.name} (${u.email})${dirNote}`,
    };
}

/**
 * Affectation DG (rôle DG uniquement) et Assistants (rôle ASSISTANT uniquement).
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
                const { data } = await api.get('/events/staff-candidates');
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
    }, [directionId, direction?.directorId, currentAssistants.length]);

    const dgOptions = useMemo(() => {
        return directors
            .filter((u) => !u.directionId || u.directionId === directionId)
            .map((u) => userOption(u));
    }, [directors, directionId]);

    const assistantOptions = useMemo(() => {
        const already = new Set(currentAssistants.map((a) => a.id));
        return assistantsPool
            .filter((u) => !already.has(u.id))
            .filter((u) => !u.directionId || u.directionId === directionId)
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
            message.warning('Choisissez un utilisateur au rôle Assistant.');
            return;
        }
        setSaving(true);
        try {
            await api.post(`/events/directions/${directionId}/assistants`, { userId: pickedAssistant });
            message.success('Assistant ajouté');
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
            message.success('Assistant retiré');
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
                extra={<Text type="secondary">Uniquement les utilisateurs au rôle Directeur (DG)</Text>}
                style={{ marginBottom: 16 }}
            >
                <Space wrap style={{ width: '100%', marginBottom: 12 }}>
                    <Select
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        placeholder="Choisir un Directeur (rôle DG)"
                        style={{ minWidth: 320 }}
                        value={pickedDg}
                        onChange={setPickedDg}
                        options={dgOptions}
                        notFoundContent="Aucun utilisateur avec le rôle Directeur (DG)"
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
                extra={<Text type="secondary">Uniquement les utilisateurs au rôle Assistant</Text>}
                style={{ marginBottom: 16 }}
            >
                <Space wrap style={{ marginBottom: 12 }}>
                    <Select
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        placeholder="Ajouter un Assistant (rôle ASSISTANT)"
                        style={{ minWidth: 320 }}
                        value={pickedAssistant}
                        onChange={setPickedAssistant}
                        options={assistantOptions}
                        notFoundContent="Aucun utilisateur avec le rôle Assistant"
                    />
                    <Button icon={<UserAddOutlined />} loading={saving} onClick={addAssistant}>
                        Ajouter
                    </Button>
                </Space>
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
