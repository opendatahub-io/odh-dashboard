import * as React from 'react';
import {
  ThemeContext as SharedThemeContext,
  type ContrastMode,
  type ThemeContextProps as SharedThemeContextProps,
} from '@odh-dashboard/ui-core/contexts/ThemeContext';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';
const COLOR_SCHEME_KEY = 'odh.dashboard.ui.colorScheme';
const LEGACY_THEME_KEY = 'odh.dashboard.ui.theme';

export type ColorScheme = 'system' | 'light' | 'dark';

// One-time migration from the pre-Felt theme key. The index.html boot script
// performs the same mapping before first paint; this covers contexts where
// that script has not run (tests, embedded mounts).
export const migrateLegacyThemeStorage = (
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): void => {
  try {
    if (storage.getItem(COLOR_SCHEME_KEY) === null) {
      const raw = storage.getItem(LEGACY_THEME_KEY);
      let legacy: string | null = null;
      if (raw !== null) {
        try {
          legacy = JSON.parse(raw);
        } catch {
          legacy = raw;
        }
      }
      if (legacy === 'dark' || legacy === 'light') {
        storage.setItem(COLOR_SCHEME_KEY, JSON.stringify(legacy));
      }
    }
    storage.removeItem(LEGACY_THEME_KEY);
  } catch {
    // no-op: storage unavailable
  }
};

type ThemeContextProps = {
  theme: string;
  setAllThemes: (themeName: string) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ThemeContext = React.createContext({} as ThemeContextProps);

export const useThemeContext = (): ThemeContextProps => React.useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
};
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  React.useState(() => {
    migrateLegacyThemeStorage(window.localStorage);
    return null;
  });
  const [colorScheme, setColorScheme] = useBrowserStorage<ColorScheme>(COLOR_SCHEME_KEY, 'system');
  // Glass is the default contrast per UX (2026-11-11 correction, RHAI-19116):
  // Felt + Glass matches the OCP 5.x direction. The system mode resolves to
  // Glass unless the OS prefers reduced transparency or more contrast; solid
  // and high contrast remain available via the appearance switcher.
  const [contrastMode, setContrastMode] = useBrowserStorage<ContrastMode>(
    'odh.dashboard.ui.contrastMode',
    'system',
  );
  const [, setMlflowTheme] = useBrowserStorage<boolean>(MLFLOW_DARK_MODE_KEY, false);

  const [prefersDark, setPrefersDark] = React.useState(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [prefersReducedTransparency, setPrefersReducedTransparency] = React.useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    } catch {
      return false;
    }
  });
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(() => {
    try {
      return window.matchMedia('(prefers-contrast: more)').matches;
    } catch {
      return false;
    }
  });

  // Track OS-level preferences
  React.useEffect(() => {
    let darkQuery;
    let transparencyQuery;
    let contrastQuery;

    try {
      darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
      contrastQuery = window.matchMedia('(prefers-contrast: more)');
    } catch {
      // Restricted contexts (iframe, private browsing) may block matchMedia
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

  // Compute the effective theme from the color scheme preference
  const theme = colorScheme === 'system' ? (prefersDark ? 'dark' : 'light') : colorScheme;

  // Resolve the effective contrast mode from the preference and system state.
  // Priority per the Glass Mode Handbook: high contrast > glass (never combined).
  // System mode: prefers-contrast: more → high contrast; otherwise
  // prefers-reduced-transparency: reduce → default (solid); otherwise → glass.
  const effectiveContrast: 'default' | 'glass' | 'high-contrast' =
    contrastMode === 'high-contrast' || (contrastMode === 'system' && prefersHighContrast)
      ? 'high-contrast'
      : contrastMode === 'default' || (contrastMode === 'system' && prefersReducedTransparency)
      ? 'default'
      : 'glass';

  // Apply theme classes to the document root
  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('pf-v6-theme-dark', theme === 'dark');
    setMlflowTheme(theme === 'dark');
  }, [theme, setMlflowTheme]);

  // Apply contrast mode classes (glass and high contrast are mutually exclusive)
  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('pf-v6-theme-glass', effectiveContrast === 'glass');
    html.classList.toggle('pf-v6-theme-high-contrast', effectiveContrast === 'high-contrast');
  }, [effectiveContrast]);

  const setAllThemes = React.useCallback(
    (themeName: string) => {
      setColorScheme(themeName === 'dark' ? 'dark' : 'light');
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme: themeName, contrastMode } }),
      );
    },
    [setColorScheme, contrastMode],
  );

  const handleSetColorScheme = React.useCallback(
    (scheme: ColorScheme) => {
      setColorScheme(scheme);
      const effective = scheme === 'system' ? (prefersDark ? 'dark' : 'light') : scheme;
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme: effective, contrastMode } }),
      );
    },
    [setColorScheme, prefersDark, contrastMode],
  );

  const handleSetContrastMode = React.useCallback(
    (mode: ContrastMode) => {
      setContrastMode(mode);
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme, contrastMode: mode } }),
      );
    },
    [setContrastMode, theme],
  );

  const contextValue = React.useMemo(
    () => ({
      theme,
      setAllThemes,
      colorScheme,
      setColorScheme: handleSetColorScheme,
      contrastMode,
      setContrastMode: handleSetContrastMode,
    }),
    [theme, setAllThemes, colorScheme, handleSetColorScheme, contrastMode, handleSetContrastMode],
  );

  const sharedContextValue = React.useMemo<SharedThemeContextProps>(
    () => ({
      theme,
      setTheme: setAllThemes,
      contrastMode,
      setContrastMode: handleSetContrastMode,
    }),
    [theme, setAllThemes, contrastMode, handleSetContrastMode],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <SharedThemeContext.Provider value={sharedContextValue}>
        {children}
      </SharedThemeContext.Provider>
    </ThemeContext.Provider>
  );
};
