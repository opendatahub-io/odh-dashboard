import type { CommandLineResult } from '../../types';

type DSC = Record<string, unknown>;

const getDSC = (): Cypress.Chainable<DSC | null> => {
  const ocCommand = 'oc get datasciencecluster -o json';
  cy.log(`Executing command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0 || !result.stdout) {
      cy.log('Failed to retrieve DSC or DSC not found.');
      return cy.wrap(null as DSC | null);
    }

    try {
      const dscList = JSON.parse(result.stdout);
      const dsc = (dscList.items?.[0] || dscList) as DSC;
      return cy.wrap(dsc as DSC | null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      cy.log(`Error parsing DSC JSON: ${errorMessage}`);
      return cy.wrap(null as DSC | null);
    }
  });
};

const getDSCComponentState = (
  dsc: Record<string, unknown>,
  componentName: string,
): string | undefined => {
  const spec = dsc.spec as Record<string, unknown> | undefined;
  const components = spec?.components as Record<string, Record<string, unknown>> | undefined;
  return components?.[componentName]?.managementState as string | undefined;
};

/**
 * Check if Kueue is set to Unmanaged in the DataScienceCluster.
 * @returns A Cypress chainable that resolves to true if Kueue is Unmanaged, false otherwise.
 */
export const isKueueUnmanaged = (): Cypress.Chainable<boolean> =>
  getDSC().then((dsc) => {
    if (!dsc) {
      return cy.wrap(false);
    }

    const kueueManagementState = getDSCComponentState(dsc, 'kueue');
    const isUnmanaged = kueueManagementState === 'Unmanaged';

    if (isUnmanaged) {
      cy.log('Kueue is set to Unmanaged in the DSC.');
    } else {
      cy.log(
        `Kueue managementState is '${kueueManagementState || 'undefined'}', expected 'Unmanaged'.`,
      );
    }

    return cy.wrap(isUnmanaged);
  });

/**
 * Check if the Trainer component is set to Managed in the DataScienceCluster.
 * @returns A Cypress chainable that resolves to true if Trainer is Managed, false otherwise.
 */
export const isTrainerManaged = (): Cypress.Chainable<boolean> =>
  getDSC().then((dsc) => {
    if (!dsc) {
      return cy.wrap(false);
    }

    const trainerManagementState = getDSCComponentState(dsc, 'trainer');
    const isManaged = trainerManagementState === 'Managed';

    if (isManaged) {
      cy.log('Trainer is set to Managed in the DSC.');
    } else {
      cy.log(
        `Trainer managementState is '${
          trainerManagementState || 'undefined'
        }', expected 'Managed'.`,
      );
    }

    return cy.wrap(isManaged);
  });
