// utils/tabUtils.ts

/**
 * Clicks a section tab with retry mechanism and verifies URL after click.
 * @param getTabSelector A function that returns the selector for the tab element.
 * @param sectionId The ID of the section to verify in the URL (e.g., 'workbenches').
 */
export function retryClickTab(
  getTabSelector: () => Cypress.Chainable<JQuery<HTMLElement>>,
  sectionId: string,
): void {
  cy.retryClick(getTabSelector);
  cy.url().should('contain', `?section=${sectionId}`);
}
