import type { loader as MonacoLoader } from '@monaco-editor/react';

type LoaderModule = typeof import('#~/concepts/dashboard/codeEditor/monacoLoader');

type MonacoApi = typeof import('monaco-editor');

const mockMonaco = { editor: { create: jest.fn() }, languages: {} };
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const importMonaco = jest.fn(() => Promise.resolve(mockMonaco as unknown as MonacoApi));

const AMD_LOADER_SELECTOR = 'script[src$="/vs/loader.js"]';

/**
 * Each test gets fresh module state: the @monaco-editor/loader singleton and the guard flags.
 */
const loadModules = (): { loader: typeof MonacoLoader; monacoLoader: LoaderModule } => {
  let modules: { loader: typeof MonacoLoader; monacoLoader: LoaderModule } | undefined;
  jest.isolateModules(() => {
    modules = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loader: require('@monaco-editor/react').loader,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      monacoLoader: require('#~/concepts/dashboard/codeEditor/monacoLoader'),
    };
  });
  if (!modules) {
    throw new Error('modules not loaded');
  }
  return modules;
};

describe('monacoLoader', () => {
  beforeEach(() => {
    document.querySelectorAll('script').forEach((script) => script.remove());
    Object.assign(window, { monaco: undefined });
  });

  it('should inject the CDN AMD loader when no Monaco instance is configured (RHAI-20772 cause)', () => {
    const { loader } = loadModules();

    const init = loader.init();
    init.cancel();
    init.catch(() => undefined);

    expect(document.querySelector(AMD_LOADER_SELECTOR)).not.toBeNull();
  });

  it('should resolve the bundled Monaco without injecting the AMD loader once installed', async () => {
    const { loader, monacoLoader } = loadModules();
    monacoLoader.installMonacoLoader(importMonaco);

    await expect(loader.init()).resolves.toBe(mockMonaco);

    expect(document.querySelector(AMD_LOADER_SELECTOR)).toBeNull();
    expect(loader.__getMonacoInstance()).toBe(mockMonaco);
    expect(Reflect.get(window, 'monaco')).toBe(mockMonaco);
  });

  it('should share one bundled Monaco across editors initialized concurrently', async () => {
    const { loader, monacoLoader } = loadModules();
    monacoLoader.installMonacoLoader(importMonaco);

    const [first, second] = await Promise.all([loader.init(), loader.init()]);

    expect(first).toBe(mockMonaco);
    expect(second).toBe(mockMonaco);
    expect(importMonaco).toHaveBeenCalledTimes(1);
    expect(document.querySelector(AMD_LOADER_SELECTOR)).toBeNull();
  });

  it('should reject with a cancelation when the editor unmounts before Monaco loads', async () => {
    const { loader, monacoLoader } = loadModules();
    monacoLoader.installMonacoLoader(importMonaco);

    const init = loader.init();
    init.cancel();

    await expect(init).rejects.toEqual(expect.objectContaining({ type: 'cancelation' }));
    expect(document.querySelector(AMD_LOADER_SELECTOR)).toBeNull();
  });

  it('should keep using the instance configured by configureMonacoLoader', async () => {
    const { loader, monacoLoader } = loadModules();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const preloaded = { editor: { create: jest.fn() } } as unknown as MonacoApi;
    monacoLoader.configureMonacoLoader(preloaded);
    monacoLoader.installMonacoLoader(importMonaco);

    await expect(loader.init()).resolves.toBe(preloaded);
    expect(importMonaco).not.toHaveBeenCalled();
    expect(document.querySelector(AMD_LOADER_SELECTOR)).toBeNull();
  });

  it('should only wrap the loader once', () => {
    const { loader, monacoLoader } = loadModules();
    monacoLoader.installMonacoLoader(importMonaco);
    const wrapped = loader.init;
    monacoLoader.installMonacoLoader(importMonaco);

    expect(loader.init).toBe(wrapped);
  });
});
