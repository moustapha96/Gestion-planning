import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: [
                'favicon.svg', 'favicon.png', 'favicon.ico', 'logo.svg',
                'icons/*.png', 'icons/*.svg',
            ],
            manifest: {
                name: 'Gestion Planning',
                short_name: 'ADM GP',
                description: 'Optimisation et Organisation — plannings, réunions, missions',
                theme_color: '#2596be',
                background_color: '#ffffff',
                display: 'standalone',
                display_override: ['window-controls-overlay', 'standalone', 'browser'],
                orientation: 'portrait-primary',
                start_url: '/',
                scope: '/',
                lang: 'fr',
                dir: 'ltr',
                categories: ['business', 'productivity'],
                prefer_related_applications: false,
                icons: [
                    // Icônes standard (any) — PNG requis pour Android Chrome
                    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    // Icônes maskable (fond plein pour Android adaptive icons)
                    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                    // Apple touch icon
                    { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
                ],
                shortcuts: [
                    { name: 'Tableau de bord', url: '/dashboard', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
                    { name: 'Planning', url: '/planning', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
                    { name: 'Réunions', url: '/meetings', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
                    { name: 'Missions', url: '/missions', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
                ],
            },
            workbox: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
                runtimeCaching: [{
                        urlPattern: /^https?:\/\/.*\/api\//,
                        handler: 'NetworkFirst',
                        options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
                    },
                    {
                        urlPattern: /^https?:\/\/.*\/uploads\//,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'uploads-cache',
                            expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 7 },
                        },
                    },
                ],
            },
            devOptions: { enabled: true, type: 'module' },
        }),
    ],
    // '/' obligatoire avec BrowserRouter + Nginx : évite page blanche / 404 au F5 sur /meetings, etc.
    base: '/',
    /** Même proxy qu’en dev : `vite preview` (service systemd) relaie /api vers le backend local. */
    preview: {
        port: 9000,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    server: {
        port: 5173,
        host: '0.0.0.0',  // écouter sur toutes les interfaces (réseau local)
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            // Socket.IO (temps réel : messagerie, présence) — sans ce proxy, le client parle au serveur Vite au lieu du backend
            '/socket.io': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                ws: true,
            },
        },
    },
})