import React from 'react';

const getCurrentWidth = (): number => window.innerWidth;

export const useWindowResize = (): boolean => {
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
};
