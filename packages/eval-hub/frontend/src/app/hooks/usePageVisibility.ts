import React from 'react';

// Returns whether the browser tab is currently visible. Polling hooks use this to pause when the tab is backgrounded.
const usePageVisibility = (): boolean => {
  const [isVisible, setIsVisible] = React.useState(() => !document.hidden);

  React.useEffect(() => {
    const handler = (): void => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return isVisible;
};

export default usePageVisibility;
