import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography, Result, Spin, Alert } from 'antd';
import { CheckCircleOutlined, LoginOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Text } = Typography;

export default function ActivateAccount() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
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
        <div
            className="auth-page"
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1F5C8B 0%, #0d3a5a 100%)',
            }}
        >
            <div style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                    }}>
                        <CheckCircleOutlined style={{ color: 'white', fontSize: 28 }} />
                    </div>
                    <Text strong style={{ fontSize: 18, display: 'block', color: 'white' }}>Activation du compte</Text>
                </div>

                {status === 'loading' && (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16, color: '#666' }}>Activation en cours...</p>
                    </div>
                )}

                {status === 'success' && (
                    <Result
                        status="success"
                        title="Compte activé"
                        subTitle={message}
                        extra={
                            <Button type="primary" size="large" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                                Se connecter
                            </Button>
                        }
                    />
                )}

                {status === 'error' && (
                    <>
                        <Result
                            status="error"
                            title="Activation impossible"
                            subTitle={message}
                        />
                        <Alert
                            title="Que faire ?"
                            description="Si le lien a expiré, contactez votre administrateur pour qu'il crée à nouveau votre compte ou renvoie un email d'activation."
                            type="info"
                            showIcon
                            style={{ marginTop: 16 }}
                        />
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <Button type="primary" onClick={() => navigate('/login')}>
                                Aller à la page de connexion
                            </Button>
                        </div>
                    </>
                )}

                {status === 'idle' && !token && (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Aucun token fourni.</Text>
                        <div style={{ marginTop: 16 }}>
                            <Button type="primary" onClick={() => navigate('/login')}>
                                Page de connexion
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
