import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextProps = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const THEME_KEY = 'app-shell.theme';

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  setTheme: () => undefined,
});

export const useThemeContext = (): ThemeContextProps => useContext(ThemeContext);

const readTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // no-op: storage unavailable
    }
    setThemeState(t);
    window.dispatchEvent(new CustomEvent('odh-theme-change', { detail: { theme: t } }));
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('pf-v6-theme-dark');
    } else {
      html.classList.remove('pf-v6-theme-dark');
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
