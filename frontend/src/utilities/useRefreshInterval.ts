import React from 'react';

const useRefreshInterval = (refreshInterval: number, callback: () => void) => {
  const cb = React.useRef<typeof callback>(() => undefined);

  cb.current = callback;

  React.useEffect(() => {
    const timer = setInterval(cb.current, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval]);
};
export default useRefreshInterval;
