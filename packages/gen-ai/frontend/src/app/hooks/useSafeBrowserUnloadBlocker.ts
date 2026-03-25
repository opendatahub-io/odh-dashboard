import { useEffect } from 'react';

/**
 * A safe browser unload blocker that works in both standalone and federated modes.
 * Uses the native beforeunload event which works with any router type.
 */
export const useSafeBrowserUnloadBlocker = (shouldBlock: boolean): void => {
  useEffect(() => {
    if (!shouldBlock) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // eslint-disable-next-line no-param-reassign -- required for beforeunload to work in some browsers
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldBlock]);
};
