import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import './utils/datetime';
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
                    colorPrimary: '#1565C0',
                    colorSuccess: '#48BB78',
                    colorLink: '#1565C0',
                    borderRadius: 8,
                    fontFamily: "'Segoe UI', system-ui, sans-serif",
                    zIndexPopupBase: 1000,
                },
                components: {
                    Button: { colorPrimary: '#1565C0', algorithm: true },
                    Menu: isDark
                        ? { itemSelectedBg: 'rgba(255,255,255,0.14)', itemSelectedColor: '#ffffff' }
                        : { itemSelectedBg: '#DBEAFE', itemSelectedColor: '#1565C0' },
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
