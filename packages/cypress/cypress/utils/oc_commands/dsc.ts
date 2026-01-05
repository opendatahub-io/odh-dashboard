import type { CommandLineResult } from '../../types';

/**
 * Check if Kueue is set to Unmanaged in the DataScienceCluster.
 * @returns A Cypress chainable that resolves to true if Kueue is Unmanaged, false otherwise.
 */
export const isKueueUnmanaged = (): Cypress.Chainable<boolean> => {
  const ocCommand = 'oc get datasciencecluster -o json';
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0 || !result.stdout) {
      cy.log('Failed to retrieve DSC or DSC not found.');
      return cy.wrap(false);
    }

    try {
      const dscList = JSON.parse(result.stdout);
      const dsc = dscList.items?.[0] || dscList; // Handle both list and single item response

      const kueueManagementState = dsc?.spec?.components?.kueue?.managementState;
      const isUnmanaged = kueueManagementState === 'Unmanaged';

      if (isUnmanaged) {
        cy.log('Kueue is set to Unmanaged in the DSC.');
      } else {
        cy.log(
          `Kueue managementState is '${
            kueueManagementState || 'undefined'
          }', expected 'Unmanaged'.`,
        );
      }

      return cy.wrap(isUnmanaged);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`Error parsing DSC JSON: ${errorMessage}`);
      return cy.wrap(false);
    }
  });
};
