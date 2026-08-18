import { useCallback, useEffect, useState } from 'react';
import { Card, Typography, Select, Button, Space, App, Spin, Divider, Tag, Input } from 'antd';
import { SaveOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { ROLES } from '../../utils/roles';

const { Title, Text, Paragraph } = Typography;

const ROLE_KEYS = [ROLES.RESPONSABLE, ROLES.COORDINATEUR, ROLES.CONSOLIDATEUR, ROLES.DG, ROLES.ASSISTANT, ROLES.ADMIN];
const ROLE_LABELS_UI = {
    [ROLES.RESPONSABLE]: 'Responsable',
    [ROLES.COORDINATEUR]: 'Coordinateur',
    [ROLES.CONSOLIDATEUR]: 'Consolidateur',
    [ROLES.ADMIN]: 'Administrateur',
};

const ELEVATION_KEYS = ['ADMIN', 'CONSOLIDATOR', 'PROJECT_COORDINATOR', 'SERVICE_DIRECTOR'];

const ELEVATION_META = {
    ADMIN: {
        title: 'Élévation automatique Administrateur',
        tag: 'Administrateur',
        hint: 'Ex. SG, DG — droits admin à la connexion sans changer le rôle en base.',
        defaultPatterns: 'SG, DG, Secrétaire, Directeur, Direction générale',
    },
    CONSOLIDATOR: {
        title: 'Peut être consolidateur',
        tag: 'Consolidateur',
        hint: 'Consolidation des plannings soumis et validation des réunions brouillon des responsables.',
        defaultPatterns: 'Consolidateur, consolidation, Chargé de consolidation',
    },
    PROJECT_COORDINATOR: {
        title: 'Coordinateur de projet',
        tag: 'Coordinateur',
        hint: 'Validation finale des plannings (étape coordinateur) et retour pour correction.',
        defaultPatterns: 'Coordinateur, Coordination, coordinateur de projet',
    },
    SERVICE_DIRECTOR: {
        title: 'Directeur de service',
        tag: 'Directeur de service',
        hint: 'Mêmes droits que le coordinateur sur les plannings en attente (validation et retour).',
        defaultPatterns: 'Directeur de service, Chef de service, Directeur',
    },
};

function patternsToString(patterns, fallback) {
    if (Array.isArray(patterns) && patterns.length) return patterns.join(', ');
    return fallback;
}

function stringToPatterns(str) {
    return str.split(',').map((s) => s.trim()).filter(Boolean);
}

function ElevationCard({ meta, directionId, jobPatterns, directionOptions, onDirectionChange, onPatternsChange }) {
    return (
        <Card size="small" style={{ marginBottom: 12 }}>
            <Title level={5} style={{ marginTop: 0 }}>{meta.title}</Title>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
                Utilisateurs de la direction ci-dessous dont l&apos;intitulé de poste contient un des mots-clés
                obtiennent les droits <Tag>{meta.tag}</Tag> à la connexion, sans modifier leur rôle en base.
                {' '}{meta.hint}
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div>
                    <Text type="secondary">Direction</Text>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder="Choisir une direction"
                        value={directionId}
                        onChange={onDirectionChange}
                        options={directionOptions}
                    />
                </div>
                <div>
                    <Text type="secondary">Mots-clés dans l&apos;intitulé de poste (séparés par des virgules)</Text>
                    <Input
                        value={jobPatterns}
                        onChange={(e) => onPatternsChange(e.target.value)}
                        placeholder={meta.defaultPatterns}
                        style={{ marginTop: 4 }}
                    />
                </div>
            </Space>
        </Card>
    );
}

export default function AdminRoleConfigTab() {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [directions, setDirections] = useState([]);
    const [rules, setRules] = useState({
        [ROLES.RESPONSABLE]: [],
        [ROLES.COORDINATEUR]: [],
        [ROLES.CONSOLIDATEUR]: [],
        [ROLES.ADMIN]: [],
    });
    const [elevations, setElevations] = useState(() => {
        const init = {};
        for (const key of ELEVATION_KEYS) {
            init[key] = { directionId: undefined, jobPatterns: ELEVATION_META[key].defaultPatterns };
        }
        return init;
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/role-config');
            setDirections(data?.directions || []);
            const r = data?.rules || {};
            setRules({
                [ROLES.RESPONSABLE]: (r[ROLES.RESPONSABLE] || []).map((x) => x.directionId),
                [ROLES.COORDINATEUR]: (r[ROLES.COORDINATEUR] || []).map((x) => x.directionId),
                [ROLES.CONSOLIDATEUR]: (r[ROLES.CONSOLIDATEUR] || []).map((x) => x.directionId),
                [ROLES.ADMIN]: (r[ROLES.ADMIN] || []).map((x) => x.directionId),
            });
            const fe = data?.functionalElevations || {};
            const adminFallback = data?.adminElevation;
            setElevations((prev) => {
                const next = { ...prev };
                for (const key of ELEVATION_KEYS) {
                    const raw = fe[key] || (key === 'ADMIN' ? adminFallback : null);
                    next[key] = {
                        directionId: raw?.directionId || undefined,
                        jobPatterns: patternsToString(
                            raw?.jobTitlePatterns,
                            ELEVATION_META[key].defaultPatterns,
                        ),
                    };
                }
                return next;
            });
        } catch {
            message.error('Impossible de charger la configuration des rôles');
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => { load(); }, [load]);

    const directionOptions = directions.map((d) => ({
        value: d.id,
        label: d.code ? `${d.name} (${d.code})` : d.name,
    }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const functionalElevations = {};
            for (const key of ELEVATION_KEYS) {
                functionalElevations[key] = {
                    directionId: elevations[key].directionId || null,
                    jobTitlePatterns: stringToPatterns(elevations[key].jobPatterns),
                };
            }
            await api.put('/role-config', { rules, functionalElevations });
            message.success('Configuration enregistrée');
            load();
        } catch (err) {
            message.error(err?.response?.data?.error || 'Erreur enregistrement');
        } finally {
            setSaving(false);
        }
    };

    const setElevation = (key, patch) => {
        setElevations((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            <Title level={4} style={{ marginTop: 0 }}>
                <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                Rôles et directions
            </Title>
            <Paragraph type="secondary">
                Quatre rôles système : Responsable, Coordinateur, Consolidateur, Administrateur, Super administrateur.
                Les profils fonctionnels ci-dessous (direction + intitulé de poste) s&apos;ajoutent aux désignations
                par projet (consolidateur / coordinateur sur la fiche projet).
            </Paragraph>

            {ROLE_KEYS.map((roleKey) => (
                <Card key={roleKey} size="small" style={{ marginBottom: 12 }}>
                    <Text strong>{ROLE_LABELS_UI[roleKey]}</Text>
                    <div style={{ marginTop: 8 }}>
                        <Select
                            mode="multiple"
                            allowClear
                            style={{ width: '100%' }}
                            placeholder="Directions autorisées pour ce rôle (vide = toutes)"
                            value={rules[roleKey]}
                            onChange={(v) => setRules((prev) => ({ ...prev, [roleKey]: v }))}
                            options={directionOptions}
                            optionFilterProp="label"
                        />
                    </div>
                </Card>
            ))}

            <Title level={5}>Profils fonctionnels (direction + intitulé de poste)</Title>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
                Même principe que l&apos;élévation Administrateur : l&apos;utilisateur conserve son rôle en base
                mais obtient les capacités indiquées à la connexion.
            </Paragraph>

            {ELEVATION_KEYS.map((key) => (
                <ElevationCard
                    key={key}
                    meta={ELEVATION_META[key]}
                    directionId={elevations[key].directionId}
                    jobPatterns={elevations[key].jobPatterns}
                    directionOptions={directionOptions}
                    onDirectionChange={(v) => setElevation(key, { directionId: v })}
                    onPatternsChange={(v) => setElevation(key, { jobPatterns: v })}
                />
            ))}

            <Divider />
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                Enregistrer la configuration
            </Button>
        </div>
    );
}
