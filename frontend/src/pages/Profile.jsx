import { useState, useRef, useEffect } from 'react';
import {
    Card, Form, Input, Button, Typography, App, Row, Col,
    Tag, Divider, Progress, Modal, Popconfirm, Spin, Space, Switch, Alert,
} from 'antd';
import {
    LockOutlined, CameraOutlined, UserOutlined, MailOutlined,
    SaveOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
    SafetyOutlined, QrcodeOutlined, StopOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import api from '../api/client';

const { Title, Text, Paragraph } = Typography;

const ROLE_LABELS = {
    RESPONSABLE:   'Responsable',
    CONSOLIDATEUR: 'Consolidateur',
    DG:            'Directeur Général',
    ADMIN:         'Administrateur',
    SUPER_ADMIN:   'Super administrateur',
};
const ROLE_COLORS = {
    RESPONSABLE:   'blue',
    CONSOLIDATEUR: 'purple',
    DG:            'gold',
    ADMIN:         'red',
    SUPER_ADMIN:   'magenta',
};

// ── Indicateur de force de mot de passe ─────────────────────────
function PasswordStrength({ value }) {
    if (!value) return null;

    const checks = [
        { label: 'Minimum 8 caractères',  ok: value.length >= 8           },
        { label: 'Majuscule (A-Z)',        ok: /[A-Z]/.test(value)        },
        { label: 'Chiffre (0-9)',          ok: /[0-9]/.test(value)        },
        { label: 'Caractère spécial',      ok: /[^A-Za-z0-9]/.test(value) },
    ];
    const passed  = checks.filter((c) => c.ok).length;
    const percent = Math.round((passed / checks.length) * 100);
    const color   = passed <= 1 ? '#f5222d' : passed === 2 ? '#fa8c16' : passed === 3 ? '#faad14' : '#52c41a';
    const label   = passed <= 1 ? 'Faible' : passed === 2 ? 'Moyen' : passed === 3 ? 'Bien' : 'Fort';

    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12 }}>Robustesse</Text>
                <Text style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</Text>
            </div>
            <Progress percent={percent} showInfo={false} strokeColor={color} size="small" style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {checks.map((c) => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.ok
                            ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                            : <CloseCircleOutlined style={{ color: '#d9d9d9',  fontSize: 12 }} />
                        }
                        <Text style={{ fontSize: 11, color: c.ok ? '#262626' : '#8c8c8c' }}>{c.label}</Text>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Page principale ──────────────────────────────────────────────
export default function Profile() {
    const { user, updateUser, logout } = useAuth();
    const { message }                  = App.useApp();
    const [directionLoading, setDirectionLoading] = useState(false);

    // ── État avatar ──────────────────────────────────────────────
    const [avatarLoading,  setAvatarLoading]  = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewModal,   setPreviewModal]   = useState({ open: false, src: null, file: null });
    const [hovering,       setHovering]       = useState(false);
    const fileInputRef                        = useRef(null);

    // ── État infos profil ────────────────────────────────────────
    const [profileForm]    = Form.useForm();
    const [profileLoading, setProfileLoading] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);

    // ── État mot de passe ────────────────────────────────────────
    const [pwForm]      = Form.useForm();
    const [pwLoading,   setPwLoading]   = useState(false);
    const [newPwValue,  setNewPwValue]  = useState('');
    const [twoFA, setTwoFA] = useState({
        loading: true,
        globallyEnabled: false,
        userEnabled: false,
        qrCode: null,
        secret: null,
    });
    const [twoFACode, setTwoFACode] = useState('');
    const [disablePwd, setDisablePwd] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);

    // ── Sélection d'un fichier (via input caché) ─────────────────
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!e.target.files) return;
        // Réinitialiser l'input pour pouvoir re-sélectionner le même fichier
        e.target.value = '';
        if (!file) return;

        const isImage = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type) ||
            /\.(jpe?g|png|gif|webp)$/i.test(file.name);
        if (!isImage) {
            message.error('Format non supporté. Utilisez JPG, PNG, GIF ou WebP.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            message.error("L'image ne doit pas dépasser 5 Mo.");
            return;
        }
        // Afficher prévisualisation avant upload
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewModal({ open: true, src: ev.target.result, file });
        reader.readAsDataURL(file);
    };

    // ── Upload effectif ──────────────────────────────────────────
    const confirmUpload = async () => {
        const { file } = previewModal;
        if (!file) return;
        setPreviewModal({ open: false, src: null, file: null });
        setAvatarLoading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const { data } = await api.post('/auth/me/avatar', formData, {
                onUploadProgress: (e) => {
                    if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
                },
            });
            // Utiliser l'objet user retourné (avec updatedAt) pour le cache-busting
            const updatedUser = data.user ?? { ...user, avatarUrl: data.avatarUrl };
            updateUser(updatedUser);
            message.success('Photo de profil mise à jour !');
        } catch (err) {
            message.error(err.response?.data?.error || "Erreur lors de l'upload.");
        } finally {
            setAvatarLoading(false);
            setUploadProgress(0);
        }
    };

    // ── Suppression photo ────────────────────────────────────────
    const handleDeleteAvatar = async () => {
        setAvatarLoading(true);
        try {
            const { data } = await api.delete('/auth/me/avatar');
            updateUser(data.user ?? { ...user, avatarUrl: null });
            message.success('Photo de profil supprimée.');
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de la suppression.');
        } finally {
            setAvatarLoading(false);
        }
    };

    // ── Modification du profil (nom) ─────────────────────────────
    const startEditProfile = () => {
        profileForm.setFieldsValue({ name: user?.name, email: user?.email });
        setEditingProfile(true);
    };

    const handleSaveProfile = async (values) => {
        setProfileLoading(true);
        try {
            const { data } = await api.put('/profile', { name: values.name });
            updateUser({ ...user, ...data });
            setEditingProfile(false);
            message.success('Profil mis à jour !');
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors de la mise à jour.');
        } finally {
            setProfileLoading(false);
        }
    };

    // ── Changement de mot de passe ───────────────────────────────
    const handleChangePassword = async (values) => {
        setPwLoading(true);
        try {
            await api.put('/profile/password', {
                currentPassword: values.currentPassword,
                newPassword:     values.newPassword,
            });
            message.success('Mot de passe modifié. Reconnexion dans 2 secondes...');
            pwForm.resetFields();
            setNewPwValue('');
            setTimeout(() => logout(), 2000);
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur lors du changement de mot de passe.');
        } finally {
            setPwLoading(false);
        }
    };

    const loadTwoFAStatus = async () => {
        setTwoFA((s) => ({ ...s, loading: true }));
        try {
            const { data } = await api.get('/2fa/status');
            setTwoFA((s) => ({
                ...s,
                loading: false,
                globallyEnabled: !!data?.globallyEnabled,
                userEnabled: !!data?.userEnabled,
                qrCode: null,
                secret: null,
            }));
        } catch {
            setTwoFA((s) => ({ ...s, loading: false }));
        }
    };

    useEffect(() => {
        loadTwoFAStatus();
    }, []);

    useEffect(() => {
        let active = true;
        const loadMe = async () => {
            setDirectionLoading(true);
            try {
                const { data } = await api.get('/auth/me');
                if (!active || !data) return;
                updateUser({ ...user, ...data });
            } catch {
                // noop: on garde les infos locales si l'appel échoue
            } finally {
                if (active) setDirectionLoading(false);
            }
        };
        loadMe();
        return () => { active = false; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const start2FASetup = async () => {
        setTwoFALoading(true);
        try {
            const { data } = await api.get('/2fa/setup');
            setTwoFA((s) => ({ ...s, qrCode: data.qrCode, secret: data.secret }));
            message.success('QR code généré. Scannez-le puis confirmez avec un code à 6 chiffres.');
        } catch (err) {
            message.error(err.response?.data?.error || 'Impossible de lancer la configuration 2FA.');
        } finally {
            setTwoFALoading(false);
        }
    };

    const enable2FA = async () => {
        if (!/^\d{6}$/.test(twoFACode.trim())) {
            message.warning('Saisissez un code 2FA valide (6 chiffres).');
            return;
        }
        setTwoFALoading(true);
        try {
            await api.post('/2fa/enable', { code: twoFACode.trim() });
            setTwoFACode('');
            message.success('Double authentification activée.');
            await loadTwoFAStatus();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur activation 2FA.');
        } finally {
            setTwoFALoading(false);
        }
    };

    const disable2FA = async () => {
        if (!disablePwd || !/^\d{6}$/.test(disableCode.trim())) {
            message.warning('Mot de passe + code 2FA (6 chiffres) requis.');
            return;
        }
        setTwoFALoading(true);
        try {
            await api.post('/2fa/disable', { password: disablePwd, code: disableCode.trim() });
            setDisablePwd('');
            setDisableCode('');
            message.success('Double authentification désactivée.');
            await loadTwoFAStatus();
        } catch (err) {
            message.error(err.response?.data?.error || 'Erreur désactivation 2FA.');
        } finally {
            setTwoFALoading(false);
        }
    };

    return (
        <div>
            {/* Input fichier caché */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            <Title level={3} style={{ marginBottom: 24 }}>
                <UserOutlined style={{ marginRight: 8 }} />Mon profil
            </Title>

            <Row gutter={[24, 24]}>
                {/* ── Colonne gauche : photo + infos ── */}
                <Col xs={24} md={10} lg={9}>

                    {/* Carte avatar */}
                    <Card style={{ borderRadius: 12, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                            {/* Avatar cliquable avec overlay hover */}
                            <div style={{ display: 'inline-block', position: 'relative', marginBottom: 12 }}>
                                <div
                                    style={{ position: 'relative', cursor: 'pointer', display: 'inline-block' }}
                                    onClick={() => !avatarLoading && fileInputRef.current?.click()}
                                    onMouseEnter={() => setHovering(true)}
                                    onMouseLeave={() => setHovering(false)}
                                    title="Modifier la photo de profil"
                                >
                                    <Spin spinning={avatarLoading} size="large">
                                        <UserAvatar user={user} size={110} />
                                    </Spin>

                                    {/* Overlay hover */}
                                    {hovering && !avatarLoading && (
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.55)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            gap: 4,
                                            pointerEvents: 'none',
                                        }}>
                                            <CameraOutlined style={{ fontSize: 22 }} />
                                            <span style={{ fontSize: 11, fontWeight: 600 }}>Modifier</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Barre de progression upload */}
                            {avatarLoading && uploadProgress > 0 && (
                                <Progress
                                    percent={uploadProgress}
                                    size="small"
                                    style={{ width: 120, margin: '0 auto 8px' }}
                                />
                            )}

                            {/* Nom + rôle */}
                            <div style={{ marginBottom: 12 }}>
                                <Text strong style={{ fontSize: 16, display: 'block' }}>{user?.name}</Text>
                                <Tag
                                    color={ROLE_COLORS[user?.role]}
                                    style={{ marginTop: 4, fontSize: 12 }}
                                >
                                    {ROLE_LABELS[user?.role] || user?.role}
                                </Tag>
                            </div>

                            {/* Actions photo */}
                            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                <Button
                                    icon={<CameraOutlined />}
                                    onClick={() => fileInputRef.current?.click()}
                                    loading={avatarLoading}
                                    style={{ width: '100%' }}
                                >
                                    {user?.avatarUrl ? 'Changer la photo' : 'Ajouter une photo'}
                                </Button>

                                {user?.avatarUrl && (
                                    <Popconfirm
                                        title="Supprimer la photo de profil ?"
                                        description="Votre avatar affichera vos initiales à la place."
                                        onConfirm={handleDeleteAvatar}
                                        okText="Supprimer"
                                        cancelText="Annuler"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Button
                                            danger
                                            type="text"
                                            icon={<DeleteOutlined />}
                                            style={{ width: '100%' }}
                                            disabled={avatarLoading}
                                        >
                                            Supprimer la photo
                                        </Button>
                                    </Popconfirm>
                                )}
                            </Space>

                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 10 }}>
                                JPG, PNG, GIF ou WebP · max 5 Mo
                            </Text>
                        </div>
                    </Card>

                    {/* Carte infos profil */}
                    <Card
                        title="Informations"
                        extra={
                            !editingProfile
                                ? <Button size="small" type="link" onClick={startEditProfile}>Modifier</Button>
                                : null
                        }
                        style={{ borderRadius: 12 }}
                    >
                        {editingProfile ? (
                            <Form
                                form={profileForm}
                                layout="vertical"
                                onFinish={handleSaveProfile}
                            >
                                <Form.Item
                                    name="name"
                                    label="Nom complet"
                                    rules={[{ required: true, message: 'Le nom est requis' }, { min: 2 }]}
                                >
                                    <Input prefix={<UserOutlined />} placeholder="Votre nom complet" />
                                </Form.Item>
                                <Form.Item name="email" label="Email">
                                    <Input
                                        prefix={<MailOutlined />}
                                        disabled
                                        style={{ color: '#595959' }}
                                    />
                                </Form.Item>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <Button onClick={() => setEditingProfile(false)}>
                                        Annuler
                                    </Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={profileLoading}
                                        icon={<SaveOutlined />}
                                    >
                                        Enregistrer
                                    </Button>
                                </div>
                            </Form>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                                        Nom complet
                                    </Text>
                                    <Text strong>{user?.name}</Text>
                                </div>
                                <Divider style={{ margin: '4px 0' }} />
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                                        Adresse email
                                    </Text>
                                    <Text>{user?.email}</Text>
                                </div>
                                <Divider style={{ margin: '4px 0' }} />
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                                        Rôle
                                    </Text>
                                    <Tag color={ROLE_COLORS[user?.role]}>
                                        {ROLE_LABELS[user?.role] || user?.role}
                                    </Tag>
                                </div>
                                <Divider style={{ margin: '4px 0' }} />
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                                        Direction
                                    </Text>
                                    {directionLoading ? (
                                        <Spin size="small" />
                                    ) : user?.direction?.name ? (
                                        <Space size={8} align="center">
                                            {user?.direction?.logoUrl ? (
                                                <img
                                                    src={user.direction.logoUrl}
                                                    alt={`Logo ${user.direction.name}`}
                                                    style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', border: '1px solid #f0f0f0' }}
                                                />
                                            ) : null}
                                            <Text>
                                                {user.direction.name}
                                                {user.direction.code ? ` (${user.direction.code})` : ''}
                                            </Text>
                                        </Space>
                                    ) : (
                                        <Text type="secondary">Aucune direction assignée</Text>
                                    )}
                                </div>
                                {user?.createdAt && (
                                    <>
                                        <Divider style={{ margin: '4px 0' }} />
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                                                Membre depuis
                                            </Text>
                                            <Text style={{ fontSize: 13 }}>
                                                {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                })}
                                            </Text>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </Card>
                </Col>

                {/* ── Colonne droite : mot de passe ── */}
                <Col xs={24} md={14} lg={15}>
                    <Card
                        title={<><LockOutlined style={{ marginRight: 8 }} />Changer le mot de passe</>}
                        style={{ borderRadius: 12 }}
                    >
                        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                            Le mot de passe doit contenir au minimum 8 caractères, une majuscule, un chiffre
                            et un caractère spécial. Vous ne pouvez pas réutiliser vos 3 derniers mots de passe.
                        </Paragraph>

                        <Form
                            form={pwForm}
                            layout="vertical"
                            onFinish={handleChangePassword}
                        >
                            <Form.Item
                                name="currentPassword"
                                label="Mot de passe actuel"
                                rules={[{ required: true, message: 'Requis' }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Mot de passe actuel"
                                />
                            </Form.Item>

                            <Form.Item
                                name="newPassword"
                                label="Nouveau mot de passe"
                                rules={[
                                    { required: true, message: 'Requis' },
                                    { min: 8, message: 'Minimum 8 caractères' },
                                    {
                                        validator(_, value) {
                                            if (!value) return Promise.resolve();
                                            if (!/[A-Z]/.test(value)) return Promise.reject('Doit contenir au moins une majuscule');
                                            if (!/[0-9]/.test(value)) return Promise.reject('Doit contenir au moins un chiffre');
                                            if (!/[^A-Za-z0-9]/.test(value)) return Promise.reject('Doit contenir au moins un caractère spécial');
                                            return Promise.resolve();
                                        },
                                    },
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Nouveau mot de passe"
                                    onChange={(e) => setNewPwValue(e.target.value)}
                                />
                            </Form.Item>

                            {/* Indicateur de robustesse */}
                            <PasswordStrength value={newPwValue} />

                            <Form.Item
                                name="confirm"
                                label="Confirmer le nouveau mot de passe"
                                dependencies={['newPassword']}
                                style={{ marginTop: 16 }}
                                rules={[
                                    { required: true, message: 'Requis' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject('Les mots de passe ne correspondent pas');
                                        },
                                    }),
                                ]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Confirmer le mot de passe"
                                />
                            </Form.Item>

                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={pwLoading}
                                    icon={<LockOutlined />}
                                >
                                    Modifier le mot de passe
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    <Card
                        title={<><SafetyOutlined style={{ marginRight: 8 }} />Double authentification (2FA)</>}
                        style={{ borderRadius: 12, marginTop: 16 }}
                    >
                        {twoFA.loading ? (
                            <Spin />
                        ) : !twoFA.globallyEnabled ? (
                            <Alert
                                type="warning"
                                showIcon
                                title="La 2FA est désactivée globalement par l'administrateur."
                                description="Demandez à un administrateur d'activer la fonctionnalité dans l'administration."
                            />
                        ) : twoFA.userEnabled ? (
                            <>
                                <Alert
                                    type="success"
                                    showIcon
                                    title="La double authentification est activée sur votre compte."
                                    style={{ marginBottom: 16 }}
                                />
                                <Row gutter={[12, 12]}>
                                    <Col xs={24} sm={12}>
                                        <Input.Password
                                            placeholder="Mot de passe actuel"
                                            value={disablePwd}
                                            onChange={(e) => setDisablePwd(e.target.value)}
                                        />
                                    </Col>
                                    <Col xs={16} sm={8}>
                                        <Input
                                            placeholder="Code 2FA"
                                            maxLength={6}
                                            value={disableCode}
                                            onChange={(e) => setDisableCode(e.target.value)}
                                        />
                                    </Col>
                                    <Col xs={8} sm={4}>
                                        <Button
                                            danger
                                            icon={<StopOutlined />}
                                            loading={twoFALoading}
                                            onClick={disable2FA}
                                            block
                                        >
                                            Stop
                                        </Button>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            <>
                                {!twoFA.qrCode ? (
                                    <Button
                                        type="primary"
                                        icon={<QrcodeOutlined />}
                                        loading={twoFALoading}
                                        onClick={start2FASetup}
                                    >
                                        Configurer la 2FA
                                    </Button>
                                ) : (
                                    <>
                                        <Alert
                                            type="info"
                                            showIcon
                                            title="Scannez le QR code avec Google Authenticator / Authy, puis saisissez le code."
                                            style={{ marginBottom: 12 }}
                                        />
                                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                            <img src={twoFA.qrCode} alt="QR 2FA" style={{ width: 180, height: 180 }} />
                                        </div>
                                        <Input
                                            placeholder="Code à 6 chiffres"
                                            maxLength={6}
                                            value={twoFACode}
                                            onChange={(e) => setTwoFACode(e.target.value)}
                                            style={{ marginBottom: 12 }}
                                        />
                                        <Button type="primary" loading={twoFALoading} onClick={enable2FA}>
                                            Activer maintenant
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* ── Modal de prévisualisation avant upload ── */}
            <Modal
                title={
                    <span>
                        <CameraOutlined style={{ marginRight: 8 }} />
                        Prévisualisation — Confirmer l'upload ?
                    </span>
                }
                open={previewModal.open}
                onOk={confirmUpload}
                onCancel={() => setPreviewModal({ open: false, src: null, file: null })}
                okText="Utiliser cette photo"
                cancelText="Annuler"
                width={360}
                centered
            >
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <img
                        src={previewModal.src}
                        alt="Preview"
                        style={{
                            width: 180,
                            height: 180,
                            objectFit: 'cover',
                            borderRadius: '50%',
                            border: '4px solid #f0f0f0',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        }}
                    />
                    {previewModal.file && (
                        <div style={{ marginTop: 12 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {previewModal.file.name} &nbsp;·&nbsp;{' '}
                                {(previewModal.file.size / 1024).toFixed(0)} Ko
                            </Text>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
