import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import api from '../api/client';
import logo from '../assets/logo-adm.png';

const { Text } = Typography;

const pageStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #3e7cbc 0%, #2a5fa0 100%)',
};

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
            <div style={{ width: '100%', maxWidth: 420, padding: '0 16px' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <img src={logo} alt="ADM GP logo" style={{ height: 200, marginBottom: 5 }} />
                    <Text style={{ color: 'rgba(255,255,255,0.75)', display: 'block' }}>
                        {success ? 'Réinitialisation du mot de passe' : 'Nouveau mot de passe'}
                    </Text>
                    {!success && (
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'block', marginTop: 8 }}>
                            Choisissez un mot de passe sécurisé (minimum 8 caractères).
                        </Text>
                    )}
                </div>

                {success ? (
                    <Result
                        status="success"
                        title="Mot de passe réinitialisé"
                        subTitle="Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
                        extra={
                            <Button type="primary" onClick={() => navigate('/login')}>
                                Se connecter
                            </Button>
                        }
                    />
                ) : (
                    <>
                        {error && <Alert title={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                        <Form layout="vertical" onFinish={handleSubmit}>
                            <Form.Item
                                name="newPassword"
                                label={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Nouveau mot de passe</span>}
                                rules={[{ required: true, min: 8, message: 'Minimum 8 caractères' }]}
                            >
                                <Input.Password prefix={<LockOutlined />} size="large" />
                            </Form.Item>
                            <Form.Item
                                name="confirm"
                                label={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Confirmer le mot de passe</span>}
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
                                <Input.Password prefix={<LockOutlined />} size="large" />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" size="large" loading={loading} block>
                                    Réinitialiser le mot de passe
                                </Button>
                            </Form.Item>
                        </Form>
                    </>
                )}
            </div>
        </div>
    );
}
