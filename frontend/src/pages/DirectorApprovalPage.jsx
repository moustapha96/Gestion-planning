import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Typography, Button, Input, Result, Spin, Space, App } from 'antd';
import api from '../api/client';

const { Title, Text } = Typography;

export default function DirectorApprovalPage() {
    const { message } = App.useApp();
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const action = params.get('action') || 'approve';
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (action === 'approve' && token) {
            (async () => {
                setStatus('loading');
                try {
                    await api.post('/public/director-approval/approve', { token });
                    setStatus('approved');
                } catch (err) {
                    setError(err?.response?.data?.error || 'Lien invalide ou déjà utilisé.');
                    setStatus('error');
                }
            })();
        }
    }, [action, token]);

    const submitReject = async () => {
        if (!reason.trim()) {
            message.error('Le motif de refus est obligatoire.');
            return;
        }
        setStatus('loading');
        try {
            await api.post('/public/director-approval/reject', { token, reason: reason.trim() });
            setStatus('rejected');
        } catch (err) {
            setError(err?.response?.data?.error || 'Lien invalide ou déjà utilisé.');
            setStatus('error');
        }
    };

    if (!token) {
        return <Result status="warning" title="Lien incomplet" />;
    }

    if (status === 'loading' || (action === 'approve' && status === 'idle')) {
        return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
    }

    if (status === 'approved') {
        return <Result status="success" title="Demande validée" subTitle="La mission ou réunion est désormais publiée au calendrier." />;
    }
    if (status === 'rejected') {
        return <Result status="info" title="Demande refusée" subTitle="L'Assistant a été notifié du motif." />;
    }
    if (status === 'error') {
        return <Result status="error" title="Action impossible" subTitle={error} />;
    }

    return (
        <div style={{ maxWidth: 520, margin: '48px auto', padding: 16 }}>
            <Card>
                <Title level={4}>Refuser la demande</Title>
                <Text type="secondary">Indiquez le motif qui sera transmis à l&apos;Assistant.</Text>
                <Input.TextArea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motif du refus"
                    style={{ marginTop: 16 }}
                />
                <Space style={{ marginTop: 16 }}>
                    <Button type="primary" danger onClick={submitReject}>Confirmer le refus</Button>
                </Space>
            </Card>
        </div>
    );
}
