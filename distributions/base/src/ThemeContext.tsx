import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ThemeContextProps = {
  theme: string;
  setTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  setTheme: () => undefined,
});

export const useThemeContext = (): ThemeContextProps => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<string>(
    () => localStorage.getItem('app-shell.theme') || 'light',
  );

  const setTheme = useCallback((t: string) => {
    localStorage.setItem('app-shell.theme', t);
    setThemeState(t);
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
