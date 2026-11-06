import * as React from 'react';
import {
  ThemeContext as SharedThemeContext,
  type ThemeContextProps as SharedThemeContextProps,
} from '@odh-dashboard/ui-core/contexts/ThemeContext';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';

export type ContrastMode = 'system' | 'default' | 'glass';

type ThemeContextProps = {
  theme: string;
  setAllThemes: (themeName: string) => void;
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
  const [odhTheme, setOdhTheme] = useBrowserStorage<string>('odh.dashboard.ui.theme', 'light');
  const [contrastMode, setContrastMode] = useBrowserStorage<ContrastMode>(
    'odh.dashboard.ui.contrastMode',
    'system',
  );
  const [, setMlflowTheme] = useBrowserStorage<boolean>(MLFLOW_DARK_MODE_KEY, odhTheme === 'dark');

  const [prefersReducedTransparency, setPrefersReducedTransparency] = React.useState(false);

  React.useEffect(() => {
    setMlflowTheme(odhTheme === 'dark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the OS-level "Reduce Transparency" preference
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedTransparency(e.matches);
    setPrefersReducedTransparency(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply the glass class based on the contrast mode preference
  React.useEffect(() => {
    const shouldUseGlass =
      contrastMode === 'glass' ||
      (contrastMode === 'system' && !prefersReducedTransparency);
    document.documentElement.classList.toggle('pf-v6-theme-glass', shouldUseGlass);
  }, [contrastMode, prefersReducedTransparency]);

  const setAllThemes = React.useCallback(
    (theme: string) => {
      setMlflowTheme(theme === 'dark');
      setOdhTheme(theme);
      // Notify federated modules running in the same document.
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme, contrastMode } }),
      );
    },
    [setMlflowTheme, setOdhTheme, contrastMode],
  );

  const handleSetContrastMode = React.useCallback(
    (mode: ContrastMode) => {
      setContrastMode(mode);
      window.dispatchEvent(
        new CustomEvent('odh-theme-change', { detail: { theme: odhTheme, contrastMode: mode } }),
      );
    },
    [setContrastMode, odhTheme],
  );

  const contextValue = React.useMemo(
    () => ({ theme: odhTheme, setAllThemes, contrastMode, setContrastMode: handleSetContrastMode }),
    [odhTheme, setAllThemes, contrastMode, handleSetContrastMode],
  );

  const sharedContextValue = React.useMemo<SharedThemeContextProps>(
    () => ({ theme: odhTheme, setTheme: setAllThemes }),
    [odhTheme, setAllThemes],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <SharedThemeContext.Provider value={sharedContextValue}>
        {children}
      </SharedThemeContext.Provider>
    </ThemeContext.Provider>
  );
};
