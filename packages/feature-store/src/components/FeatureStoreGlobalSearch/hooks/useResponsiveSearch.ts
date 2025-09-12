import * as React from 'react';

export interface UseResponsiveSearchReturn {
  searchInputStyle: React.CSSProperties;
  searchMenuStyle: React.CSSProperties;
}

export const useResponsiveSearch = (
  isSmallScreen: boolean,
  containerRef: React.RefObject<HTMLDivElement>,
  isDetailsPage?: boolean,
): UseResponsiveSearchReturn => {
  const [inputWidth, setInputWidth] = React.useState<number>(0);

  const searchInputStyle = React.useMemo(
    () => ({
      width: isSmallScreen ? '100%' : isDetailsPage ? '35ch' : '25ch',
      maxWidth: isSmallScreen ? '100%' : isDetailsPage ? '35ch' : '25ch',
    }),
    [isSmallScreen, isDetailsPage],
  );

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setInputWidth(width);
      }
    };

    updateWidth();

    const handleResize = () => updateWidth();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [isSmallScreen, containerRef]);

  const searchMenuStyle = React.useMemo(
    () => ({
      width: isSmallScreen ? `${inputWidth}px` : '75ch',
      marginLeft: '0',
      transform: 'none',
    }),
    [isSmallScreen, inputWidth],
  );

  return {
    searchInputStyle,
    searchMenuStyle,
  };
};
