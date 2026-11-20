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
