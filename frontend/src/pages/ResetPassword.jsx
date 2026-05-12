import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Result, Divider, Space } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../api/client';
import logo from '../assets/logo-adm.png';

const { Text } = Typography;

const pageStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
};

const cardStyle = {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: '32px 40px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
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

                {/* Header logo */}
                <div style={{ textAlign: 'center' }}>
                    <img src={logo} alt="ADM GP logo" style={{ height: 200, display: 'block', margin: '0 auto 5px' }} />
                    <Text style={{ color: '#5A7BA8', display: 'block', marginTop: 6 }}>
                        {success ? 'Réinitialisation du mot de passe' : 'Nouveau mot de passe'}
                    </Text>
                    {!success && (
                        <Text style={{ color: '#9CA3AF', fontSize: 12, display: 'block', marginTop: 4 }}>
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
                                style={{ background: '#1565C0', borderColor: '#1565C0' }}
                            >
                                Se connecter
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <Link
                            to="/login"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: ADM_BLUE, marginBottom: 20, fontSize: 13 }}
                        >
                            <ArrowLeftOutlined /> Retour à la connexion
                        </Link>

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
                            <Form.Item>
                                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        loading={loading}
                                        block
                                        style={{ background: '#1565C0', borderColor: '#48BB78', borderWidth: 1.5 }}
                                    >
                                        Réinitialiser le mot de passe
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </>
                )}

                <Divider style={{ borderColor: '#E8EFF8', margin: '16px 0 8px' }} />
                <div style={{ fontSize: 12, color: '#B0BEC5', textAlign: 'center' }}>
                    ADM GP · Optimisation et Organisation
                </div>
            </div>
        </div>
    );
}
