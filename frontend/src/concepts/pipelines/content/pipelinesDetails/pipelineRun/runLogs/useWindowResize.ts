import React from 'react';

function getCurrentWidth(): number {
  return window.innerWidth;
}

export function useWindowResize() {
  const [width, setWidth] = React.useState(getCurrentWidth());

  const handleResize = React.useCallback(() => {
    setWidth(getCurrentWidth());
  }, []);

  React.useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const isSmallScreen = width < 576;
  return isSmallScreen;
}
