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

/**
 * The bundled Monaco runs language services in workers emitted by the host's Monaco webpack
 * plugin. A language missing from the plugin's `languages` resolves to `<publicPath>/undefined`
 * and its worker fails to load with an uncaught error event.
 */
export const shouldLoadMonacoLanguageWorker = (label: string): void => {
  cy.window().should((win) => {
    const workerScripts = win.performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.endsWith('.worker.js') || name.endsWith('/undefined'));
    expect(workerScripts, 'Monaco worker scripts').to.include.members([
      `${win.location.origin}/${label}.worker.js`,
    ]);
    expect(
      workerScripts.filter((name) => name.endsWith('/undefined')),
      'unmapped Monaco workers',
    ).to.have.length(0);
  });
};
