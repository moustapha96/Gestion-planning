/**
 * mobileService.js — Service central Capacitor pour Android & iOS
 *
 * Gère :
 *  - StatusBar (couleur + style)
 *  - SplashScreen (masquage auto)
 *  - Bouton Retour Android
 *  - Deep links (appUrlOpen)
 *  - État réseau (en ligne / hors ligne)
 *  - Clavier (hauteur, visibilité)
 *  - Push Notifications (FCM Android + APNs iOS)
 *  - Local Notifications (foreground + feedback visuel)
 *  - Haptics (vibrations retour tactile)
 */

import { Capacitor } from '@capacitor/core';

// ── Détection plateforme ──────────────────────────────────────────
export const IS_NATIVE  = Capacitor.isNativePlatform();
export const PLATFORM   = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
export const IS_IOS     = PLATFORM === 'ios';
export const IS_ANDROID = PLATFORM === 'android';

// ── Chargement lazy des plugins natifs ───────────────────────────
// N'importe que si on est en mode natif pour éviter les erreurs web
let PushNotifications, LocalNotifications, StatusBar, SplashScreen, App, Network, Keyboard, Haptics;
let ImpactStyle, NotificationType, Style;

if (IS_NATIVE) {
    // Dynamic requires — sûrs car les packages sont installés
    ({ PushNotifications }   = require('@capacitor/push-notifications'));
    ({ LocalNotifications }  = require('@capacitor/local-notifications'));
    ({ StatusBar, Style }    = require('@capacitor/status-bar'));
    ({ SplashScreen }        = require('@capacitor/splash-screen'));
    ({ App }                 = require('@capacitor/app'));
    ({ Network }             = require('@capacitor/network'));
    ({ Keyboard }            = require('@capacitor/keyboard'));
    ({ Haptics, ImpactStyle, NotificationType } = require('@capacitor/haptics'));
}

// ── Service principal ─────────────────────────────────────────────
class MobileService {
    _initialized    = false;
    _pushInitialized = false;
    _networkStatus  = { connected: true, connectionType: 'wifi' };
    _keyboardHeight = 0;
    _keyboardVisible = false;
    _networkListeners = new Set();
    _keyboardListeners = new Set();
    _appStateListeners = new Set();
    _backListeners     = new Set();
    _localNotifId      = 1000;

    // ── Initialisation principale (sans auth) ─────────────────────
    async initialize(navigate) {
        if (this._initialized || !IS_NATIVE) return;
        this._initialized = true;

        await this._setupStatusBar();
        await this._hideSplashScreen();
        await this._setupApp(navigate);
        await this._setupNetwork();

        if (IS_IOS) {
            await this._setupKeyboard();
        }

        console.log('[Mobile] Service initialisé sur', PLATFORM);
    }

    // ── Initialisation push (avec auth utilisateur) ───────────────
    async initializePushNotifications(navigate, apiClient) {
        if (!IS_NATIVE || this._pushInitialized) return;
        this._pushInitialized = true;

        try {
            await this._setupPushNotifications(navigate, apiClient);
        } catch (err) {
            console.warn('[Mobile] Push notifications non disponibles:', err.message);
        }
    }

    // ── Nettoyage ─────────────────────────────────────────────────
    destroy() {
        this._networkListeners.clear();
        this._keyboardListeners.clear();
        this._appStateListeners.clear();
        this._backListeners.clear();
    }

    // ─────────────────────────────────────────────────────────────
    // StatusBar
    // ─────────────────────────────────────────────────────────────
    async _setupStatusBar() {
        try {
            await StatusBar.setStyle({ style: Style.Dark });
            if (IS_ANDROID) {
                await StatusBar.setBackgroundColor({ color: '#3e7cbc' });
                await StatusBar.setOverlaysWebView({ overlay: false });
            }
        } catch (e) {
            console.warn('[Mobile] StatusBar:', e.message);
        }
    }

    async setStatusBarLight() {
        if (!IS_NATIVE) return;
        try { await StatusBar.setStyle({ style: Style.Light }); } catch {}
    }

    async setStatusBarDark() {
        if (!IS_NATIVE) return;
        try { await StatusBar.setStyle({ style: Style.Dark }); } catch {}
    }

