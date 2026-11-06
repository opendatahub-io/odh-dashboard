import * as React from 'react';
import {
  ThemeContext as SharedThemeContext,
  type ThemeContextProps as SharedThemeContextProps,
} from '@odh-dashboard/ui-core/contexts/ThemeContext';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';

export type ColorScheme = 'system' | 'light' | 'dark';
export type ContrastMode = 'system' | 'default' | 'glass' | 'high-contrast';

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
  const [colorScheme, setColorScheme] = useBrowserStorage<ColorScheme>(
    'odh.dashboard.ui.colorScheme',
    'system',
  );
  const [contrastMode, setContrastMode] = useBrowserStorage<ContrastMode>(
    'odh.dashboard.ui.contrastMode',
    'system',
  );
  const [, setMlflowTheme] = useBrowserStorage<boolean>(MLFLOW_DARK_MODE_KEY, false);

  const [prefersDark, setPrefersDark] = React.useState(false);
  const [prefersReducedTransparency, setPrefersReducedTransparency] = React.useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);

  // Track OS-level preferences
  React.useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

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
    () => ({ theme, setTheme: setAllThemes }),
    [theme, setAllThemes],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <SharedThemeContext.Provider value={sharedContextValue}>
        {children}
      </SharedThemeContext.Provider>
    </ThemeContext.Provider>
  );
};
