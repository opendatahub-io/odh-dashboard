import * as React from 'react';

/**
 * Custom hook to detect dark mode by checking for the pf-v6-theme-dark class
 * on the document element. This hook automatically updates when the theme changes.
 *
 * @returns {boolean} - true if dark mode is active, false otherwise
 */
const useDarkMode = (): boolean => {
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      const htmlElement = document.documentElement;
      setIsDarkMode(htmlElement.classList.contains('pf-v6-theme-dark'));
    };

    // Check initially
    checkDarkMode();

    // Set up observer to watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDarkMode;
};

export default useDarkMode;
