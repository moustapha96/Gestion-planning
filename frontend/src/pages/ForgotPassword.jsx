import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../api/client';
import logo from '../assets/logo-gp.png';

const { Text } = Typography;

const pageStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1A365D 0%, #0d2a45 100%)',
};

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (values) => {
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: values.email });
            setSuccess(true);
        } catch {
            setError('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={pageStyle}>
            <div style={{ width: '100%', maxWidth: 420, padding: '0 16px' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <img src={logo} alt="Gestion Planning logo" style={{ height: 200, marginBottom: 5 }} />
                    <Text style={{ color: 'rgba(255,255,255,0.75)', display: 'block' }}>
                        {success ? 'Réinitialisation du mot de passe' : 'Mot de passe oublié'}
                    </Text>
                    {!success && (
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'block', marginTop: 8 }}>
                            Saisissez votre email pour recevoir un lien de réinitialisation.
                        </Text>
                    )}
                </div>

                {success ? (
                    <Result
                        status="success"
                        title="Email envoyé"
                        style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'block', marginTop: 8 }}
                        subTitle="Si cet email est enregistré, vous recevrez un lien de réinitialisation dans quelques instants."
                        extra={
                            <Link to="/login">
                                <Button type="primary">Retour à la connexion</Button>
                            </Link>
                        }
                    />
                ) : (
                    <>
                        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.9)', marginBottom: 24, width: 'fit-content' }}>
                            <ArrowLeftOutlined /> Retour à la connexion
                        </Link>

                        {error && <Alert title={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                        <Form layout="vertical" onFinish={handleSubmit}>
                            <Form.Item name="email" label={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Email</span>} rules={[{ required: true, type: 'email', message: 'Email valide requis' }]}>
                                <Input prefix={<MailOutlined />} size="large" placeholder="votre@email.com" />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" size="large" loading={loading} block>
                                    Envoyer le lien
                                </Button>
                            </Form.Item>
                        </Form>
                    </>
                )}
            </div>
        </div>
    );
}
