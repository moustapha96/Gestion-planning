import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeModeContext = createContext(null);
const STORAGE_KEY = 'themeMode';

export function ThemeModeProvider({ children }) {
    const [mode, setMode] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
        } catch { /* noop */ }
        return 'light';
    });

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* noop */ }
        document.documentElement.setAttribute('data-theme', mode);
        document.body.classList.toggle('app-dark', mode === 'dark');
    }, [mode]);

    const value = useMemo(() => ({
        mode,
        isDark: mode === 'dark',
        toggleMode: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
        setMode,
    }), [mode]);

    return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
    const ctx = useContext(ThemeModeContext);
    if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
    return ctx;
}

