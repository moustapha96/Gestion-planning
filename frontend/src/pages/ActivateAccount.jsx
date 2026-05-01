import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography, Result, Spin, Alert, Divider } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import api from '../api/client';
import logo from '../assets/logo-gp.png';

const { Title, Text } = Typography;

const pageStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #0B2F6E 0%, #1565C0 55%, #0A2550 100%)',
    padding: '24px 16px',
};

const cardStyle = {
    width: '100%',
    maxWidth: 440,
    background: '#ffffff',
    borderRadius: 18,
    padding: '36px 40px 28px',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
};

const ADM_BLUE = '#1565C0';

export default function ActivateAccount() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Lien d\'activation invalide. Vérifiez l\'URL reçue par email.');
            return;
        }
        let cancelled = false;
        setStatus('loading');
        api.post('/auth/activate', { token })
            .then((res) => {
                if (cancelled) return;
                setStatus('success');
                setMessage(res.data?.message || 'Compte activé.');
            })
            .catch((err) => {
                if (cancelled) return;
                setStatus('error');
                setMessage(err.response?.data?.error || 'Ce lien a expiré ou est invalide. Demandez à l\'administrateur de renvoyer un email d\'activation.');
            });
        return () => { cancelled = true; };
    }, [token]);

    return (
        <div className="auth-page" style={pageStyle}>
            <div style={cardStyle}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <img
                        src={logo}
                        alt="ADM – Agence de Développement Municipal"
                        style={{ height: 110, objectFit: 'contain', marginBottom: 12 }}
                    />
                    <Title level={4} style={{ margin: 0, color: '#0D2F63', fontWeight: 700 }}>
                        Gestion Planning
                    </Title>
                    <Text style={{ color: '#5A7BA8', fontSize: 13 }}>
                        Activation du compte
                    </Text>
                </div>

                <Divider style={{ borderColor: '#E8EFF8', margin: '16px 0' }} />

                {status === 'loading' && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16, color: '#5A7BA8' }}>Activation en cours…</p>
                    </div>
                )}

                {status === 'success' && (
                    <Result
                        status="success"
                        title={<span style={{ color: '#0D2F63' }}>Compte activé</span>}
                        subTitle={<span style={{ color: '#5A7BA8' }}>{message}</span>}
                        extra={
                            <Button
                                type="primary"
                                size="large"
                                icon={<LoginOutlined />}
                                onClick={() => navigate('/login')}
                                style={{ background: ADM_BLUE, borderColor: ADM_BLUE }}
                            >
                                Se connecter
                            </Button>
                        }
                    />
                )}

                {status === 'error' && (
                    <>
                        <Result
                            status="error"
                            title={<span style={{ color: '#0D2F63' }}>Activation impossible</span>}
                            subTitle={<span style={{ color: '#5A7BA8' }}>{message}</span>}
                        />
                        <Alert
                            message="Que faire ?"
                            description="Si le lien a expiré, contactez votre administrateur pour qu'il crée à nouveau votre compte ou renvoie un email d'activation."
                            type="info"
                            showIcon
                            style={{ marginTop: 8, borderRadius: 8 }}
                        />
                        <div style={{ marginTop: 20, textAlign: 'center' }}>
                            <Button
                                type="primary"
                                onClick={() => navigate('/login')}
                                style={{ background: ADM_BLUE, borderColor: ADM_BLUE }}
                            >
                                Aller à la page de connexion
                            </Button>
                        </div>
                    </>
                )}

                {status === 'idle' && !token && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <Text style={{ color: '#5A7BA8' }}>Aucun token fourni.</Text>
                        <div style={{ marginTop: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => navigate('/login')}
                                style={{ background: ADM_BLUE, borderColor: ADM_BLUE }}
                            >
                                Page de connexion
                            </Button>
                        </div>
                    </div>
                )}

                <Divider style={{ borderColor: '#E8EFF8', margin: '16px 0 8px' }} />
                <div style={{ fontSize: 12, color: '#B0BEC5', textAlign: 'center' }}>
                    Agence de Développement Municipal · Gestion Planning
                </div>
            </div>
        </div>
    );
}
