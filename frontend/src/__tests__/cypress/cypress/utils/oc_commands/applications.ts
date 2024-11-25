import { CommandLineResult } from "../../types";

const applicationNamespace = Cypress.env('TEST_NAMESPACE');

export const getOcResourceNames = (
  applicationNamespace: string,
  kind: string,
): Cypress.Chainable<string[]> => {
  const ocCommand = `oc get ${kind} -n ${applicationNamespace} -o json`;
  cy.log(`Executing command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    const jsonResponse = JSON.parse(result.stdout);
    const metadataNames = jsonResponse.items.map((item: { metadata: { name: string } }) => item.metadata.name);
    return metadataNames;
  });
};

// Usage in a Cypress test
it('should get all metadata names from the oc resource', () => {
  getOcResourceNames(applicationNamespace, 'OdhApplication').then((metadataNames) => {
    cy.log(`Metadata names: ${metadataNames.join(', ')}`);
    // Use metadataNames in your test assertions or further operations
    expect(metadataNames).to.include('aikit');
  });
});