import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Card, Form, Input, Button, Typography, App, Row, Col,
    Tag, Progress, Modal, Popconfirm, Spin, Space, Alert,
    AutoComplete, Descriptions,
} from 'antd';
import {
    LockOutlined, CameraOutlined, UserOutlined, MailOutlined,
    SaveOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
    SafetyOutlined, QrcodeOutlined, StopOutlined, EditOutlined,
    PhoneOutlined, IdcardOutlined, ApartmentOutlined, ProjectOutlined,
    TeamOutlined, BankOutlined, CrownOutlined, CalendarOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import api from '../api/client';
import ProjectLogo from '../components/ProjectLogo';
import { roleLabel, ROLE_COLORS, normalizeRole } from '../utils/roles';

const { Title, Text, Paragraph } = Typography;

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

    // ── Suggestions Cellule / Service ───────────────────────────
    const [cellUnitOptions, setCellUnitOptions]   = useState([]); // [{ value, count }]
    const [cellUnitScope,   setCellUnitScope]     = useState('global'); // 'direction' | 'global'
    const [cellUnitQuery,   setCellUnitQuery]     = useState('');

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

    // ── Chargement des suggestions de cellules / services ────────
    const loadCellUnitSuggestions = async () => {
        try {
            const { data } = await api.get('/profile/cell-units');
            setCellUnitOptions(Array.isArray(data?.suggestions) ? data.suggestions : []);
            setCellUnitScope(data?.scope || 'global');
        } catch {
            setCellUnitOptions([]);
            setCellUnitScope('global');
        }
    };

    // ── Modification du profil (nom) ─────────────────────────────
    const startEditProfile = () => {
        profileForm.setFieldsValue({
            name: user?.name,
            email: user?.email,
            phone: user?.phone || '',
            jobTitle: user?.jobTitle || '',
            cellUnit: user?.cellUnit || '',
        });
        setCellUnitQuery(user?.cellUnit || '');
        setEditingProfile(true);
        loadCellUnitSuggestions();
    };

    // ── Options filtrées (insensible à la casse / accents partiels) ─
    const filteredCellUnitOptions = useMemo(() => {
        const q = (cellUnitQuery || '').trim().toLowerCase();
        const base = q
            ? cellUnitOptions.filter((o) => o.value.toLowerCase().includes(q))
            : cellUnitOptions;
        return base.slice(0, 20).map((o) => ({
            value: o.value,
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.value}
                    </span>
                    {o.count > 1 && (
                        <Tag color="blue" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}>
                            <TeamOutlined style={{ marginRight: 2 }} />{o.count}
                        </Tag>
                    )}
                </div>
            ),
        }));
    }, [cellUnitOptions, cellUnitQuery]);

    const handleSaveProfile = async (values) => {
        setProfileLoading(true);
        try {
            const { data } = await api.put('/profile', {
                name: values.name,
                phone: values.phone,
                jobTitle: values.jobTitle,
                cellUnit: values.cellUnit,
            });
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

            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <UserOutlined style={{ marginRight: 8 }} />Mon profil
                </Title>
                <Text type="secondary">
                    Gérez vos informations personnelles, votre photo, votre mot de passe et la double authentification.
                </Text>
            </div>

            <Row gutter={[24, 24]}>
                {/* ── Colonne gauche : photo + infos ── */}
                <Col xs={24} md={10} lg={9}>

                    {/* Carte avatar */}
                    <Card
                        title={<><CameraOutlined style={{ marginRight: 8 }} />Photo de profil</>}
                        style={{ borderRadius: 12, marginBottom: 16 }}
                    >
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
                                    color={ROLE_COLORS[normalizeRole(user?.storedRole || user?.role)]}
                                    style={{ marginTop: 4, fontSize: 12 }}
                                >
                                    {roleLabel(user?.storedRole || user?.role)}
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
                        title={<><IdcardOutlined style={{ marginRight: 8 }} />Informations</>}
                        extra={
                            !editingProfile
                                ? (
                                    <Button
                                        size="small"
                                        type="link"
                                        icon={<EditOutlined />}
                                        onClick={startEditProfile}
                                    >
                                        Modifier
                                    </Button>
                                )
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
                                <Form.Item name="jobTitle" label="Poste / fonction">
                                    <Input prefix={<IdcardOutlined />} placeholder="Ex. Chargé de mission" maxLength={120} />
                                </Form.Item>
                                <Form.Item
                                    name="cellUnit"
                                    label={
                                        <Space size={6}>
                                            <span>Cellule ou service</span>
                                            {cellUnitOptions.length > 0 && (
                                                <Tag
                                                    color={cellUnitScope === 'direction' ? 'blue' : 'default'}
                                                    style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}
                                                >
                                                    {cellUnitScope === 'direction'
                                                        ? `${cellUnitOptions.length} dans votre direction`
                                                        : `${cellUnitOptions.length} suggestions`}
                                                </Tag>
                                            )}
                                        </Space>
                                    }
                                    extra={
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {user?.direction?.name
                                                ? `Choisissez une cellule existante de la direction « ${user.direction.name} » ou saisissez la vôtre.`
                                                : 'Choisissez une cellule existante ou saisissez la vôtre.'}
                                        </Text>
                                    }
                                >
                                    <AutoComplete
                                        options={filteredCellUnitOptions}
                                        onSearch={(v) => setCellUnitQuery(v)}
                                        onSelect={(v) => setCellUnitQuery(v)}
                                        onChange={(v) => setCellUnitQuery(v || '')}
                                        allowClear
                                        filterOption={false}
                                        placeholder="Ex. Cellule suivi budgétaire"
                                        maxLength={120}
                                        notFoundContent={
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Aucune correspondance — votre saisie sera enregistrée telle quelle.
                                            </Text>
                                        }
                                    >
                                        <Input prefix={<ApartmentOutlined />} maxLength={120} />
                                    </AutoComplete>
                                </Form.Item>
                                <Form.Item name="phone" label="Téléphone">
                                    <Input prefix={<PhoneOutlined />} placeholder="Ex. +221 33 …" maxLength={40} />
                                </Form.Item>

                                <Alert
                                    type="info"
                                    showIcon
                                    icon={<InfoCircleOutlined />}
                                    title="La direction et le projet d’équipe sont gérés par l’administrateur."
                                    style={{ marginBottom: 16 }}
                                />

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
                            <Descriptions
                                column={1}
                                size="small"
                                colon={false}
                                labelStyle={{
                                    fontSize: 12,
                                    color: '#8c8c8c',
                                    width: 150,
                                    paddingBottom: 6,
                                }}
                                contentStyle={{ fontSize: 13, paddingBottom: 6 }}
                            >
                                <Descriptions.Item
                                    label={<Space size={6}><UserOutlined />Nom complet</Space>}
                                >
                                    <Text strong>{user?.name || '—'}</Text>
                                </Descriptions.Item>

                                <Descriptions.Item
                                    label={<Space size={6}><MailOutlined />Adresse email</Space>}
                                >
                                    <Text copyable={!!user?.email}>{user?.email || '—'}</Text>
                                </Descriptions.Item>

                                <Descriptions.Item
                                    label={<Space size={6}><IdcardOutlined />Poste / fonction</Space>}
                                >
                                    {user?.jobTitle
                                        ? <Text>{user.jobTitle}</Text>
                                        : <Text type="secondary">Non renseigné</Text>}
                                </Descriptions.Item>

                                <Descriptions.Item
                                    label={<Space size={6}><ApartmentOutlined />Cellule ou service</Space>}
                                >
                                    {user?.cellUnit ? (
                                        <Tag
                                            icon={<ApartmentOutlined />}
                                            color="geekblue"
                                            style={{ margin: 0, fontSize: 12, padding: '2px 8px' }}
                                        >
                                            {user.cellUnit}
                                        </Tag>
                                    ) : (
                                        <Text type="secondary">Non renseignée</Text>
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item
                                    label={<Space size={6}><PhoneOutlined />Téléphone</Space>}
                                >
                                    {user?.phone
                                        ? <Text copyable>{user.phone}</Text>
                                        : <Text type="secondary">Non renseigné</Text>}
                                </Descriptions.Item>

                                <Descriptions.Item
                                    label={<Space size={6}><CrownOutlined />Rôle</Space>}
                                >
                                    <Tag color={ROLE_COLORS[normalizeRole(user?.storedRole || user?.role)]} style={{ margin: 0 }}>
                                        {roleLabel(user?.storedRole || user?.role)}
                                    </Tag>
                                </Descriptions.Item>

                                <Descriptions.Item
                                    label={<Space size={6}><BankOutlined />Direction</Space>}
                                >
                                    {directionLoading ? (
                                        <Spin size="small" />
                                    ) : user?.direction?.name ? (
                                        <Space size={6} align="center">
                                            {user?.direction?.logoUrl ? (
                                                <img
                                                    src={user.direction.logoUrl}
                                                    alt={`Logo ${user.direction.name}`}
                                                    style={{
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: 4,
                                                        objectFit: 'cover',
                                                        border: '1px solid #f0f0f0',
                                                    }}
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
                                </Descriptions.Item>

                                <Descriptions.Item
                                    label={<Space size={6}><ProjectOutlined />Projet (équipe)</Space>}
                                >
                                    {user?.project?.name ? (
                                        <Space size={6} align="center">
                                            <ProjectLogo logoUrl={user.project.logoUrl} size={22} alt="" />
                                            <Text>
                                                {user.project.name}
                                                {user.project.code ? ` (${user.project.code})` : ''}
                                            </Text>
                                        </Space>
                                    ) : (
                                        <Text type="secondary">Aucun projet assigné</Text>
                                    )}
                                </Descriptions.Item>

                                {user?.createdAt && (
                                    <Descriptions.Item
                                        label={<Space size={6}><CalendarOutlined />Membre depuis</Space>}
                                    >
                                        <Text>
                                            {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric', month: 'long', year: 'numeric',
                                            })}
                                        </Text>
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
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
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <Spin />
                            </div>
                        ) : !twoFA.globallyEnabled ? (
                            <Alert
                                type="warning"
                                showIcon
                                title="La 2FA est désactivée globalement."
                                description="Demandez à un administrateur de l'activer dans l'administration pour pouvoir l'utiliser sur votre compte."
                            />
                        ) : twoFA.userEnabled ? (
                            <>
                                <Alert
                                    type="success"
                                    showIcon
                                    title="La double authentification est activée sur votre compte."
                                    description="Vous devez fournir un code à 6 chiffres à chaque connexion."
                                    style={{ marginBottom: 16 }}
                                />

                                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                                    Pour désactiver la 2FA, saisissez votre mot de passe et un code valide :
                                </Text>
                                <Row gutter={[12, 12]}>
                                    <Col xs={24} sm={12}>
                                        <Input.Password
                                            prefix={<LockOutlined />}
                                            placeholder="Mot de passe actuel"
                                            value={disablePwd}
                                            onChange={(e) => setDisablePwd(e.target.value)}
                                        />
                                    </Col>
                                    <Col xs={16} sm={8}>
                                        <Input
                                            prefix={<SafetyOutlined />}
                                            placeholder="Code 2FA (6 chiffres)"
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
                                            Désactiver
                                        </Button>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            <>
                                {!twoFA.qrCode ? (
                                    <>
                                        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                                            Renforcez la sécurité de votre compte en ajoutant une étape de
                                            vérification supplémentaire à la connexion (Google Authenticator, Authy…).
                                        </Paragraph>
                                        <Button
                                            type="primary"
                                            icon={<QrcodeOutlined />}
                                            loading={twoFALoading}
                                            onClick={start2FASetup}
                                        >
                                            Configurer la 2FA
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Alert
                                            type="info"
                                            showIcon
                                            title="Étapes de configuration"
                                            description={
                                                <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                                    <li>Ouvrez Google Authenticator, Authy ou équivalent.</li>
                                                    <li>Scannez le QR code ci-dessous.</li>
                                                    <li>Saisissez le code à 6 chiffres généré, puis validez.</li>
                                                </ol>
                                            }
                                            style={{ marginBottom: 16 }}
                                        />
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                marginBottom: 16,
                                                padding: 12,
                                                background: '#fafafa',
                                                borderRadius: 8,
                                                border: '1px solid #f0f0f0',
                                            }}
                                        >
                                            <img
                                                src={twoFA.qrCode}
                                                alt="QR 2FA"
                                                style={{ width: 180, height: 180 }}
                                            />
                                        </div>
                                        <Row gutter={[12, 12]}>
                                            <Col xs={24} sm={16}>
                                                <Input
                                                    prefix={<SafetyOutlined />}
                                                    placeholder="Code à 6 chiffres"
                                                    maxLength={6}
                                                    value={twoFACode}
                                                    onChange={(e) => setTwoFACode(e.target.value)}
                                                />
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <Button
                                                    type="primary"
                                                    loading={twoFALoading}
                                                    onClick={enable2FA}
                                                    icon={<CheckCircleOutlined />}
                                                    block
                                                >
                                                    Activer
                                                </Button>
                                            </Col>
                                        </Row>
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
