import * as React from 'react';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { MLFLOW_DARK_MODE_KEY } from '#~/pages/pipelines/global/mlflowExperiments/utils';

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
  console.log('odhTheme', odhTheme);

  const setAllThemes = React.useCallback(
    (theme: string) => {
      setMlflowTheme(theme === 'dark');
      setOdhTheme(theme);
    },
    [setMlflowTheme, setOdhTheme],
  );

  const contextValue = React.useMemo(
    () => ({ theme: odhTheme, setAllThemes }),
    [odhTheme, setAllThemes],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
