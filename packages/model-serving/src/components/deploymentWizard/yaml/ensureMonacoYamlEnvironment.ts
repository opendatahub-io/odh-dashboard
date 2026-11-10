import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

let loaderConfigured = false;

/**
 * Point this remote's @monaco-editor/react at a bundled monaco-editor and register
 * the monaco-yaml worker. Required because Module Federation gives the remote its
 * own loader instance — host `loader.config` does not apply here.
 *
 * MonacoEnvironment is re-asserted on every call so a host bootstrap / HMR pass
 * cannot leave a stale getWorker that fails yaml validation.
 *
 * Does not publish `window.monaco`. Host and remote can hold different Monaco
 * copies; the beforeMount instance is published after configuration.
 *
 * Same pattern as notebooks WorkspaceKindYamlEditor / NotebooksWrapper.
 */
export const ensureMonacoYamlEnvironment = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!loaderConfigured) {
    loader.config({ monaco });
    loaderConfigured = true;
  }

  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string): Worker {
      if (label === 'yaml') {
        return new Worker(new URL('monaco-yaml/yaml.worker', import.meta.url));
      }
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
    },
  };
};
