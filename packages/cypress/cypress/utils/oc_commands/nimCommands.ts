import type { PollOptions } from './baseCommands';
import type { CommandLineResult } from '../../types';

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
  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    cy.log(`Command exit code: ${result.code}`);
    if (result.code !== 0) {
      throw new Error(`Failed to apply NIM manifest: ${result.stderr || result.stdout}`);
    }
    return cy.wrap(result);
  });
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

/**
 * Default polling configuration for NIM account validation.
 * Uses longer timeouts since NVIDIA API validation can take up to 7 minutes.
 */
const DEFAULT_NIM_POLL_OPTIONS: Required<PollOptions> = {
  maxAttempts: 84, // 84 attempts * 5 seconds = 7 minutes total
  pollIntervalMs: 5000,
};

/**
 * Wait for the NIM account to be fully validated by polling the account status.
 * Checks for the AccountStatus condition to be True with reason AccountSuccessful.
 * This indicates that all components are ready:
 * - API key validated (APIKeyValidation)
 * - Config map created (ConfigMapUpdate)
 * - Runtime template created (TemplateUpdate)
 * - Pull secret created (SecretUpdate)
 * - Account is healthy (AccountStatus)
 *
 * @param namespace The namespace where the account exists.
 * @param options Polling options (maxAttempts, pollIntervalMs).
 * @returns A Cypress chainable that resolves when validation is complete.
 */
export const waitForNIMAccountValidation = (
  namespace: string = Cypress.env('APPLICATIONS_NAMESPACE'),
  options: PollOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const { maxAttempts, pollIntervalMs } = { ...DEFAULT_NIM_POLL_OPTIONS, ...options };
  const startTime = Date.now();
  const totalTimeout = maxAttempts * pollIntervalMs;

  const check = (attemptNumber = 1): Cypress.Chainable<CommandLineResult> => {
    // Check for AccountStatus condition with status=True and reason=AccountSuccessful
    const command = `oc get account odh-nim-account -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="AccountStatus")].reason}'`;

    return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
      const reason = result.stdout.trim();
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (reason === 'AccountSuccessful') {
        cy.log(`✅ NIM account AccountStatus reason is AccountSuccessful (after ${elapsedTime}s)`);
        return cy.wrap(result);
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `NIM account AccountStatus reason not AccountSuccessful after ${maxAttempts} attempts (${elapsedTime}s). Current reason: ${
            reason || 'not found'
          }`,
        );
      }

      cy.log(
        `⏳ Waiting for NIM account AccountStatus (attempt ${attemptNumber}/${maxAttempts}, reason: ${
          reason || 'not found'
        }, elapsed: ${elapsedTime}s)`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });
  };

  cy.step(`Polling for NIM account AccountStatus condition (max ${totalTimeout / 1000}s)`);
  return check();
};
