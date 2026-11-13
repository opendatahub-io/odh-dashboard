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
  contrastMode: 'default',
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
    return value === 'default' ||
      value === 'glass' ||
      value === 'high-contrast' ||
      value === 'system'
      ? value
      : 'default';
  } catch {
    return 'default';
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [contrastMode, setContrastModeState] = useState<ContrastMode>(readContrastMode);
  const [prefersReducedTransparency, setPrefersReducedTransparency] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    } catch {
      return false;
    }
  });
  const [prefersHighContrast, setPrefersHighContrast] = useState(() => {
    try {
      return window.matchMedia('(prefers-contrast: more)').matches;
    } catch {
      return false;
    }
  });

  // Track OS-level preferences
  useEffect(() => {
    let transparencyQuery;
    let contrastQuery;

    try {
      transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
      contrastQuery = window.matchMedia('(prefers-contrast: more)');
    } catch {
      // Restricted contexts may block matchMedia
      return;
    }

    const handleTransparency = (e: MediaQueryListEvent) => setPrefersReducedTransparency(e.matches);
    const handleContrast = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);

    setPrefersReducedTransparency(transparencyQuery.matches);
    setPrefersHighContrast(contrastQuery.matches);

    transparencyQuery.addEventListener('change', handleTransparency);
    contrastQuery.addEventListener('change', handleContrast);
    return () => {
      transparencyQuery.removeEventListener('change', handleTransparency);
      contrastQuery.removeEventListener('change', handleContrast);
    };
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch {
        // no-op: storage unavailable
      }
      setThemeState(t);
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme: t, contrastMode } }),
      );
    },
    [contrastMode],
  );

  const setContrastMode = useCallback(
    (mode: ContrastMode) => {
      try {
        localStorage.setItem(CONTRAST_MODE_KEY, mode);
      } catch {
        // no-op: storage unavailable
      }
      setContrastModeState(mode);
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme, contrastMode: mode } }),
      );
    },
    [theme],
  );
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('pf-v6-theme-dark', theme === 'dark');

    const shouldUseGlass =
      contrastMode === 'glass' ||
      (contrastMode === 'system' && !prefersReducedTransparency && !prefersHighContrast);
    const shouldUseHighContrast =
      contrastMode === 'high-contrast' || (contrastMode === 'system' && prefersHighContrast);
    html.classList.toggle('pf-v6-theme-glass', shouldUseGlass);
    html.classList.toggle('pf-v6-theme-high-contrast', shouldUseHighContrast);
  }, [theme, contrastMode, prefersReducedTransparency, prefersHighContrast]);

  const value = useMemo(
    () => ({ theme, setTheme, contrastMode, setContrastMode }),
    [theme, setTheme, contrastMode, setContrastMode],
  );
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
