/**
 * Select preferred namespace from a list, with fallback
 */
export function selectPreferredNamespace(namespaces: string[], preferred: string): string {
  if (namespaces.includes(preferred)) {
    cy.log(`"${preferred}" project found`);
    return preferred;
  }

  cy.log(`"${preferred}" project not found, using first available project`);
  return namespaces[0];
}

/**
 * Wait for API response and verify status
 */
export function waitForApiResponse(
  alias: string,
  expectedStatus = 200,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Cypress.Chainable<any> {
  return cy.wait(alias).then((interception) => {
    expect(interception.response?.statusCode).to.equal(expectedStatus);
    return cy.wrap(interception);
  });
}
