import * as React from 'react';

const breakpointMD = 768;

export const useDesktopWidth = (): boolean => {
  const [width, setWidth] = React.useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return React.useMemo(() => width >= breakpointMD, [width]);
};
