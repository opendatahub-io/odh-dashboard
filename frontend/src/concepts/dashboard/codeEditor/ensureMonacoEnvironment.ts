import * as monaco from 'monaco-editor';
import { configureMonacoLoader } from '#~/concepts/dashboard/codeEditor/monacoLoader';

/**
 * Point the host @monaco-editor/react loader at the bundled monaco-editor synchronously, for
 * modules that already import Monaco. The app-wide guard is `installMonacoLoader`, installed at
 * startup.
 * Do not register MonacoEnvironment.getWorker here — model-serving (and other
 * MF remotes) own yaml worker setup; a host getWorker would steal the global
 * and break remote monaco-yaml diagnostics.
 */
export const ensureMonacoEnvironment = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  configureMonacoLoader(monaco);
};
