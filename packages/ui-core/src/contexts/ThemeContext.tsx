import * as React from 'react';

export type ContrastMode = 'system' | 'default' | 'glass' | 'high-contrast';

export type ThemeContextProps = {
  theme: string;
  setTheme: (themeName: string) => void;
  /** Contrast mode preference — composes with light/dark; Glass adds transparency. */
  contrastMode?: ContrastMode;
  setContrastMode?: (mode: ContrastMode) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ThemeContext = React.createContext<ThemeContextProps>({} as ThemeContextProps);

export const useThemeContext = (): ThemeContextProps => React.useContext(ThemeContext);
