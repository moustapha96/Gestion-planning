import { useEffect, useState, useCallback } from 'react';
import {
    Table, Button, Tag, Space, Typography, Alert, Modal, Input, App, Popconfirm, Switch,
    Checkbox, Divider, Row, Col,
} from 'antd';
import {
    PlusOutlined, DownloadOutlined, DeleteOutlined, CloudSyncOutlined,
    ExclamationCircleOutlined, ClearOutlined, CheckCircleOutlined, CloseCircleOutlined,
    LockOutlined,
} from '@ant-design/icons';
import api from '../api/client';

const { Text } = Typography;

function fmtBytes(n) {
    if (n == null || Number.isNaN(n)) return '—';
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(2)} Mo`;
}

const STATUS_TAG = {
    PENDING: { color: 'orange', label: 'En cours' },
    SUCCESS: { color: 'green', label: 'Réussie' },
    FAILED: { color: 'red', label: 'Échouée' },
};

const KIND_LABEL = { MANUAL: 'Manuelle', SCHEDULED: 'Planifiée' };

export default function AdminSuperBackupsTab() {
    const { message } = App.useApp();
    const [items, setItems] = useState([]);
    const [notifyEmail, setNotifyEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [purging, setPurging] = useState(false);
    const [restoreOpen, setRestoreOpen] = useState({ open: false, row: null });
    const [purgeOpen, setPurgeOpen] = useState(false);
    const [purgeConfirmText, setPurgeConfirmText] = useState('');
    const [purgeCreateBackup, setPurgeCreateBackup] = useState(true);
    const [purgePreserveRooms, setPurgePreserveRooms] = useState(true);
    const [purgePreserveRepertoire, setPurgePreserveRepertoire] = useState(true);
    const [confirmText, setConfirmText] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/super-admin/backups');
            setItems(data.items || []);
            setNotifyEmail(data.notifyEmail || '');
        } catch {
            message.error('Impossible de charger les sauvegardes');
        } finally {
            setLoading(false);
        }
    }, [message]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        setCreating(true);
        try {
            await api.post('/super-admin/backups');
            message.success('Sauvegarde lancée — un email sera envoyé à la fin (succès ou échec)');
            await load();
        } catch (err) {
            message.error(err.response?.data?.error || 'Échec de la sauvegarde');
        } finally {
            setCreating(false);
        }
    };

    const handleDownload = async (row) => {
        try {
            const res = await api.get(`/super-admin/backups/${row.id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/sql' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = row.fileName || 'backup.sql';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            message.error('Téléchargement impossible');
        }
    };

    const handleDelete = async (row) => {
        try {
            await api.delete(`/super-admin/backups/${row.id}`);
            message.success('Sauvegarde supprimée');
            load();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur');
        }
    };

    const openRestore = (row) => {
        setConfirmText('');
        setRestoreOpen({ open: true, row });
    };

    const doRestore = async () => {
        const row = restoreOpen.row;
        if (!row) return Promise.reject();
        if (confirmText !== 'RESTAURER') {
            message.warning('Tapez RESTAURER pour confirmer');
            return Promise.reject();
        }
        try {
            await api.post(`/super-admin/backups/${row.id}/restore`, { confirm: true });
            message.success('Restauration lancée. Redémarrez le serveur si besoin.');
            setRestoreOpen({ open: false, row: null });
            setConfirmText('');
            load();
        } catch (err) {
            message.error(err.response?.data?.error || 'Échec de la restauration');
            return Promise.reject(err);
        }
    };

    const openPurge = () => {
        setPurgeConfirmText('');
        setPurgeCreateBackup(true);
        setPurgePreserveRooms(true);
        setPurgePreserveRepertoire(true);
        setPurgeOpen(true);
    };

    const doPurge = async () => {
        if (purgeConfirmText !== 'PURGE_ALL_DATA') {
            message.warning('Tapez PURGE_ALL_DATA pour confirmer');
            return Promise.reject();
        }
        setPurging(true);
        try {
            const { data } = await api.post('/super-admin/purge-data', {
                confirm: 'PURGE_ALL_DATA',
                createBackup: purgeCreateBackup,
                preserveRooms: purgePreserveRooms,
                preserveRepertoire: purgePreserveRepertoire,
            });
            const preserved = [
                'comptes admin',
                'directions',
                'configuration',
                purgePreserveRooms && 'salles',
                purgePreserveRepertoire && 'répertoire',
            ].filter(Boolean).join(', ');
            message.success(`Purge exécutée — éléments conservés : ${preserved}`);
            setPurgeOpen(false);
            setPurgeConfirmText('');
            setPurgeCreateBackup(true);
            setPurgePreserveRooms(true);
            setPurgePreserveRepertoire(true);
            await load();
            return data;
        } catch (err) {
            message.error(err.response?.data?.error || 'Échec de la purge');
            return Promise.reject(err);
        } finally {
            setPurging(false);
        }
    };

    const columns = [
        {
            title: 'Fichier',
            dataIndex: 'fileName',
            key: 'fileName',
            ellipsis: true,
            render: (t, r) => (
                <div>
                    <Text strong>{t}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {r.startedAt ? new Date(r.startedAt).toLocaleString('fr-FR') : '—'}
                    </Text>
                </div>
            ),
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (s) => {
                const cfg = STATUS_TAG[s] || { color: 'default', label: s };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: 'Type',
            dataIndex: 'kind',
            key: 'kind',
            width: 110,
            render: (k) => KIND_LABEL[k] || k,
        },
        {
            title: 'Taille',
            dataIndex: 'sizeBytes',
            key: 'sizeBytes',
            width: 100,
            render: (n) => fmtBytes(n),
        },
        {
            title: 'Créée par',
            key: 'createdBy',
            width: 160,
            ellipsis: true,
            render: (_, r) => r.createdBy?.name || r.createdBy?.email || '—',
        },
        {
            title: 'Erreur',
            dataIndex: 'errorMessage',
            key: 'errorMessage',
            ellipsis: true,
            render: (e) => (e ? <Text type="danger">{e}</Text> : '—'),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, row) => (
                <Space wrap size={[4, 4]}>
                    {row.status === 'SUCCESS' && (
                        <>
                            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(row)}>
                                Télécharger
                            </Button>
                            <Button size="small" danger onClick={() => openRestore(row)}>
                                Restaurer
                            </Button>
                        </>
                    )}
                    <Popconfirm
                        title="Supprimer ce fichier de sauvegarde ?"
                        okText="Supprimer"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(row)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                            Supprimer
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Sauvegardes PostgreSQL"
                description={(
                    <>
                        Les dumps sont stockés sur le serveur. Après chaque tentative, un email est envoyé à{' '}
                        <Text code>{notifyEmail || '—'}</Text> (variable d’environnement{' '}
                        <Text code>BACKUP_NOTIFY_EMAIL</Text>). La restauration remplace les données selon le script SQL — opération sensible.
                    </>
                )}
            />
            <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="Vider la base de données"
                description={(
                    <>
                        Supprime les données métier (plannings, réunions, missions, projets, utilisateurs…)
                        en conservant obligatoirement la configuration, les comptes admin/super admin et les directions.
                        Les salles et le répertoire sont préservés par défaut (paramétrable). Action irréversible.
                    </>
                )}
                action={(
                    <Button danger icon={<ClearOutlined />} onClick={openPurge}>
                        Vider la base
                    </Button>
                )}
            />
            <Space style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} loading={creating} onClick={handleCreate}>
                    Nouvelle sauvegarde
                </Button>
                <Button icon={<CloudSyncOutlined />} onClick={load} loading={loading}>
                    Actualiser
                </Button>
            </Space>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={items}
                pagination={{ pageSize: 15 }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={(
                    <span>
                        <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                        Restaurer cette sauvegarde ?
                    </span>
                )}
                open={restoreOpen.open}
                onCancel={() => setRestoreOpen({ open: false, row: null })}
                onOk={doRestore}
                okText="Restaurer"
                okButtonProps={{ danger: true }}
                destroyOnClose
            >
                <p>
                    Cette opération exécute le fichier SQL sur la base configurée dans{' '}
                    <Text code>DATABASE_URL</Text>. Les données actuelles peuvent être écrasées ou modifiées.
                </p>
                <p>
                    Pour confirmer, tapez <Text strong>RESTAURER</Text> ci-dessous :
                </p>
                <Input
                    placeholder="RESTAURER"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoComplete="off"
                />
            </Modal>

            <Modal
                title={(
                    <span>
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                        Vider la base de données
                    </span>
                )}
                open={purgeOpen}
                onCancel={() => setPurgeOpen(false)}
                onOk={doPurge}
                okText="Vider maintenant"
                okButtonProps={{ danger: true, loading: purging }}
                width={560}
                destroyOnClose
            >
                {/* Ce qui est toujours préservé */}
                <div style={{
                    background: '#f6ffed', border: '1px solid #b7eb8f',
                    borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                }}>
                    <div style={{ fontWeight: 600, color: '#237804', marginBottom: 8 }}>
                        <LockOutlined style={{ marginRight: 6 }} />
                        Toujours préservés (non modifiable)
                    </div>
                    {[
                        'Comptes Administrateur et Super Administrateur',
                        'Directions (structure organisationnelle)',
                        'Configuration de l\'application (AppSetting)',
                    ].map((item) => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 13 }} />
                            <Text style={{ fontSize: 13 }}>{item}</Text>
                        </div>
                    ))}
                </div>

                {/* Options de préservation */}
                <div style={{
                    background: '#fffbe6', border: '1px solid #ffe58f',
                    borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                }}>
                    <div style={{ fontWeight: 600, color: '#ad6800', marginBottom: 10 }}>
                        Éléments à conserver (optionnel)
                    </div>
                    <Row gutter={[0, 10]}>
                        <Col span={24}>
                            <Checkbox
                                checked={purgePreserveRooms}
                                onChange={(e) => setPurgePreserveRooms(e.target.checked)}
                            >
                                <span style={{ fontWeight: 500 }}>Salles de réunion</span>
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                                    (noms, capacité, équipements)
                                </Text>
                            </Checkbox>
                        </Col>
                        <Col span={24}>
                            <Checkbox
                                checked={purgePreserveRepertoire}
                                onChange={(e) => setPurgePreserveRepertoire(e.target.checked)}
                            >
                                <span style={{ fontWeight: 500 }}>Répertoire téléphonique</span>
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                                    (contacts et numéros)
                                </Text>
                            </Checkbox>
                        </Col>
                    </Row>
                </div>

                {/* Ce qui sera supprimé */}
                <div style={{
                    background: '#fff2f0', border: '1px solid #ffccc7',
                    borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                }}>
                    <div style={{ fontWeight: 600, color: '#cf1322', marginBottom: 8 }}>
                        <CloseCircleOutlined style={{ marginRight: 6 }} />
                        Sera supprimé définitivement
                    </div>
                    {[
                        'Tous les utilisateurs (hors admin)',
                        'Plannings, réunions, missions',
                        'Projets et documents associés',
                        'Messagerie (messages, discussions)',
                        'Réservations de salles',
                        'Notifications et journaux d\'audit (non-admin)',
                        !purgePreserveRooms && 'Salles de réunion',
                        !purgePreserveRepertoire && 'Répertoire téléphonique',
                    ].filter(Boolean).map((item) => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 13 }} />
                            <Text style={{ fontSize: 13 }}>{item}</Text>
                        </div>
                    ))}
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Sauvegarde avant purge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Switch
                        checked={purgeCreateBackup}
                        onChange={setPurgeCreateBackup}
                        checkedChildren="Oui"
                        unCheckedChildren="Non"
                    />
                    <Text>Créer une sauvegarde automatique avant de vider</Text>
                </div>

                {/* Confirmation textuelle */}
                <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 10 }}
                    message="Cette opération est irréversible. Tapez PURGE_ALL_DATA pour confirmer."
                />
                <Input
                    placeholder="PURGE_ALL_DATA"
                    value={purgeConfirmText}
                    onChange={(e) => setPurgeConfirmText(e.target.value)}
                    autoComplete="off"
                    status={purgeConfirmText && purgeConfirmText !== 'PURGE_ALL_DATA' ? 'error' : ''}
                />
            </Modal>
        </div>
    );
}
