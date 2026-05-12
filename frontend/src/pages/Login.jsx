import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Divider, Space, Steps } from 'antd';
import { MailOutlined, LockOutlined, HomeOutlined, SafetyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

import logo from '../assets/logo-adm.png';

const { Title, Text } = Typography;

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
    padding: '22px 32px 16px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};

const ADM_BLUE = '#1565C0';

export default function Login() {
    const [form] = Form.useForm();
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
            const status = err?.response?.status;
            const serverMessage = err?.response?.data?.error;
            const authFailed =
                status === 401 ||
                status === 403 ||
                /incorrect|invalide|invalid|wrong|mot de passe|password|identifiant|email/i.test(serverMessage || '');

            form.setFieldsValue({ email: values.email });
            setError(authFailed ? 'Identifiants incorrects (email ou mot de passe).' : (serverMessage || 'Une erreur est survenue. Veuillez reessayer.'));
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

                {/* Header logo */}
                <div style={{ textAlign: 'center' }}>
                    <img src={logo} alt="ADM GP logo" style={{ height: 148, display: 'block', margin: '0 auto 2px' }} />
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {step === 'credentials' ? 'Connectez-vous à votre compte' : 'Vérification en deux étapes'}
                    </Text>
                </div>

                <Divider style={{ borderColor: '#E8EFF8', margin: '10px 0 12px' }} />

                {/* Indicateur 2FA */}
                {step === 'totp' && (
                    <div style={{ marginBottom: 14 }}>
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
                    <Form form={form} layout="vertical" onFinish={handleCredentials}>
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
                        <div style={{ textAlign: 'right', marginBottom: 12, marginTop: -8 }}>
                            <Link to="/forgot-password" style={{ color: ADM_BLUE, fontSize: 13 }}>Mot de passe oublié ?</Link>
                        </div>
                        <Form.Item>
                            <Space orientation="vertical" style={{ width: '100%' }} size="small">
                                <Button type="primary" htmlType="submit" size="large" loading={loading} block
                                    style={{ background: '#1565C0', borderColor: '#48BB78', borderWidth: 1.5 }}>
                                    Se connecter
                                </Button>
                                <Button size="large" icon={<HomeOutlined />} block onClick={() => navigate('/')}
                                    style={{ background: 'white', color: '#1565C0', borderColor: 'white', fontWeight: 600 }}>
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
                            padding: 14,
                            marginBottom: 14,
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
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
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

                        <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                            Le code expire dans 30 secondes. Générez-en un nouveau si besoin.
                        </div>
                    </div>
                )}

                <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '12px 0 8px' }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                    ADM GP · Optimisation et Organisation
                </div>
            </div>
        </div>
    );
}
