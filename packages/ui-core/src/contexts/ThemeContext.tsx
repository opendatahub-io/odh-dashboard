import * as React from 'react';

export type ThemeContextProps = {
  theme: string;
  setTheme: (themeName: string) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ThemeContext = React.createContext<ThemeContextProps>({} as ThemeContextProps);

export const useThemeContext = (): ThemeContextProps => React.useContext(ThemeContext);
