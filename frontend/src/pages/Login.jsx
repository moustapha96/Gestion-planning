import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Divider, Space, Steps } from 'antd';
import { MailOutlined, LockOutlined, HomeOutlined, SafetyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

import logo from '../assets/logo-gp.png';

const { Title, Text } = Typography;

const cardStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1A365D 0%, #0d2a45 100%)',
};

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('credentials'); // 'credentials' | 'totp'
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
        <div className="auth-page" style={cardStyle}>
            <div style={{ width: '100%', maxWidth: 420, padding: '0 16px' }}>

                {/* Header logo */}
                <div style={{ textAlign: 'center' }}>
                    <img src={logo} alt="Gestion Planning logo" style={{  height: 200, marginBottom: 5 }} />
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {step === 'credentials' ? 'Connectez-vous à votre compte' : 'Vérification en deux étapes'}
                    </Text>
                </div>

                {/* Indicateur d'étape si 2FA */}
                {step === 'totp' && (
                    <div style={{ marginBottom: 24 }}>
                        <Steps
                            current={1}
                            size="small"
                            items={[
                                { title: <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Identifiants</span> },
                                { title: <span style={{ color: 'white', fontSize: 12 }}>Code 2FA</span> },
                            ]}
                            style={{ '--ant-steps-icon-bg-color': '#48BB78' }}
                        />
                    </div>
                )}

                {error && <Alert title={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                {/* Étape 1 : email + mot de passe */}
                {step === 'credentials' && (
                    <Form layout="vertical" onFinish={handleCredentials}>
                        <Form.Item
                            name="email"
                            label={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Email</span>}
                            rules={[{ required: true, type: 'email', message: 'Email valide requis' }]}
                        >
                            <Input prefix={<MailOutlined />} size="large" placeholder="votre@email.com" />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Mot de passe</span>}
                            rules={[{ required: true, message: 'Mot de passe requis' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} size="large" placeholder="••••••••" />
                        </Form.Item>
                        <div style={{ textAlign: 'right', marginBottom: 16, marginTop: -8 }}>
                            <Link to="/forgot-password" style={{ color: 'rgba(255,255,255,0.9)' }}>Mot de passe oublié ?</Link>
                        </div>
                        <Form.Item>
                            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                                <Button type="primary" htmlType="submit" size="large" loading={loading} block
                                    style={{ background: '#1A365D', borderColor: '#48BB78', borderWidth: 1.5 }}>
                                    Se connecter
                                </Button>
                                <Button size="large" icon={<HomeOutlined />} block onClick={() => navigate('/')}
                                    style={{ background: 'white', color: '#1A365D', borderColor: 'white', fontWeight: 600 }}>
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
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            padding: 20,
                            marginBottom: 20,
                            border: '1px solid rgba(72,187,120,0.3)',
                            textAlign: 'center',
                        }}>
                            <SafetyOutlined style={{ fontSize: 36, color: '#48BB78', marginBottom: 8 }} />
                            <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>
                                Double authentification activée
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                                Ouvrez votre application d'authentification (Google Authenticator, Authy…)
                                et entrez le code à 6 chiffres.
                            </div>
                        </div>

                        <Form layout="vertical" onFinish={handleTOTP}>
                            <Form.Item
                                name="code"
                                label={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Code de vérification</span>}
                                rules={[
                                    { required: true, message: 'Code requis' },
                                    { pattern: /^\d{6}$/, message: 'Le code doit contenir 6 chiffres' },
                                ]}
                            >
                                <Input
                                    prefix={<SafetyOutlined />}
                                    size="large"
                                    placeholder="000000"
                                    maxLength={6}
                                    style={{ letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
                                />
                            </Form.Item>
                            <Form.Item>
                                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                                    <Button type="primary" htmlType="submit" size="large" loading={loading} block
                                        style={{ background: '#48BB78', borderColor: '#48BB78', fontWeight: 600 }}>
                                        Vérifier le code
                                    </Button>
                                    <Button size="large" icon={<ArrowLeftOutlined />} block
                                        onClick={() => { setStep('credentials'); setTempToken(null); setError(''); }}
                                        style={{ background: 'transparent', color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.3)' }}>
                                        Retour à la connexion
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>

                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                            Le code expire dans 30 secondes. Générez-en un nouveau si besoin.
                        </div>
                    </div>
                )}

                <Divider style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                    Gestion Planning · Optimisation et Organisation
                </div>
            </div>
        </div>
    );
}
