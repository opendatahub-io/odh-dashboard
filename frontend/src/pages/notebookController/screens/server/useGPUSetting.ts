import * as React from 'react';
import useNotification from '../../../../utilities/useNotification';
import { getGPU } from '../../../../services/gpuService';
import { useAppContext } from '../../../../app/AppContext';

const useGPUSetting = (): {
  available: boolean;
  loaded: boolean;
  count: number;
  untrustedGPUs: boolean;
} => {
  const { dashboardConfig } = useAppContext();
  const [gpuSize, setGpuSize] = React.useState<number>(0);
  const [isFetching, setFetching] = React.useState(true);
  const [areGpusAvailable, setAreGpusAvailable] = React.useState<boolean>(false);
  const notification = useNotification();

  const setting = dashboardConfig.spec.notebookController?.gpuSetting || 'autodetect';
  const autodetect = setting === 'autodetect';
  const hidden = setting === 'hidden';
  const staticCount = Math.max(parseInt(setting), 0);

  React.useEffect(() => {
    if (!autodetect && !hidden) {
      if (staticCount > 0) {
        setAreGpusAvailable(true);
        setGpuSize(staticCount);
        setFetching(false);
      } else {
        setAreGpusAvailable(false);
        setFetching(false);
      }
      return;
    }
    if (hidden) {
      setAreGpusAvailable(false);
      setFetching(false);
      return;
    }

    // Auto detect logic
    let lastCall = 0;
    let cancelled = false;
    const fetchGPU = () => {
      setFetching(true);
      lastCall = Date.now();
      return getGPU().then(([areGpusAvailable, size]) => {
        if (cancelled) return;
        setAreGpusAvailable(areGpusAvailable);
        setGpuSize(size || 0);
        setFetching(false);
      });
    };

    const errorCatch = (e: Error) => {
      if (cancelled) return;
      setFetching(false);
      setAreGpusAvailable(false);
      setGpuSize(0);
      console.error(e);
      notification.error('Failed to fetch GPU', e.message);
    };

    fetchGPU().catch(errorCatch);

    const onUserClick = (): void => {
      const now = Date.now();
      if (now - lastCall > 60_000) {
        // User has been idle for a while, let us check on GPUs again
        fetchGPU().catch(errorCatch);
      }
    };
    if (areGpusAvailable) {
      window.addEventListener('click', onUserClick);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('click', onUserClick);
    };
  }, [notification, areGpusAvailable, staticCount, autodetect, hidden]);

  return {
    available: areGpusAvailable,
    loaded: !isFetching,
    count: gpuSize,
    untrustedGPUs: staticCount > 0,
  };
};

export default useGPUSetting;
