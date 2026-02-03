import * as React from 'react';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';

type ThemeContextProps = {
  theme: string;
  setAllThemes: (themeName: string) => void;
  mlflowTheme: boolean;
  setOdhTheme: (theme: string) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ThemeContext = React.createContext({} as ThemeContextProps);

export const useThemeContext = (): ThemeContextProps => React.useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
};
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [odhTheme, setOdhTheme] = useBrowserStorage<string>('odh.dashboard.ui.theme', 'light');
  const [mlflowTheme, setMlflowTheme] = useBrowserStorage<boolean>(
    '_mlflow_dark_mode_toggle_enabled',
    odhTheme === 'dark',
  );

  const setAllThemes = (theme: string) => {
    setMlflowTheme(theme === 'dark');
    setOdhTheme(theme);
  };

  const contextValue = React.useMemo(
    () => ({ theme: odhTheme, setAllThemes, mlflowTheme, setOdhTheme }),
    [odhTheme, mlflowTheme, setAllThemes, setOdhTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
