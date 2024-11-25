import { CommandLineResult } from "../../types";

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
