import { useEffect, useState } from 'react';
import { Button, Alert, Modal, Steps, Typography, Space, Divider } from 'antd';
import {
    DownloadOutlined,
    AndroidOutlined,
    AppleOutlined,
    DesktopOutlined,
    ShareAltOutlined,
    PlusSquareOutlined,
    CloseOutlined,
    HomeOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

function detectPlatform() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    return { isIOS, isAndroid, isSafari, isStandalone };
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [installed, setInstalled] = useState(false);
    const platform = detectPlatform();

    useEffect(() => {
        // Already installed as standalone app
        if (platform.isStandalone) return;
        // Already dismissed by user
        if (sessionStorage.getItem('pwa-banner-dismissed')) return;

        // Android / Desktop Chrome: capture install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // iOS: show banner after 3s if not already installed
        if (platform.isIOS && platform.isSafari) {
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler); };
        }

        window.addEventListener('appinstalled', () => {
            setInstalled(true);
            setShowBanner(false);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const dismiss = () => {
        setShowBanner(false);
        sessionStorage.setItem('pwa-banner-dismissed', '1');
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Chrome/Android/Desktop native prompt
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setInstalled(true);
            setDeferredPrompt(null);
            setShowBanner(false);
        } else {
            // iOS or fallback: show manual instructions
            setShowModal(true);
        }
    };

    if (platform.isStandalone || installed) return null;
    if (!showBanner) return null;

    const platformIcon = platform.isIOS
        ? <AppleOutlined style={{ fontSize: 20 }} />
        : platform.isAndroid
        ? <AndroidOutlined style={{ fontSize: 20 }} />
        : <DesktopOutlined style={{ fontSize: 20 }} />;

    const platformLabel = platform.isIOS ? 'iPhone / iPad' : platform.isAndroid ? 'Android' : 'Navigateur';

    return (
        <>
            {/* Banner flottant en bas */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: 'linear-gradient(135deg, #3e7cbc 0%, #2d6aad 100%)',
                    color: 'white',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: '0 -4px 20px rgba(26,54,93,0.35)',
                    borderTop: '3px solid #48BB78',
                }}
            >
                {/* Logo mini */}
                <img src="/favicon.svg" alt="logo" style={{ width: 40, height: 40, flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                        Installer ADM GP
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Accès rapide depuis votre écran d'accueil · Fonctionne hors ligne
                    </div>
                </div>

                <Space>
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleInstallClick}
                        style={{
                            background: '#48BB78',
                            borderColor: '#48BB78',
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                    >
                        Installer
                    </Button>
                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={dismiss}
                        style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}
                        size="small"
                    />
                </Space>
            </div>

            {/* Modal instructions iOS / fallback */}
            <Modal
                open={showModal}
                onCancel={() => setShowModal(false)}
                footer={
                    <Button type="primary" block onClick={() => setShowModal(false)}
                        style={{ background: '#3e7cbc', borderColor: '#3e7cbc' }}>
                        J'ai compris
                    </Button>
                }
                title={
                    <Space>
                        <img src="/favicon.svg" alt="logo" style={{ width: 28, height: 28 }} />
                        <span style={{ color: '#3e7cbc', fontWeight: 700 }}>
                            Installer l'application
                        </span>
                    </Space>
                }
                width={420}
                centered
            >
                {/* Détecter et afficher les instructions correctes */}
                {platform.isIOS ? (
                    <IOSInstructions />
                ) : platform.isAndroid ? (
                    <AndroidInstructions />
                ) : (
                    <DesktopInstructions />
                )}
            </Modal>
        </>
    );
}

function IOSInstructions() {
    return (
        <div>
            <Alert
                message="Sur iPhone / iPad avec Safari"
                type="info"
                showIcon
                icon={<AppleOutlined />}
                style={{ marginBottom: 16, borderColor: '#3e7cbc' }}
            />
            <Steps
                direction="vertical"
                size="small"
                items={[
                    {
                        title: <Text strong>Ouvrir dans Safari</Text>,
                        description: 'Assurez-vous d\'utiliser le navigateur Safari (pas Chrome ni Firefox).',
                        icon: <div style={{ background: '#3e7cbc', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>1</div>,
                    },
                    {
                        title: <Text strong>Appuyer sur Partager</Text>,
                        description: (
                            <Space direction="vertical" size={2}>
                                <Text>Touchez le bouton <Text code><ShareAltOutlined /> Partager</Text> en bas de l'écran.</Text>
                            </Space>
                        ),
                        icon: <div style={{ background: '#3e7cbc', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>2</div>,
                    },
                    {
                        title: <Text strong>« Sur l'écran d'accueil »</Text>,
                        description: (
                            <Text>Faites défiler et appuyez sur <Text code><PlusSquareOutlined /> Sur l'écran d'accueil</Text>.</Text>
                        ),
                        icon: <div style={{ background: '#3e7cbc', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>3</div>,
                    },
                    {
                        title: <Text strong>Confirmer l'ajout</Text>,
                        description: "Appuyez sur « Ajouter » en haut à droite. L'icône apparaîtra sur votre écran d'accueil.",
                        icon: <CheckCircleOutlined style={{ color: '#48BB78', fontSize: 20 }} />,
                    },
                ]}
            />
        </div>
    );
}

function AndroidInstructions() {
    return (
        <div>
            <Alert
                message="Sur Android avec Chrome"
                type="info"
                showIcon
                icon={<AndroidOutlined />}
                style={{ marginBottom: 16, borderColor: '#3e7cbc' }}
            />
            <Steps
                direction="vertical"
                size="small"
                items={[
                    {
                        title: <Text strong>Menu du navigateur</Text>,
                        description: 'Appuyez sur les 3 points ⋮ en haut à droite de Chrome.',
                        icon: <div style={{ background: '#3e7cbc', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>1</div>,
                    },
                    {
                        title: <Text strong>Ajouter à l'écran d'accueil</Text>,
                        description: (
                            <Text>Sélectionnez <Text code><HomeOutlined /> Ajouter à l'écran d'accueil</Text>.</Text>
                        ),
                        icon: <div style={{ background: '#3e7cbc', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>2</div>,
                    },
                    {
                        title: <Text strong>Confirmer</Text>,
                        description: 'Appuyez sur « Ajouter ». L\'application apparaîtra sur votre écran d\'accueil comme une vraie appli.',
                        icon: <CheckCircleOutlined style={{ color: '#48BB78', fontSize: 20 }} />,
                    },
                ]}
            />
        </div>
    );
}

function DesktopInstructions() {
    return (
        <div>
            <Alert
                message="Sur ordinateur (Chrome / Edge)"
                type="info"
                showIcon
                icon={<DesktopOutlined />}
                style={{ marginBottom: 16, borderColor: '#3e7cbc' }}
            />
            <Steps
                direction="vertical"
                size="small"
                items={[
                    {
                        title: <Text strong>Icône d'installation</Text>,
                        description: "Cherchez l'icône d'installation (⊕ ou écran avec flèche) dans la barre d'adresse à droite.",
                        icon: <div style={{ background: '#3e7cbc', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>1</div>,
                    },
                    {
                        title: <Text strong>Cliquer sur « Installer »</Text>,
                        description: 'Une fenêtre apparaît. Cliquez sur « Installer » pour ajouter l\'appli à votre bureau.',
                        icon: <div style={{ background: '#3e7cbc', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>2</div>,
                    },
                    {
                        title: <Text strong>Lancez depuis le bureau</Text>,
                        description: 'L\'application s\'ouvre dans sa propre fenêtre, sans barre de navigateur.',
                        icon: <CheckCircleOutlined style={{ color: '#48BB78', fontSize: 20 }} />,
                    },
                ]}
            />
            <Divider />
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                <Text strong>Firefox / Safari Desktop :</Text> utilisez le menu du navigateur → « Installer la page comme application ».
            </Paragraph>
        </div>
    );
}
