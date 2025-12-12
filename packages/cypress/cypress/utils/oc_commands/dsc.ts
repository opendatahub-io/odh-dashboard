import type { CommandLineResult } from '../../types';

// Resource identifiers
const DSC_RESOURCE = 'datasciencecluster default-dsc';

// Applications namespace - supports ODH (opendatahub) and RHOAI (redhat-ods-applications)
const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE') || 'opendatahub';

/**
 * Build an oc patch command with JSON merge strategy.
 */
const buildPatchCommand = (resource: string, patchJson: object): string => {
  return `oc patch ${resource} --type=merge -p '${JSON.stringify(patchJson)}'`;
};

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

/**
 * Set the Trainer component management state in the DataScienceCluster.
 * @param state - The desired management state ('Managed' or 'Removed')
 * @returns A Cypress chainable that resolves when the state is set and verified.
 */
export const setTrainerState = (
  state: 'Managed' | 'Removed',
): Cypress.Chainable<CommandLineResult> => {
  const patchSpec = { spec: { components: { trainer: { managementState: state } } } };
  cy.log(`Setting Trainer component to ${state}`);
  return cy
    .exec(buildPatchCommand(DSC_RESOURCE, patchSpec), {
      failOnNonZeroExit: false,
      timeout: 30000,
    })
    .then((result): CommandLineResult => {
      if (result.code !== 0) {
        throw new Error(`Failed to set Trainer state to ${state}: ${result.stderr}`);
      }
      return result;
    })
    .then((result) => {
      cy.log(`Patch applied, verifying Trainer state is now ${state}...`);
      // Verify the state was actually set
      return cy
        .exec(
          "oc get datasciencecluster -o jsonpath='{.items[0].spec.components.trainer.managementState}'",
          { failOnNonZeroExit: false, timeout: 10000 },
        )
        .then((verifyResult) => {
          const actualState = verifyResult.stdout.replace(/['"]/g, '').trim();
          if (actualState !== state) {
            throw new Error(
              `Trainer state verification failed: expected '${state}', got '${actualState}'`,
            );
          }
          cy.log(`Verified: Trainer component is now ${state}`);
          return cy.wrap(result);
        });
    });
};

/**
 * Enable the Trainer component by setting it to Managed in the DSC.
 * @returns A Cypress chainable that resolves when Trainer is enabled.
 */
export const enableTrainer = (): Cypress.Chainable<CommandLineResult> => {
  return setTrainerState('Managed');
};

/**
 * Get the current Trainer component management state from the DSC.
 * @returns A Cypress chainable that resolves to the management state string or null if not found.
 */
export const getTrainerState = (): Cypress.Chainable<string | null> => {
  // Use specific jsonpath to get the trainer state (NOT trainingoperator - that's different!)
  const ocCommand =
    "oc get datasciencecluster -o jsonpath='{.items[0].spec.components.trainer.managementState}'";

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    let state: string | null = null;

    if (result.code === 0 && result.stdout) {
      // Remove any quotes from jsonpath output
      const rawState = result.stdout.replace(/['"]/g, '').trim();
      if (rawState && rawState !== '' && rawState !== 'null') {
        state = rawState;
      }
    }

    // Log happens here, then return wrapped value
    return cy.wrap(state).then((s) => {
      cy.log(`Trainer state in DSC: ${s || 'null/empty'}`);
      return cy.wrap(s);
    });
  });
};

/**
 * Wait for the Trainer controller manager pod and webhook to be fully ready.
 * This must complete before creating TrainingRuntime resources.
 * @returns A Cypress chainable that resolves when complete.
 */
export const waitForTrainerControllerPod = (): Cypress.Chainable<boolean> => {
  const podSelector = 'app.kubernetes.io/name=trainer';

  cy.log(`Using applications namespace: ${applicationNamespace}`);

  cy.log('Waiting for Trainer controller manager pod to exist and be ready...');

  // Poll for pod existence, then wait for ready
  return pollForPod(applicationNamespace, podSelector, 24).then((podReady) => {
    if (!podReady) {
      cy.log('Warning: Trainer pod did not become ready');
      return cy.wrap(false);
    }

    // Wait for webhook endpoint
    cy.log('Checking webhook endpoint...');
    return cy
      .exec(
        `oc get endpoints kubeflow-trainer-controller-manager -n ${applicationNamespace} -o jsonpath='{.subsets[0].addresses[0].ip}' 2>/dev/null || echo ""`,
        { failOnNonZeroExit: false, timeout: 60000 },
      )
      .then((result) => {
        if (result.stdout && result.stdout.trim().length > 0) {
          cy.log(`Webhook endpoint ready: ${result.stdout}`);
        }
        return cy.wrap(true);
      });
  });
};

/**
 * Poll for pod to exist and be ready.
 */
const pollForPod = (
  namespace: string,
  selector: string,
  attemptsLeft: number,
): Cypress.Chainable<boolean> => {
  return cy
    .exec(`oc get pods -l ${selector} -n ${namespace} --no-headers 2>/dev/null || true`, {
      failOnNonZeroExit: false,
      timeout: 30000,
    })
    .then((result): Cypress.Chainable<boolean> => {
      const hasPod = result.stdout && result.stdout.trim().length > 0;

      if (hasPod) {
        cy.log('Trainer pod found, waiting for Ready condition...');
        return cy
          .exec(`oc wait --for=condition=Ready pod -l ${selector} -n ${namespace} --timeout=120s`, {
            failOnNonZeroExit: false,
            timeout: 150000,
          })
          .then((waitResult): Cypress.Chainable<boolean> => {
            if (waitResult.code === 0) {
              cy.log('Trainer controller manager pod is ready');
              return cy.wrap(true);
            }
            cy.log(`Pod wait failed: ${waitResult.stderr}`);
            return cy.wrap(false);
          });
      }

      if (attemptsLeft <= 0) {
        cy.log('Trainer pod did not appear after waiting');
        return cy.wrap(false);
      }

      cy.log(`Pod not found, attempt ${25 - attemptsLeft}/24...`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(5000).then(() => pollForPod(namespace, selector, attemptsLeft - 1));
    });
};

/**
 * Ensure the Trainer component is enabled in the DSC.
 * - If already Managed, does nothing
 * - If Removed or empty, sets to Managed and waits for controller pod
 *
 * @returns A Cypress chainable that resolves to true if DSC was modified, false if already enabled.
 */
export const ensureTrainerEnabled = (): Cypress.Chainable<boolean> => {
  cy.log('Checking Trainer state in DSC...');

  return getTrainerState().then((currentState): Cypress.Chainable<boolean> => {
    if (currentState === 'Managed') {
      cy.log('Trainer is already Managed in DSC - no changes needed');
      return cy.wrap(false);
    }

    cy.log(`Trainer state is '${currentState || 'empty/undefined'}' - enabling...`);

    return setTrainerState('Managed')
      .then(() => {
        cy.log('DSC patched, now waiting for Trainer controller to be fully ready...');
        return waitForTrainerControllerPod();
      })
      .then(() => {
        cy.log('Trainer successfully enabled and controller is running');
        return cy.wrap(true); // Modification was made
      });
  });
};
