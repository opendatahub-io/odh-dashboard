import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

let initialized = false;

/**
 * Point @monaco-editor/react at the bundled monaco-editor and register the
 * monaco-yaml web worker. Without this, PF CodeEditor falls back to CDN Monaco
 * and syntax validation never runs.
 *
 * Same pattern as notebooks WorkspaceKindYamlEditor / NotebooksWrapper.
 */
export const ensureMonacoYamlEnvironment = (): void => {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  loader.config({ monaco });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
  (window as any).monaco = monaco;

  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string): Worker {
      if (label === 'yaml') {
        return new Worker(new URL('monaco-yaml/yaml.worker', import.meta.url));
      }
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
    },
  };
};
