import { useEffect, useCallback } from 'react';

/**
 * Use this hook to block the browser from unloading when the user has unsaved changes.
 * @param shouldBlock - Whether to block the browser from unloading.
 */
export function useBrowserUnloadBlocker(shouldBlock: boolean): void {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (shouldBlock) {
        e.preventDefault();
        e.returnValue = '';
      }
    },
    [shouldBlock],
  );

  useEffect(() => {
    if (!shouldBlock) {
      return;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldBlock, handleBeforeUnload]);
}
