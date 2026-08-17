import * as React from 'react';

const useDarkMode = (): boolean => {
  const [isDarkMode, setIsDarkMode] = React.useState(() =>
    document.documentElement.classList.contains('pf-v6-theme-dark'),
  );

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('pf-v6-theme-dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDarkMode;
};

export default useDarkMode;
