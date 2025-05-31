import * as React from 'react';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';

type ThemeContextProps = {
  theme: string;
  setTheme: (themeName: string) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ThemeContext = React.createContext({} as ThemeContextProps);

export const useThemeContext = (): ThemeContextProps => React.useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
};
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useBrowserStorage<string>('odh.dashboard.ui.theme', 'light');

  const contextValue = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
