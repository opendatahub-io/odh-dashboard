/**
 * Utility functions for clipboard testing in Cypress.
 */

/**
 * Stubs the clipboard API and captures copied text.
 * Must be called AFTER page load (window changes on navigation).
 *
 * @param aliasName The alias name to use for the captured text array (without @).
 */
export const stubClipboard = (aliasName: string): void => {
  cy.window().then((win) => {
    const copied: string[] = [];
    cy.wrap(copied).as(aliasName);
    cy.stub(win.navigator.clipboard, 'writeText').callsFake((text: string) => {
      copied.push(text);
      return Promise.resolve();
    });
  });
};

/**
 * Verifies that at least the specified number of items were copied to the clipboard.
 *
 * @param aliasName The alias name used in stubClipboard (without @).
 * @param minLength Minimum number of items expected (default: 1).
 * @returns Cypress chainable with the copied items array.
 */
export const verifyClipboardHasContent = (
  aliasName: string,
  minLength = 1,
): Cypress.Chainable<string[]> => {
  return cy.get<string[]>(`@${aliasName}`).should('have.length.at.least', minLength);
};

/**
 * Gets the copied clipboard content.
 *
 * @param aliasName The alias name used in stubClipboard (without @).
 * @returns Cypress chainable with the copied items array.
 */
export const getClipboardContent = (aliasName: string): Cypress.Chainable<string[]> => {
  return cy.get<string[]>(`@${aliasName}`);
};
