import * as React from 'react';
import {
  ThemeContext as SharedThemeContext,
  type ContrastMode,
  type ThemeContextProps as SharedThemeContextProps,
} from '@odh-dashboard/ui-core/contexts/ThemeContext';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';

export type ColorScheme = 'system' | 'light' | 'dark';

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

  // Track OS-level preferences
  React.useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');

    const handleDark = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    const handleTransparency = (e: MediaQueryListEvent) => setPrefersReducedTransparency(e.matches);

    setPrefersDark(darkQuery.matches);
    setPrefersReducedTransparency(transparencyQuery.matches);

    darkQuery.addEventListener('change', handleDark);
    transparencyQuery.addEventListener('change', handleTransparency);
    return () => {
      darkQuery.removeEventListener('change', handleDark);
      transparencyQuery.removeEventListener('change', handleTransparency);
    };
  }, []);

  // Compute the effective theme from the color scheme preference
  const theme = colorScheme === 'system' ? (prefersDark ? 'dark' : 'light') : colorScheme;

  // Apply theme classes to the document root
  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('pf-v6-theme-dark', theme === 'dark');
    setMlflowTheme(theme === 'dark');
  }, [theme, setMlflowTheme]);

  // Apply glass class based on the contrast mode preference
  React.useEffect(() => {
    const shouldUseGlass =
      contrastMode === 'glass' ||
      (contrastMode === 'system' && !prefersReducedTransparency);
    document.documentElement.classList.toggle('pf-v6-theme-glass', shouldUseGlass);
  }, [contrastMode, prefersReducedTransparency]);

  const setAllThemes = React.useCallback(
    (themeName: string) => {
      // Legacy: map explicit light/dark to the color scheme
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
