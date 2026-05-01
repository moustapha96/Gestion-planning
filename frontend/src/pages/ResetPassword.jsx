import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Result, Divider } from 'antd';
import { LockOutlined } from '@ant-design/icons';
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
    maxWidth: 420,
    background: '#ffffff',
    borderRadius: 18,
    padding: '36px 40px 28px',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
};

const ADM_BLUE = '#1565C0';

export default function ResetPassword() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const handleSubmit = async (values) => {
        if (!token) {
            setError('Token manquant. Veuillez refaire une demande de réinitialisation.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword: values.newPassword });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Token invalide ou expiré.');
        } finally {
            setLoading(false);
        }
    };

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
                        {success ? 'Réinitialisation réussie' : 'Nouveau mot de passe'}
                    </Text>
                    {!success && (
                        <Text style={{ color: '#9CA3AF', fontSize: 12, display: 'block', marginTop: 6 }}>
                            Choisissez un mot de passe sécurisé (minimum 8 caractères).
                        </Text>
                    )}
                </div>

                <Divider style={{ borderColor: '#E8EFF8', margin: '16px 0' }} />

                {success ? (
                    <Result
                        status="success"
                        title={<span style={{ color: '#0D2F63' }}>Mot de passe réinitialisé</span>}
                        subTitle={
                            <span style={{ color: '#5A7BA8' }}>
                                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                            </span>
                        }
                        extra={
                            <Button
                                type="primary"
                                onClick={() => navigate('/login')}
                                style={{ background: ADM_BLUE, borderColor: ADM_BLUE }}
                            >
                                Se connecter
                            </Button>
                        }
                    />
                ) : (
                    <>
                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />}

                        <Form layout="vertical" onFinish={handleSubmit}>
                            <Form.Item
                                name="newPassword"
                                label={<span style={{ color: '#1A2B4A', fontWeight: 500 }}>Nouveau mot de passe</span>}
                                rules={[{ required: true, min: 8, message: 'Minimum 8 caractères' }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#90A8C8' }} />}
                                    size="large"
                                    placeholder="••••••••"
                                />
                            </Form.Item>
                            <Form.Item
                                name="confirm"
                                label={<span style={{ color: '#1A2B4A', fontWeight: 500 }}>Confirmer le mot de passe</span>}
                                dependencies={['newPassword']}
                                rules={[
                                    { required: true, message: 'Confirmation requise' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                            return Promise.reject('Les mots de passe ne correspondent pas');
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#90A8C8' }} />}
                                    size="large"
                                    placeholder="••••••••"
                                />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 8 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={loading}
                                    block
                                    style={{ background: ADM_BLUE, borderColor: ADM_BLUE, fontWeight: 600, height: 44 }}
                                >
                                    Réinitialiser le mot de passe
                                </Button>
                            </Form.Item>
                        </Form>
                    </>
                )}

                <Divider style={{ borderColor: '#E8EFF8', margin: '16px 0 8px' }} />
                <div style={{ fontSize: 12, color: '#B0BEC5', textAlign: 'center' }}>
                    Agence de Développement Municipal · Gestion Planning
                </div>
            </div>
        </div>
    );
}
