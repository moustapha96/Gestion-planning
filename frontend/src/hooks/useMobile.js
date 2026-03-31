/**
 * useMobile — Hook React pour accéder aux fonctionnalités mobiles Capacitor.
 *
 * Expose :
 *  - isNative      : true si exécuté dans Capacitor (Android/iOS)
 *  - platform      : 'ios' | 'android' | 'web'
 *  - isOnline      : état de la connexion réseau
 *  - keyboardVisible / keyboardHeight : état du clavier mobile
 *  - hapticLight / hapticMedium / hapticHeavy : vibrations
 *  - showLocalNotification : afficher une notification locale
 *  - addBackHandler : enregistrer un gestionnaire du bouton Retour Android
 */
import { useState, useEffect, useCallback } from 'react';
import { mobileService, IS_NATIVE, PLATFORM } from '../services/mobileService';

export default function useMobile() {
    const [isOnline,       setIsOnline]       = useState(() => mobileService.isOnline());
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight,  setKeyboardHeight]  = useState(0);

    // ── Réseau ───────────────────────────────────────────────────
    useEffect(() => {
        if (!IS_NATIVE) return;
        const unsub = mobileService.onNetworkChange((status) => {
            setIsOnline(status.connected);
        });
        return unsub;
    }, []);

    // ── Clavier ──────────────────────────────────────────────────
    useEffect(() => {
        if (!IS_NATIVE) return;
        const unsub = mobileService.onKeyboardChange(({ visible, height }) => {
            setKeyboardVisible(visible);
            setKeyboardHeight(height);
        });
        return unsub;
    }, []);

    // ── Haptics ──────────────────────────────────────────────────
    const hapticLight   = useCallback(() => mobileService.hapticLight(),   []);
    const hapticMedium  = useCallback(() => mobileService.hapticMedium(),  []);
    const hapticHeavy   = useCallback(() => mobileService.hapticHeavy(),   []);
    const hapticSuccess = useCallback(() => mobileService.hapticNotification('SUCCESS'), []);
    const hapticError   = useCallback(() => mobileService.hapticNotification('ERROR'),   []);

    // ── Notifications locales ────────────────────────────────────
    const showLocalNotification = useCallback(
        (opts) => mobileService.showLocalNotification(opts),
        [],
    );

    // ── Back handler ─────────────────────────────────────────────
    const addBackHandler = useCallback(
        (cb) => mobileService.addBackHandler(cb),
        [],
    );

    // ── Clavier hide ─────────────────────────────────────────────
    const hideKeyboard = useCallback(
        () => mobileService.hideKeyboard(),
        [],
    );

    return {
        isNative: IS_NATIVE,
        platform: PLATFORM,
        isOnline,
        keyboardVisible,
        keyboardHeight,
        hapticLight,
        hapticMedium,
        hapticHeavy,
        hapticSuccess,
        hapticError,
        showLocalNotification,
        addBackHandler,
        hideKeyboard,
    };
}
