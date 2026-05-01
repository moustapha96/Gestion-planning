import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Divider, Space, Steps } from 'antd';
import { MailOutlined, LockOutlined, HomeOutlined, SafetyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
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

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('credentials');
    const [tempToken, setTempToken] = useState(null);
    const { login, loginWith2FA } = useAuth();
    const navigate = useNavigate();

    const handleCredentials = async (values) => {
        setError('');
        setLoading(true);
        try {
            const result = await login(values.email, values.password);
            if (result.twoFactorRequired) {
                setTempToken(result.tempToken);
                setStep('totp');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Email ou mot de passe incorrect');
        } finally {
            setLoading(false);
        }
    };

    const handleTOTP = async (values) => {
        setError('');
        setLoading(true);
        try {
            await loginWith2FA(tempToken, values.code);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Code invalide');
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
                        {step === 'credentials' ? 'Connectez-vous à votre compte' : 'Vérification en deux étapes'}
                    </Text>
                </div>

                <Divider style={{ borderColor: '#E8EFF8', margin: '16px 0' }} />

                {/* Indicateur 2FA */}
                {step === 'totp' && (
                    <div style={{ marginBottom: 20 }}>
                        <Steps
                            current={1}
                            size="small"
                            items={[
                                { title: <span style={{ fontSize: 12, color: '#888' }}>Identifiants</span> },
                                { title: <span style={{ fontSize: 12, color: ADM_BLUE }}>Code 2FA</span> },
                            ]}
                        />
                    </div>
                )}

                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />}

                {/* Étape 1 : email + mot de passe */}
                {step === 'credentials' && (
                    <Form layout="vertical" onFinish={handleCredentials}>
                        <Form.Item
                            name="email"
                            label={<span style={{ color: '#1A2B4A', fontWeight: 500 }}>Email</span>}
                            rules={[{ required: true, type: 'email', message: 'Email valide requis' }]}
                        >
                            <Input prefix={<MailOutlined style={{ color: '#90A8C8' }} />} size="large" placeholder="votre@email.com" />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label={<span style={{ color: '#1A2B4A', fontWeight: 500 }}>Mot de passe</span>}
                            rules={[{ required: true, message: 'Mot de passe requis' }]}
                        >
                            <Input.Password prefix={<LockOutlined style={{ color: '#90A8C8' }} />} size="large" placeholder="••••••••" />
                        </Form.Item>
                        <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -8 }}>
                            <Link to="/forgot-password" style={{ color: ADM_BLUE, fontSize: 13 }}>Mot de passe oublié ?</Link>
                        </div>
                        <Form.Item style={{ marginBottom: 8 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={loading}
                                    block
                                    style={{ background: ADM_BLUE, borderColor: ADM_BLUE, fontWeight: 600, height: 44 }}
                                >
                                    Se connecter
                                </Button>
                                <Button
                                    size="large"
                                    icon={<HomeOutlined />}
                                    block
                                    onClick={() => navigate('/')}
                                    style={{ color: ADM_BLUE, borderColor: '#C5D8F0', fontWeight: 600, height: 44 }}
                                >
                                    Voir l&apos;accueil du planning
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                )}

                {/* Étape 2 : code TOTP */}
                {step === 'totp' && (
                    <div>
                        <div style={{
                            background: '#F0F6FF',
                            borderRadius: 10,
                            padding: 18,
                            marginBottom: 20,
                            border: '1px solid #C5D8F0',
                            textAlign: 'center',
                        }}>
                            <SafetyOutlined style={{ fontSize: 32, color: '#48BB78', marginBottom: 8 }} />
                            <div style={{ color: '#0D2F63', fontWeight: 600, marginBottom: 4 }}>
                                Double authentification activée
                            </div>
                            <div style={{ color: '#5A7BA8', fontSize: 13 }}>
                                Ouvrez votre application d'authentification (Google Authenticator, Authy…)
                                et entrez le code à 6 chiffres.
                            </div>
                        </div>

                        <Form layout="vertical" onFinish={handleTOTP}>
                            <Form.Item
                                name="code"
                                label={<span style={{ color: '#1A2B4A', fontWeight: 500 }}>Code de vérification</span>}
                                rules={[
                                    { required: true, message: 'Code requis' },
                                    { pattern: /^\d{6}$/, message: 'Le code doit contenir 6 chiffres' },
                                ]}
                            >
                                <Input
                                    prefix={<SafetyOutlined style={{ color: '#90A8C8' }} />}
                                    size="large"
                                    placeholder="000000"
                                    maxLength={6}
                                    style={{ letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
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
                                        style={{ background: '#48BB78', borderColor: '#48BB78', fontWeight: 600, height: 44 }}
                                    >
                                        Vérifier le code
                                    </Button>
                                    <Button
                                        size="large"
                                        icon={<ArrowLeftOutlined />}
                                        block
                                        onClick={() => { setStep('credentials'); setTempToken(null); setError(''); }}
                                        style={{ color: ADM_BLUE, borderColor: '#C5D8F0', height: 44 }}
                                    >
                                        Retour à la connexion
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>

                        <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                            Le code expire dans 30 secondes. Générez-en un nouveau si besoin.
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
