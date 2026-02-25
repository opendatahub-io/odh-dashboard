/**
 * Hook for toggling mock vs real pipeline data in the Autorag frontend.
 *
 * Uses localStorage so you can toggle at runtime via browser console:
 *     window.setAutoragMockPipelines(true);  // use mock (default)
 *     window.setAutoragMockPipelines(false); // use real BFF when available
 *
 * State persists across page reloads.
 */

import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';

const STORAGE_KEY = 'odh.autorag.mockPipelines';

declare global {
  interface Window {
    setAutoragMockPipelines?: (enabled: boolean) => void;
  }
}

export function useAutoragMockPipelines(): [useMock: boolean, setUseMock: (v: boolean) => void] {
  const [useMock, setUseMock] = useBrowserStorage<boolean>(STORAGE_KEY, true);

  React.useEffect(() => {
    window.setAutoragMockPipelines = setUseMock;
    return () => {
      delete window.setAutoragMockPipelines;
    };
  }, [setUseMock]);

  return [useMock, setUseMock];
}
