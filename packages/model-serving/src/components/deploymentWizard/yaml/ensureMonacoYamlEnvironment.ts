import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

let loaderConfigured = false;

/**
 * Select the bundled monaco-editor for PatternFly's CodeEditor when the YAML
 * view chunk loads. The wizard route lazy-loads that chunk, so this does not
 * run on other pages.
 *
 * `loader.config` alone does not reach the editor. PatternFly calls `loader.init()`
 * before `beforeMount`, and that init uses `window.monaco` when the shared loader
 * was not configured. Without this, the editor downloads Monaco 0.55.1 from the CDN.
 * That worker has no `getCodeAction` / `doValidation`, which monaco-yaml calls.
 *
 * Leave `MonacoEnvironment` to the host Monaco webpack plugin. It maps `yaml` to
 * `yaml.worker.js` (monaco-yaml, which implements those calls). Replacing it with
 * `new URL(..., import.meta.url)` points at federation runtime shells instead.
 */
export const ensureMonacoYamlEnvironment = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (loaderConfigured) {
    return;
  }
  loaderConfigured = true;

  loader.config({ monaco });
  // Same hook DashboardCodeEditor and DCHCodeEditor use so PatternFly finds this build.
  if (!window.monaco?.editor) {
    Object.assign(window, { monaco });
  }
};
