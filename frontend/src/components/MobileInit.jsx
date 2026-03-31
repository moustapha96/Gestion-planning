/**
 * MobileInit — composant invisible qui initialise le service Capacitor.
 * Doit être monté à l'intérieur du Router pour accéder à useNavigate.
 * Ne rend rien dans le DOM.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mobileService, IS_NATIVE } from '../services/mobileService';
import api from '../api/client';

export default function MobileInit() {
    const navigate        = useNavigate();
    const { user }        = useAuth();
    const pushInitRef     = useRef(false);
    const appInitRef      = useRef(false);

    // ── Initialisation core (sans auth) ─────────────────────────
    useEffect(() => {
        if (appInitRef.current || !IS_NATIVE) return;
        appInitRef.current = true;
        mobileService.initialize(navigate);
    }, []); // eslint-disable-line

    // ── Push notifications (avec auth) ───────────────────────────
    useEffect(() => {
        if (!IS_NATIVE) return;

        if (user?.id && !pushInitRef.current) {
            pushInitRef.current = true;
            mobileService.initializePushNotifications(navigate, api);
        }

        // Réinitialiser si l'utilisateur se déconnecte
        if (!user?.id) {
            pushInitRef.current = false;
        }
    }, [user?.id, navigate]);

    // ── Nettoyage ────────────────────────────────────────────────
    useEffect(() => {
        return () => mobileService.destroy();
    }, []);

    return null;
}
