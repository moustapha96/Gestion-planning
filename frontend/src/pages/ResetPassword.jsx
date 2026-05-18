import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Result, Divider, Space } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../api/client';
import logo from '../assets/logo-adm.png';
import { PASSWORD_FORM_RULES, PASSWORD_HINT } from '../utils/passwordRules';

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

    const token = useMemo(() => {
        const raw = searchParams.get('token');
        if (!raw) return '';
        try {
            return decodeURIComponent(raw).trim();
        } catch {
            return raw.trim();
        }
    }, [searchParams]);

    const tokenMissing = !token;

    const handleSubmit = async (values) => {
        if (!token) {
            setError('Lien invalide. Refaites une demande de réinitialisation.');
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

                <div style={{ textAlign: 'center' }}>
                    <img src={logo} alt="ADM GP logo" style={{ height: 200, display: 'block', margin: '0 auto 5px' }} />
                    <Text style={{ color: '#5A7BA8', display: 'block', marginTop: 6 }}>
                        {success ? 'Réinitialisation du mot de passe' : 'Nouveau mot de passe'}
                    </Text>
                    {!success && !tokenMissing && (
                        <Text style={{ color: '#9CA3AF', fontSize: 12, display: 'block', marginTop: 4 }}>
                            {PASSWORD_HINT}
                        </Text>
                    )}
                </div>

                <Divider style={{ borderColor: '#E8EFF8', margin: '16px 0' }} />

                {success ? (
                    <Result
                        status="success"
                        title={<span style={{ color: '#0D2F63' }}>Mot de passe réinitialisé</span>}
                        subTitle={(
                            <span style={{ color: '#5A7BA8' }}>
                                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                            </span>
                        )}
                        extra={(
                            <Button
                                type="primary"
                                onClick={() => navigate('/login')}
                                style={{ background: '#1565C0', borderColor: '#1565C0' }}
                            >
                                Se connecter
                            </Button>
                        )}
                    />
                ) : tokenMissing ? (
                    <Result
                        status="warning"
                        title="Lien invalide"
                        subTitle="Ce lien de réinitialisation est incomplet ou a expiré."
                        extra={(
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Link to="/forgot-password">
                                    <Button type="primary" block style={{ background: '#1565C0', borderColor: '#1565C0' }}>
                                        Demander un nouveau lien
                                    </Button>
                                </Link>
                                <Link to="/login">
                                    <Button type="link" block>Retour à la connexion</Button>
                                </Link>
                            </Space>
                        )}
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
                                rules={PASSWORD_FORM_RULES}
                                hasFeedback
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#90A8C8' }} />}
                                    size="large"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </Form.Item>
                            <Form.Item
                                name="confirm"
                                label={<span style={{ color: '#1A2B4A', fontWeight: 500 }}>Confirmer le mot de passe</span>}
                                dependencies={['newPassword']}
                                hasFeedback
                                rules={[
                                    { required: true, message: 'Confirmation requise' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#90A8C8' }} />}
                                    size="large"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </Form.Item>
                            <Form.Item>
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
