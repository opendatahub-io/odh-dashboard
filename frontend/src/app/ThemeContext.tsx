import * as React from 'react';
import {
  ThemeContext as SharedThemeContext,
  type ThemeContextProps as SharedThemeContextProps,
} from '@odh-dashboard/ui-core/contexts/ThemeContext';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';

type ThemeContextProps = {
  theme: string;
  setAllThemes: (themeName: string) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ThemeContext = React.createContext({} as ThemeContextProps);

export const useThemeContext = (): ThemeContextProps => React.useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
};
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [odhTheme, setOdhTheme] = useBrowserStorage<string>('odh.dashboard.ui.theme', 'light');
  const [, setMlflowTheme] = useBrowserStorage<boolean>(MLFLOW_DARK_MODE_KEY, odhTheme === 'dark');

  React.useEffect(() => {
    setMlflowTheme(odhTheme === 'dark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAllThemes = React.useCallback(
    (theme: string) => {
      setMlflowTheme(theme === 'dark');
      setOdhTheme(theme);
      // Notify federated modules running in the same document.
      window.dispatchEvent(new CustomEvent('odh-theme-change', { detail: { theme } }));
    },
    [setMlflowTheme, setOdhTheme],
  );

  const contextValue = React.useMemo(
    () => ({ theme: odhTheme, setAllThemes }),
    [odhTheme, setAllThemes],
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
