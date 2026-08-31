import React from 'react';

const useRefreshInterval = (refreshInterval: number, callback: () => void): void => {
  const cb = React.useRef(callback);

  cb.current = callback;

  React.useEffect(() => {
    const timer = setInterval(() => cb.current(), refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval]);
};
export default useRefreshInterval;
