import * as React from 'react';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';

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

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
