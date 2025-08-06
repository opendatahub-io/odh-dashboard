import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { execWithOutput } from './baseCommands';

/**
 * Checks if the NIM OdhApplication exists on the cluster.
 * @param namespace The namespace to check for the NIM application.
 * @returns A Cypress chainable that returns true if the application exists, false otherwise.
 */
export const checkNIMApplicationExists = (
    namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<boolean> => {
    const ns = namespace ? `-n ${namespace}` : '';
    const checkCommand = `oc get odhapplication/nvidia-nim ${ns}`;
    
    cy.log(`Checking if NIM application exists: ${checkCommand}`);
    
    return cy.exec(checkCommand, { failOnNonZeroExit: false }).then((result) => {
        const exists = result.code === 0;
        cy.log(`NIM application exists: ${exists}`);
        return cy.wrap(exists);
    });
};

/**
 * Applies the NVIDIA NIM OdhApplication manifest to enable NIM on the cluster.
 * @param namespace The namespace where the NIM application should be applied.
 * @returns A Cypress chainable that performs the NIM application process.
 */
export const applyNIMApplication = (
    namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<CommandLineResult> => {
    cy.log('Applying NVIDIA NIM OdhApplication manifest...');

    // Apply the NIM manifest from the fixture file using relative path
    const ns = namespace ? `-n ${namespace}` : '';
    const ocCommand = `oc apply -f cypress/fixtures/e2e/nim/nvidia-nim-app.yaml ${ns}`;
    
    cy.log(`Debug: Applying NIM manifest: ${ocCommand}`);
    return execWithOutput(ocCommand);
};

/**
 * Deletes odh-nim-account in the APPLICATIONS_NAMESPACE.
 * @param namespace The namespace where account exist.
 * @returns A Cypress chainable that performs the account deletion process.
 */
export const deleteNIMAccount = (
    namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
): Cypress.Chainable<CommandLineResult> => {
    const ocCommand = `oc delete account odh-nim-account -n ${namespace}`;
    cy.log(`Executing: ${ocCommand}`);

    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
        if (result.code === 0) {
            // Account was successfully deleted
            cy.log(`Account deletion: ${result.stdout}`);
        } else if (result.stderr.includes('not found')) {
            // Account doesn't exist, which is fine
            cy.log('✅ NIM account does not exist - no cleanup needed');
        } else {
            // Some other error occurred
            cy.log(`⚠️  Warning: Failed to delete NIM account: ${result.stderr}`);
            cy.log('Continuing with test execution...');
        }
    });
};