    // ─────────────────────────────────────────────────────────────
    // SplashScreen
    // ─────────────────────────────────────────────────────────────
    async _hideSplashScreen() {
        try {
            await SplashScreen.hide({ fadeOutDuration: 400 });
        } catch (e) {
            console.warn('[Mobile] SplashScreen:', e.message);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // App lifecycle + back button + deep links
    // ─────────────────────────────────────────────────────────────
    async _setupApp(navigate) {
        // Bouton Retour Android
        App.addListener('backButton', ({ canGoBack }) => {
            // Laisser les écouteurs custom gérer d'abord (ex: modals)
            if (this._backListeners.size > 0) {
                const handler = [...this._backListeners].pop();
                handler();
                return;
            }
            if (canGoBack) {
                window.history.back();
            } else {
                // Quitter l'app si on est sur la page principale
                App.exitApp();
            }
        });

        // Deep links (ex: gestionplanning://app/planning/abc)
        App.addListener('appUrlOpen', (data) => {
            try {
                const url  = new URL(data.url);
                const path = url.pathname + (url.search || '');
                if (navigate && path && path !== '/') {
                    navigate(path);
                }
            } catch {}
        });

        // Retour en foreground → émettre un event custom pour rafraîchir les données
        App.addListener('appStateChange', ({ isActive }) => {
            this._appStateListeners.forEach((cb) => cb(isActive));
            if (isActive) {
                document.dispatchEvent(new CustomEvent('app:foreground'));
            } else {
                document.dispatchEvent(new CustomEvent('app:background'));
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Réseau
    // ─────────────────────────────────────────────────────────────
    async _setupNetwork() {
        try {
            this._networkStatus = await Network.getStatus();
        } catch {}

        Network.addListener('networkStatusChange', (status) => {
            const wasConnected = this._networkStatus.connected;
            this._networkStatus = status;
            this._networkListeners.forEach((cb) => cb(status));

            if (status.connected && !wasConnected) {
                document.dispatchEvent(new CustomEvent('network:online'));
            } else if (!status.connected && wasConnected) {
                document.dispatchEvent(new CustomEvent('network:offline'));
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Clavier (iOS — Android géré par Capacitor resize:body)
    // ─────────────────────────────────────────────────────────────
    async _setupKeyboard() {
        Keyboard.addListener('keyboardWillShow', (info) => {
            this._keyboardVisible = true;
            this._keyboardHeight  = info.keyboardHeight;
            document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
            document.body.classList.add('keyboard-open');
            this._keyboardListeners.forEach((cb) => cb({ visible: true, height: info.keyboardHeight }));
        });

        Keyboard.addListener('keyboardWillHide', () => {
            this._keyboardVisible = false;
            this._keyboardHeight  = 0;
            document.body.style.setProperty('--keyboard-height', '0px');
            document.body.classList.remove('keyboard-open');
            this._keyboardListeners.forEach((cb) => cb({ visible: false, height: 0 }));
        });
    }

    async hideKeyboard() {
        if (!IS_NATIVE || !IS_IOS) return;
        try { await Keyboard.hide(); } catch {}
    }

    // ─────────────────────────────────────────────────────────────
    // Push Notifications (FCM Android + APNs iOS)
    // ─────────────────────────────────────────────────────────────
    async _setupPushNotifications(navigate, apiClient) {
        // Demander la permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
            console.log('[Mobile] Permission push refusée');
            return;
        }

        // S'enregistrer auprès de FCM / APNs
        await PushNotifications.register();

        // Réception du token d'enregistrement → envoyer au backend
        PushNotifications.addListener('registration', async (token) => {
            console.log('[Mobile] Push token:', token.value.substring(0, 20) + '...');
            if (apiClient) {
                try {
                    await apiClient.post('/auth/me/push-token', {
                        token:    token.value,
                        platform: PLATFORM,
                    });
                } catch (err) {
                    console.warn('[Mobile] Enregistrement token push échoué:', err.message);
                }
            }
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('[Mobile] Erreur enregistrement push:', error.error);
        });

        // Notification reçue en foreground → afficher comme Local Notification
        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
            await this.showLocalNotification({
                title:     notification.title || 'ADM GP',
                body:      notification.body  || '',
                data:      notification.data  || {},
                channelId: notification.data?.channelId || 'default',
            });
            await this.hapticNotification('SUCCESS');
        });

        // Notification tapée (app en background ou fermée)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const data = action.notification?.data || {};
            const link = data.link || '/notifications';
            if (navigate) navigate(link);
        });

        // Configurer les canaux Android
        if (IS_ANDROID) {
            await this._createAndroidChannels();
        }

        // Configurer les types d'actions pour les Local Notifications
        await this._registerLocalNotificationActions();
    }

    async _createAndroidChannels() {
        try {
            await LocalNotifications.createChannel({
                id:          'default',
                name:        'Notifications générales',
                description: 'Toutes les notifications de l\'application',
                importance:  4, // HIGH
                visibility:  1, // PUBLIC
                vibration:   true,
                lights:      true,
                lightColor:  '#3e7cbc',
                sound:       'default',
            });

            await LocalNotifications.createChannel({
                id:          'messages',
                name:        'Messages directs',
                description: 'Nouvelles conversations et messages',
                importance:  5, // MAX
                visibility:  1,
                vibration:   true,
                lights:      true,
                lightColor:  '#722ed1',
                sound:       'default',
            });

            await LocalNotifications.createChannel({
                id:          'planning',
                name:        'Plannings',
                description: 'Validation, retour et rappels de planning',
                importance:  4,
                visibility:  1,
                vibration:   true,
                lights:      true,
                lightColor:  '#52c41a',
                sound:       'default',
            });

            await LocalNotifications.createChannel({
                id:          'meetings',
                name:        'Réunions',
                description: 'Convocations et rappels de réunion',
                importance:  4,
                visibility:  1,
                vibration:   true,
                lightColor:  '#fa8c16',
                sound:       'default',
            });
        } catch (e) {
            console.warn('[Mobile] Création canaux Android:', e.message);
        }
    }

    async _registerLocalNotificationActions() {
        try {
            await LocalNotifications.registerActionTypes({
                types: [
                    {
                        id:      'OPEN',
                        actions: [{ id: 'open', title: 'Ouvrir', foreground: true }],
                    },
                    {
                        id:      'REPLY',
                        actions: [
                            { id: 'reply',  title: 'Répondre', foreground: true, input: true },
                            { id: 'dismiss', title: 'Ignorer' },
                        ],
                    },
                ],
            });
        } catch {}
    }

    // ─────────────────────────────────────────────────────────────
    // Local Notifications
    // ─────────────────────────────────────────────────────────────

    /**
     * Affiche une notification locale (foreground).
     * Compatible Android (channels) + iOS.
     */
    async showLocalNotification({ title, body, data = {}, channelId = 'default', actions = 'OPEN' }) {
        if (!IS_NATIVE) return;

        const id = this._localNotifId++;
        try {
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
                const req = await LocalNotifications.requestPermissions();
                if (req.display !== 'granted') return;
            }

            await LocalNotifications.schedule({
                notifications: [{
                    id,
                    title,
                    body,
                    channelId,
                    extra:        { ...data, _notifId: id },
                    actionTypeId: actions,
                    autoCancel:   true,
                    smallIcon:    IS_ANDROID ? 'ic_stat_notification' : undefined,
                    iconColor:    '#3e7cbc',
                    sound:        'default',
                }],
            });
        } catch (err) {
            console.warn('[Mobile] Local notification échouée:', err.message);
        }

        return id;
    }

    /** Envoie une notif locale pour un nouveau message direct. */
    async showMessageNotification({ senderName, body, conversationId }) {
        return this.showLocalNotification({
            title:     `💬 ${senderName}`,
            body:      body || 'Nouveau message',
            data:      { link: '/discussions', conversationId },
            channelId: 'messages',
            actions:   'REPLY',
        });
    }

    /** Efface toutes les notifications locales de l'app. */
    async clearAllNotifications() {
        if (!IS_NATIVE) return;
        try {
            await PushNotifications?.removeAllDeliveredNotifications?.();
            await LocalNotifications.cancel({ notifications: [] }); // pass empty to cancel all pending
        } catch {}
    }

    // ─────────────────────────────────────────────────────────────
    // Haptics (retour tactile)
    // ─────────────────────────────────────────────────────────────

    /** Vibration légère (tap, sélection). */
    async hapticLight() {
        if (!IS_NATIVE) return;
        try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    }

    /** Vibration moyenne (confirmation d'action). */
    async hapticMedium() {
        if (!IS_NATIVE) return;
        try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    }

    /** Vibration forte (alerte, erreur). */
    async hapticHeavy() {
        if (!IS_NATIVE) return;
        try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
    }

    /** Notification haptic (SUCCESS | WARNING | ERROR). */
    async hapticNotification(type = 'SUCCESS') {
        if (!IS_NATIVE) return;
        try { await Haptics.notification({ type: NotificationType?.[type] ?? type }); } catch {}
    }

    /** Vibration courte (feedback visuel de sélection). */
    async hapticSelection() {
        if (!IS_NATIVE) return;
        try { await Haptics.selectionStart(); await Haptics.selectionEnd(); } catch {}
    }

    // ─────────────────────────────────────────────────────────────
    // Accesseurs état
    // ─────────────────────────────────────────────────────────────

    isOnline()         { return this._networkStatus.connected; }
    getNetworkType()   { return this._networkStatus.connectionType; }
    isKeyboardVisible(){ return this._keyboardVisible; }
    getKeyboardHeight(){ return this._keyboardHeight; }
    isNativePlatform() { return IS_NATIVE; }
    getPlatform()      { return PLATFORM; }

    // ─────────────────────────────────────────────────────────────
    // Souscriptions événements
    // ─────────────────────────────────────────────────────────────

    /** S'abonner aux changements réseau. Retourne une fonction pour se désabonner. */
    onNetworkChange(cb) {
        this._networkListeners.add(cb);
        return () => this._networkListeners.delete(cb);
    }

    /** S'abonner aux changements de clavier. */
    onKeyboardChange(cb) {
        this._keyboardListeners.add(cb);
        return () => this._keyboardListeners.delete(cb);
    }

    /** S'abonner aux changements d'état de l'app (foreground/background). */
    onAppStateChange(cb) {
        this._appStateListeners.add(cb);
        return () => this._appStateListeners.delete(cb);
    }

    /**
     * Enregistrer un gestionnaire du bouton Retour Android.
     * Le dernier enregistré est appelé en premier (LIFO).
     * Retourne une fonction pour désenregistrer.
     */
    addBackHandler(cb) {
        this._backListeners.add(cb);
        return () => this._backListeners.delete(cb);
    }
}

// Singleton exporté
export const mobileService = new MobileService();
export default mobileService;
