import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ThemeContext as SharedThemeContext,
  type ContrastMode,
  type ThemeContextProps as SharedThemeContextProps,
} from '@odh-dashboard/ui-core/contexts/ThemeContext';

type Theme = 'light' | 'dark';
export type ColorScheme = 'system' | 'light' | 'dark';

type ThemeContextProps = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;
};

const THEME_KEY = 'app-shell.theme';
const COLOR_SCHEME_KEY = 'app-shell.colorScheme';
const CONTRAST_MODE_KEY = 'app-shell.contrastMode';

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  setTheme: () => undefined,
  colorScheme: 'system',
  setColorScheme: () => undefined,
  contrastMode: 'system',
  setContrastMode: () => undefined,
});

export const useThemeContext = (): ThemeContextProps => useContext(ThemeContext);

const readColorScheme = (): ColorScheme => {
  try {
    const stored = localStorage.getItem(COLOR_SCHEME_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Derive from the legacy light/dark theme key so saved choices survive.
    const legacy = localStorage.getItem(THEME_KEY);
    if (legacy === 'dark' || legacy === 'light') {
      return legacy;
    }
    return 'system';
  } catch {
    return 'system';
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
      : 'system';
  } catch {
    return 'system';
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(readColorScheme);
  const [contrastMode, setContrastModeState] = useState<ContrastMode>(readContrastMode);
  const [prefersDark, setPrefersDark] = useState(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
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

  const theme: Theme =
    colorScheme === 'dark' || (colorScheme === 'system' && prefersDark) ? 'dark' : 'light';

  // Track OS-level preferences
  useEffect(() => {
    let darkQuery;
    let transparencyQuery;
    let contrastQuery;

    try {
      darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
      contrastQuery = window.matchMedia('(prefers-contrast: more)');
    } catch {
      // Restricted contexts may block matchMedia
      return;
    }

    const handleDark = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    const handleTransparency = (e: MediaQueryListEvent) => setPrefersReducedTransparency(e.matches);
    const handleContrast = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);

    setPrefersDark(darkQuery.matches);
    setPrefersReducedTransparency(transparencyQuery.matches);
    setPrefersHighContrast(contrastQuery.matches);

    darkQuery.addEventListener('change', handleDark);
    transparencyQuery.addEventListener('change', handleTransparency);
    contrastQuery.addEventListener('change', handleContrast);
    return () => {
      darkQuery.removeEventListener('change', handleDark);
      transparencyQuery.removeEventListener('change', handleTransparency);
      contrastQuery.removeEventListener('change', handleContrast);
    };
  }, []);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      try {
        localStorage.setItem(COLOR_SCHEME_KEY, scheme);
        localStorage.removeItem(THEME_KEY);
      } catch {
        // no-op: storage unavailable
      }
      setColorSchemeState(scheme);
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', {
          detail: {
            theme: scheme === 'dark' ? 'dark' : 'light',
            colorScheme: scheme,
            contrastMode,
          },
        }),
      );
    },
    [contrastMode],
  );

  const setTheme = useCallback((t: Theme) => setColorScheme(t), [setColorScheme]);

  const setContrastMode = useCallback(
    (mode: ContrastMode) => {
      try {
        localStorage.setItem(CONTRAST_MODE_KEY, mode);
      } catch {
        // no-op: storage unavailable
      }
      setContrastModeState(mode);
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme, colorScheme, contrastMode: mode } }),
      );
    },
    [theme, colorScheme],
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
    () => ({ theme, setTheme, colorScheme, setColorScheme, contrastMode, setContrastMode }),
    [theme, setTheme, colorScheme, setColorScheme, contrastMode, setContrastMode],
  );
  const sharedValue = useMemo<SharedThemeContextProps>(
    () => ({
      theme,
      setTheme: (themeName) => setColorScheme(themeName === 'dark' ? 'dark' : 'light'),
      colorScheme,
      setColorScheme,
      contrastMode,
      setContrastMode,
    }),
    [theme, colorScheme, setColorScheme, contrastMode, setContrastMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <SharedThemeContext.Provider value={sharedValue}>{children}</SharedThemeContext.Provider>
    </ThemeContext.Provider>
  );
};
