/**
 * OfflineBanner — Bannière rouge affichée quand l'app perd la connexion.
 * Fonctionne sur web (navigator.onLine) et mobile natif (Network plugin).
 */
import { useState, useEffect } from 'react';
import { WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { IS_NATIVE } from '../services/mobileService';
import mobileService from '../services/mobileService';

export default function OfflineBanner() {
    const [online, setOnline] = useState(
        IS_NATIVE ? mobileService.isOnline() : navigator.onLine,
    );
    const [showBack, setShowBack] = useState(false); // "connexion rétablie"
    const [backTimer, setBackTimer] = useState(null);

    useEffect(() => {
        const handleOnline  = () => { setOnline(true);  triggerBack(); };
        const handleOffline = () => { setOnline(false); clearBack(); };

        if (IS_NATIVE) {
            const unsub = mobileService.onNetworkChange((s) => {
                if (s.connected) handleOnline(); else handleOffline();
            });
            return unsub;
        } else {
            window.addEventListener('online',  handleOnline);
            window.addEventListener('offline', handleOffline);
            return () => {
                window.removeEventListener('online',  handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []); // eslint-disable-line

    const clearBack = () => {
        if (backTimer) { clearTimeout(backTimer); setBackTimer(null); }
        setShowBack(false);
    };

    const triggerBack = () => {
        setShowBack(true);
        const t = setTimeout(() => setShowBack(false), 3000);
        setBackTimer(t);
    };

    if (online && !showBack) return null;

    return (
        <div
            className="offline-banner"
            style={{
                background: online ? '#52c41a' : '#ff4d4f',
            }}
        >
            {online
                ? <><WifiOutlined style={{ marginRight: 6 }} />Connexion rétablie</>
                : <><DisconnectOutlined style={{ marginRight: 6 }} />Hors ligne — vérifiez votre connexion</>
            }
        </div>
    );
}
