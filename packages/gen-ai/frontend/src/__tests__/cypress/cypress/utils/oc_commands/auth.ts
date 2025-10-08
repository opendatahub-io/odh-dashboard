export const getOcToken = (): Cypress.Chainable<string | null> => {
  return cy.exec('oc whoami -t', { failOnNonZeroExit: false, log: false }).then((result) => {
    if (result.code === 0 && result.stdout) {
      return cy.wrap(result.stdout.trim() as string | null);
    }
    return cy.wrap(null as string | null);
  });
};
