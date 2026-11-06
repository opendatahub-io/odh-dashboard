import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ThemeContext as SharedThemeContext,
  type ContrastMode,
  type ThemeContextProps as SharedThemeContextProps,
} from '@odh-dashboard/ui-core/contexts/ThemeContext';

type Theme = 'light' | 'dark';

type ThemeContextProps = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;
};

const THEME_KEY = 'app-shell.theme';
const CONTRAST_MODE_KEY = 'app-shell.contrastMode';

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  setTheme: () => undefined,
  contrastMode: 'system',
  setContrastMode: () => undefined,
});

export const useThemeContext = (): ThemeContextProps => useContext(ThemeContext);

const readTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const readContrastMode = (): ContrastMode => {
  try {
    const value = localStorage.getItem(CONTRAST_MODE_KEY);
    return value === 'default' || value === 'glass' ? value : 'system';
  } catch {
    return 'system';
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [contrastMode, setContrastModeState] = useState<ContrastMode>(readContrastMode);
  const [prefersReducedTransparency, setPrefersReducedTransparency] = useState(false);

  // Track the OS-level "Reduce Transparency" preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedTransparency(e.matches);
    setPrefersReducedTransparency(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // no-op: storage unavailable
    }
    setThemeState(t);
    window.dispatchEvent(new CustomEvent('odh-theme-change', { detail: { theme: t, contrastMode } }));
  }, [contrastMode]);

  const setContrastMode = useCallback((mode: ContrastMode) => {
    try {
      localStorage.setItem(CONTRAST_MODE_KEY, mode);
    } catch {
      // no-op: storage unavailable
    }
    setContrastModeState(mode);
    window.dispatchEvent(new CustomEvent('odh-theme-change', { detail: { theme, contrastMode: mode } }));
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('pf-v6-theme-dark', theme === 'dark');

    const shouldUseGlass =
      contrastMode === 'glass' ||
      (contrastMode === 'system' && !prefersReducedTransparency);
    html.classList.toggle('pf-v6-theme-glass', shouldUseGlass);
  }, [theme, contrastMode, prefersReducedTransparency]);

  const value = useMemo(() => ({ theme, setTheme, contrastMode, setContrastMode }), [theme, setTheme, contrastMode, setContrastMode]);
  const sharedValue = useMemo<SharedThemeContextProps>(
    () => ({
      theme,
      setTheme: (themeName) => setTheme(themeName === 'dark' ? 'dark' : 'light'),
      contrastMode,
      setContrastMode,
    }),
    [theme, setTheme, contrastMode, setContrastMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <SharedThemeContext.Provider value={sharedValue}>{children}</SharedThemeContext.Provider>
    </ThemeContext.Provider>
  );
};
