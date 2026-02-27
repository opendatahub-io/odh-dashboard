/**
 * Hook for toggling mock vs real pipeline data in the Autorag frontend.
 *
 * Default: true only when DEV_MODE=true (e.g. in .env.local). Otherwise false.
 *
 * Uses localStorage so you can toggle at runtime via browser console:
 *     window.setAutoragMockPipelines(true);  // use mock
 *     window.setAutoragMockPipelines(false); // use real BFF when available
 *
 * State persists across page reloads.
 */

import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';

const STORAGE_KEY = 'odh.autorag.mockPipelines';

/** Default mock mode: true only when DEV_MODE=true */
const DEFAULT_USE_MOCK = process.env.DEV_MODE === 'true';

declare global {
  interface Window {
    setAutoragMockPipelines?: (enabled: boolean) => void;
  }
}

export function useAutoragMockPipelines(): [useMock: boolean, setUseMock: (v: boolean) => void] {
  const [useMock, setUseMock] = useBrowserStorage<boolean>(STORAGE_KEY, DEFAULT_USE_MOCK);

  React.useEffect(() => {
    window.setAutoragMockPipelines = setUseMock;
    return () => {
      delete window.setAutoragMockPipelines;
    };
  }, [setUseMock]);

  return [useMock, setUseMock];
}
