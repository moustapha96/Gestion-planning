import { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Input, Button, Tag, Space, Typography, App } from 'antd';
import { SearchOutlined, LinkOutlined, CloudSyncOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../api/client';

const { Text } = Typography;

function fmtBytes(n) {
    if (n == null || Number.isNaN(n)) return '—';
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(2)} Mo`;
}

const KIND_LABEL = {
    MISSION_FILE: 'Mission',
    MEETING_FILE: 'Réunion',
    DIRECT_MESSAGE_FILE: 'Messagerie',
};

export default function AdminSuperDocumentsTab() {
    const { message } = App.useApp();
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/super-admin/documents', {
                params: { q: q.trim() || undefined, limit: 400 },
            });
            setItems(data.items || []);
            setTotal(data.total ?? (data.items || []).length);
        } catch {
            message.error('Impossible de charger les documents');
        } finally {
            setLoading(false);
        }
    }, [message, q]);

    useEffect(() => {
        const delay = q.trim() ? 350 : 0;
        const t = setTimeout(() => { load(); }, delay);
        return () => clearTimeout(t);
    }, [load]);

    const columns = useMemo(() => [
        {
            title: 'Type',
            dataIndex: 'kind',
            key: 'kind',
            width: 120,
            render: (k) => <Tag>{KIND_LABEL[k] || k}</Tag>,
        },
        {
            title: 'Fichier',
            dataIndex: 'fileName',
            key: 'fileName',
            ellipsis: true,
            render: (name, row) => (
                <div>
                    <Text strong>{name}</Text>
                    {row.meta?.to && (
                        <>
                            <br />
                            <Text type="secondary" style={{ fontSize: 11 }}>vers {row.meta.to}</Text>
                        </>
                    )}
                </div>
            ),
        },
        {
            title: 'Contexte',
            dataIndex: 'label',
            key: 'label',
            width: 180,
            ellipsis: true,
            render: (label, row) => (
                row.contextLink
                    ? <Link to={row.contextLink}>{label}</Link>
                    : label
            ),
        },
        {
            title: 'Taille',
            dataIndex: 'size',
            key: 'size',
            width: 90,
            render: (n) => fmtBytes(n),
        },
        {
            title: 'Déposé par',
            key: 'uploadedBy',
            width: 160,
            ellipsis: true,
            render: (_, row) => row.uploadedBy?.name || row.uploadedBy?.email || '—',
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (d) => (d ? new Date(d).toLocaleString('fr-FR') : '—'),
        },
        {
            title: 'Lien',
            key: 'fileUrl',
            width: 100,
            render: (_, row) => {
                const href = row.fileUrl?.startsWith('http')
                    ? row.fileUrl
                    : row.fileUrl || '#';
                return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        <LinkOutlined /> Ouvrir
                    </a>
                );
            },
        },
    ], []);

    return (
        <div>
            <Space wrap style={{ marginBottom: 16 }}>
                <Input
                    allowClear
                    placeholder="Rechercher (nom, contexte, auteur…)"
                    prefix={<SearchOutlined />}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ width: 320 }}
                />
                <Button icon={<CloudSyncOutlined />} onClick={load} loading={loading}>
                    Actualiser
                </Button>
                <Text type="secondary">{total} fichier(s) affiché(s)</Text>
            </Space>
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={items}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
}
