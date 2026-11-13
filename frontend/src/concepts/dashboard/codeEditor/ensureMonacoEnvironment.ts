import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

let initialized = false;

/**
 * Point the host @monaco-editor/react loader at the bundled monaco-editor.
 * Do not register MonacoEnvironment.getWorker here — model-serving (and other
 * MF remotes) own yaml worker setup; a host getWorker would steal the global
 * and break remote monaco-yaml diagnostics.
 */
export const ensureMonacoEnvironment = (): void => {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  loader.config({ monaco });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
  (window as any).monaco = monaco;
};
