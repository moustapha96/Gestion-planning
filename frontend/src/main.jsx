import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ConfigProvider
            getPopupContainer={() => document.getElementById('popup-root') || document.body}
            theme={{
                token: {
                    colorPrimary: '#1A365D',
                    colorSuccess: '#48BB78',
                    colorLink: '#1A365D',
                    borderRadius: 8,
                    fontFamily: "'Segoe UI', system-ui, sans-serif",
                    zIndexPopupBase: 1000,
                },
                components: {
                    Button: { colorPrimary: '#1A365D', algorithm: true },
                    Menu:   { itemSelectedBg: '#e8f0fe', itemSelectedColor: '#1A365D' },
                },
            }}
        >
            <AntApp>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </AntApp>
        </ConfigProvider>
    </StrictMode>
);
