import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext.jsx';

function ThemedProviders() {
    const { isDark } = useThemeMode();
    return (
        <ConfigProvider
            getPopupContainer={() => document.getElementById('popup-root') || document.body}
            theme={{
                algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: '#3e7cbc',
                    colorSuccess: '#48BB78',
                    colorLink: '#3e7cbc',
                    borderRadius: 8,
                    fontFamily: "'Segoe UI', system-ui, sans-serif",
                    zIndexPopupBase: 1000,
                },
                components: {
                    Button: { colorPrimary: '#3e7cbc', algorithm: true },
                    Menu: isDark
                        ? { itemSelectedBg: 'rgba(255,255,255,0.14)', itemSelectedColor: '#ffffff' }
                        : { itemSelectedBg: '#e8f0f9', itemSelectedColor: '#3e7cbc' },
                },
            }}
        >
            <AntApp>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </AntApp>
        </ConfigProvider>
    );
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeModeProvider>
            <ThemedProviders />
        </ThemeModeProvider>
    </StrictMode>
);
