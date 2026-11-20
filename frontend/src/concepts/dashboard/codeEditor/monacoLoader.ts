import { loader } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';

type MonacoApi = typeof MonacoEditor;
type MonacoInit = typeof loader.init;
type CancelablePromise<T> = Promise<T> & { cancel: () => void };

let configured = false;
let guardInstalled = false;
let bundledMonaco: Promise<MonacoApi> | undefined;

/**
 * Point the shared `@monaco-editor/react` loader (and `window.monaco`, which any other
 * loader instance checks first) at the bundled `monaco-editor`.
 */
export const configureMonacoLoader = (monaco: MonacoApi): void => {
  if (configured) {
    return;
  }
  configured = true;
  loader.config({ monaco });
  Object.assign(window, { monaco });
};

const importBundledMonaco = (): Promise<MonacoApi> =>
  import(/* webpackChunkName: "monaco-editor" */ 'monaco-editor');

/**
 * Install the single Monaco loader configuration for the whole app, host and remotes alike.
 *
 * Without a configured instance, `@monaco-editor/loader` injects the AMD `vs/loader.js` from
 * jsDelivr. That script defines a global `define` with `define.amd`. Rspack leaves AMD unparsed,
 * so every UMD module evaluated afterwards (for example showdown in gen-ai) calls the global
 * `define` anonymously and Monaco throws "Can only have one anonymous define call per script
 * file" (RHAI-20772).
 *
 * The guard keeps `monaco-editor` out of the startup bundle: the first editor that initializes
 * the loader waits for the bundled Monaco chunk instead of falling back to the CDN.
 */
export const installMonacoLoader = (
  importMonaco: () => Promise<MonacoApi> = importBundledMonaco,
): void => {
  if (guardInstalled) {
    return;
  }
  guardInstalled = true;

  const { init }: { init: MonacoInit } = loader;
  const loadBundledMonaco = (): Promise<MonacoApi> => {
    bundledMonaco ??= importMonaco().then(
      (monaco) => {
        configureMonacoLoader(monaco);
        return monaco;
      },
      (error: unknown) => {
        // Do not cache a failed chunk load: the next editor retries the import.
        bundledMonaco = undefined;
        throw error;
      },
    );
    return bundledMonaco;
  };
  loader.init = () => {
    if (configured) {
      return init();
    }
    let canceled = false;
    let pending: ReturnType<MonacoInit> | undefined;
    const promise = loadBundledMonaco().then(() => {
      if (canceled) {
        // Same rejection shape as @monaco-editor/loader, which @monaco-editor/react ignores.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw { type: 'cancelation', msg: 'operation is manually canceled' };
      }
      pending = init();
      return pending;
    });
    const cancelable: CancelablePromise<MonacoApi> = Object.assign(promise, {
      cancel: () => {
        canceled = true;
        pending?.cancel();
      },
    });
    return cancelable;
  };
};
