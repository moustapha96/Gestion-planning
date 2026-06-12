import { useEffect, useState, useCallback } from 'react';
import { Button, Modal, Steps, Typography, Space, Divider, Alert } from 'antd';
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
    ClockCircleOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const LS_KEY = 'pwa-install-dismissed';
const REMIND_DAYS = 7;

function detectPlatform() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    // iOS Chrome/Firefox cannot install PWAs — only Safari can
    const isSafariOnly = isIOS && /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    return { isIOS, isAndroid, isSafariOnly, isStandalone };
}

function shouldShowBanner() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return true;
    try {
        const { remindAt } = JSON.parse(raw);
        if (!remindAt) return false; // permanently dismissed
        return Date.now() >= remindAt;
    } catch {
        return true;
    }
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [installed, setInstalled] = useState(false);
    const [visible, setVisible] = useState(false); // controls CSS animation
    const platform = detectPlatform();

    useEffect(() => {
        if (platform.isStandalone) return;
        if (!shouldShowBanner()) return;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // iOS Safari: show after 2s
        let timer;
        if (platform.isSafariOnly) {
            timer = setTimeout(() => {
                if (shouldShowBanner()) setShowBanner(true);
            }, 2000);
        }

        window.addEventListener('appinstalled', () => {
            setInstalled(true);
            setShowBanner(false);
            localStorage.removeItem(LS_KEY);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            clearTimeout(timer);
        };
    }, []); // eslint-disable-line

    // Slide-up animation when banner becomes visible
    useEffect(() => {
        if (showBanner) {
            const t = setTimeout(() => setVisible(true), 50);
            return () => clearTimeout(t);
        } else {
            setVisible(false);
        }
    }, [showBanner]);

    const dismiss = useCallback(() => {
        setShowBanner(false);
        localStorage.setItem(LS_KEY, JSON.stringify({ remindAt: null }));
    }, []);

    const remindLater = useCallback(() => {
        setShowBanner(false);
        const remindAt = Date.now() + REMIND_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(LS_KEY, JSON.stringify({ remindAt }));
    }, []);

    const handleInstallClick = useCallback(async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setInstalled(true);
                localStorage.removeItem(LS_KEY);
            }
            setDeferredPrompt(null);
            setShowBanner(false);
        } else {
            setShowModal(true);
        }
    }, [deferredPrompt]);

    if (platform.isStandalone || installed) return null;
    if (!showBanner) return null;

    const platformIcon = platform.isIOS
        ? <AppleOutlined style={{ fontSize: 22 }} />
        : platform.isAndroid
        ? <AndroidOutlined style={{ fontSize: 22 }} />
        : <DesktopOutlined style={{ fontSize: 22 }} />;

    return (
        <>
            {/* Banner flottant en bas avec animation slide-up */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: 'linear-gradient(135deg, #0d47a1 0%, #1565C0 60%, #1976D2 100%)',
                    color: 'white',
                    padding: '12px 16px 16px',
                    boxShadow: '0 -4px 24px rgba(13,71,161,0.4)',
                    borderTop: '3px solid #48BB78',
                    transform: visible ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    // Safe area pour iPhone avec notch/home bar
                    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                }}
            >
                {/* Ligne principale */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <img
                        src="/favicon.svg"
                        alt="ADM GP"
                        style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'white', padding: 3 }}
                        onError={e => { e.target.src = '/favicon.png'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                            Installer ADM GP
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                            Accès rapide · Fonctionne hors connexion
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {platformIcon}
                    </div>
                </div>

                {/* Boutons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleInstallClick}
                        style={{
                            background: '#48BB78',
                            borderColor: '#48BB78',
                            fontWeight: 600,
                            flex: 1,
                            height: 38,
                        }}
                    >
                        Installer
                    </Button>
                    <Button
                        icon={<ClockCircleOutlined />}
                        onClick={remindLater}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            borderColor: 'rgba(255,255,255,0.3)',
                            color: 'white',
                            height: 38,
                            fontSize: 12,
                        }}
                    >
                        Plus tard
                    </Button>
                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={dismiss}
                        title="Ne plus afficher"
                        style={{ color: 'rgba(255,255,255,0.6)', height: 38, width: 38 }}
                    />
                </div>
            </div>

            {/* Modal instructions selon plateforme */}
            <Modal
                open={showModal}
                onCancel={() => setShowModal(false)}
                footer={
                    <Button type="primary" block onClick={() => setShowModal(false)}
                        style={{ background: '#1565C0', borderColor: '#1565C0' }}>
                        J'ai compris
                    </Button>
                }
                title={
                    <Space>
                        <img src="/favicon.svg" alt="logo" style={{ width: 28, height: 28, borderRadius: 6 }}
                            onError={e => { e.target.src = '/favicon.png'; }} />
                        <span style={{ color: '#1565C0', fontWeight: 700 }}>
                            Installer l'application
                        </span>
                    </Space>
                }
                width={420}
                centered
            >
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
                message="Sur iPhone / iPad — Safari uniquement"
                description="iOS ne permet l'installation PWA que via Safari. Chrome et Firefox iOS ne supportent pas cette fonctionnalité."
                type="info"
                showIcon
                icon={<AppleOutlined />}
                style={{ marginBottom: 16 }}
            />
            <Steps
                direction="vertical"
                size="small"
                items={[
                    {
                        title: <Text strong>Ouvrir dans Safari</Text>,
                        description: "Assurez-vous d'utiliser Safari (pas Chrome ni Firefox).",
                        icon: <StepNum n={1} />,
                    },
                    {
                        title: <Text strong>Bouton Partager</Text>,
                        description: <Text>Touchez <Text code><ShareAltOutlined /> Partager</Text> en bas de l'écran.</Text>,
                        icon: <StepNum n={2} />,
                    },
                    {
                        title: <Text strong>« Sur l'écran d'accueil »</Text>,
                        description: <Text>Faites défiler et appuyez sur <Text code><PlusSquareOutlined /> Sur l'écran d'accueil</Text>.</Text>,
                        icon: <StepNum n={3} />,
                    },
                    {
                        title: <Text strong>Confirmer</Text>,
                        description: "Appuyez sur « Ajouter » en haut à droite.",
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
                style={{ marginBottom: 16 }}
            />
            <Steps
                direction="vertical"
                size="small"
                items={[
                    {
                        title: <Text strong>Menu Chrome</Text>,
                        description: 'Appuyez sur ⋮ en haut à droite.',
                        icon: <StepNum n={1} />,
                    },
                    {
                        title: <Text strong>Ajouter à l'écran d'accueil</Text>,
                        description: <Text>Sélectionnez <Text code><HomeOutlined /> Ajouter à l'écran d'accueil</Text>.</Text>,
                        icon: <StepNum n={2} />,
                    },
                    {
                        title: <Text strong>Confirmer</Text>,
                        description: "Appuyez sur « Ajouter ». L'application apparaît sur votre écran d'accueil.",
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
                message="Sur ordinateur — Chrome ou Edge"
                type="info"
                showIcon
                icon={<DesktopOutlined />}
                style={{ marginBottom: 16 }}
            />
            <Steps
                direction="vertical"
                size="small"
                items={[
                    {
                        title: <Text strong>Icône dans la barre d'adresse</Text>,
                        description: "Cherchez l'icône ⊕ (ou un écran avec flèche) à droite de l'URL.",
                        icon: <StepNum n={1} />,
                    },
                    {
                        title: <Text strong>Cliquer sur « Installer »</Text>,
                        description: "Une fenêtre de confirmation apparaît. Cliquez sur « Installer ».",
                        icon: <StepNum n={2} />,
                    },
                    {
                        title: <Text strong>Application installée</Text>,
                        description: "L'app s'ouvre dans sa propre fenêtre, sans barre de navigateur.",
                        icon: <CheckCircleOutlined style={{ color: '#48BB78', fontSize: 20 }} />,
                    },
                ]}
            />
            <Divider />
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                <Text strong>Firefox / Safari Desktop : </Text>
                menu du navigateur → « Installer la page comme application ».
            </Paragraph>
        </div>
    );
}

function StepNum({ n }) {
    return (
        <div style={{
            background: '#1565C0',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
        }}>
            {n}
        </div>
    );
}
