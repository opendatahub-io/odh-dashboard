/**
 * RHAI-20772: code editors must use the bundled Monaco. Falling back to the CDN AMD loader
 * (`vs/loader.js`) installs a global AMD `define` that breaks every UMD module loaded afterwards
 * ("Can only have one anonymous define call per script file").
 */
export const shouldUseBundledMonaco = (): void => {
  cy.document().then((doc) => {
    const amdLoaderScripts = Array.from(doc.scripts)
      .map((script) => script.src)
      .filter((src) => src.includes('/vs/loader.js'));
    expect(amdLoaderScripts, 'Monaco AMD loader scripts').to.have.length(0);
  });
  cy.window().then((win) => {
    expect(typeof Reflect.get(win, 'define'), 'global AMD define').to.equal('undefined');
  });
};

type MonacoModel = { getLanguageId: () => string; setValue: (value: string) => void };
type MonacoGlobal = {
  editor: {
    getModels: () => MonacoModel[];
    getModelMarkers: (filter: { owner?: string }) => unknown[];
  };
};

const isMonacoGlobal = (value: unknown): value is MonacoGlobal =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'editor') === 'object' &&
  typeof Reflect.get(Reflect.get(value, 'editor'), 'getModelMarkers') === 'function';

const getBundledMonaco = (win: Window): MonacoGlobal => {
  const monaco: unknown = Reflect.get(win, 'monaco');
  if (!isMonacoGlobal(monaco)) {
    throw new Error('The bundled Monaco is not configured on window.monaco');
  }
  return monaco;
};

/**
 * The bundled Monaco runs language services in workers emitted by the host's Monaco webpack
 * plugin. A language missing from the plugin's `languages` resolves to `<publicPath>/undefined`
 * and its worker fails to load with an uncaught error event.
 *
 * Proves the worker runs, not only that it was requested: the mock server answers unknown paths
 * with the SPA page, so a request alone can look successful. Replaces the content of the
 * language's editor model with invalid input and waits for the worker's diagnostics.
 */
export const shouldRunMonacoLanguageWorker = (language: string): void => {
  cy.window().should((win) => {
    const unmappedWorkers = win.performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.endsWith('/undefined'));
    expect(unmappedWorkers, 'unmapped Monaco workers').to.have.length(0);
  });
  cy.window()
    .should((win) => {
      const languages = getBundledMonaco(win)
        .editor.getModels()
        .map((m) => m.getLanguageId());
      expect(languages, 'Monaco model languages').to.include(language);
    })
    .then((win) => {
      getBundledMonaco(win)
        .editor.getModels()
        .find((m) => m.getLanguageId() === language)
        ?.setValue('{');
    });
  cy.window().should((win) => {
    expect(
      getBundledMonaco(win).editor.getModelMarkers({ owner: language }),
      `${language} worker diagnostics`,
    ).to.have.length.greaterThan(0);
  });
};
