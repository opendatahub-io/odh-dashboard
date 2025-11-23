import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { execWithOutput, applyOpenShiftYaml, patchOpenShiftResource } from './baseCommands';

/**
 * Check if an operator is installed by checking for a CSV with the given name
 * @param operatorName The name of the operator (e.g., 'kueue-operator')
 * @param namespace The namespace to check (default: 'openshift-operators')
 * @returns Cypress Chainable that resolves to true if installed, false otherwise
 */
export const isOperatorInstalled = (
  operatorName: string,
  namespace = 'openshift-operators',
): Cypress.Chainable<boolean> => {
  // Search by CSV name (metadata.name) which starts with the operator name, e.g., "kueue-operator.v1.0.1"
  const ocCommand = `oc get csv -n ${namespace} -o json | jq -r '.items[] | select(.metadata.name | startswith("${operatorName}.")) | .metadata.name' | head -n 1`;
  cy.log(`Checking if ${operatorName} is installed in ${namespace}`);

  return execWithOutput(ocCommand).then(({ code, stdout }) => {
    if (code !== 0 || !stdout.trim()) {
      cy.log(`${operatorName} is not installed`);
      return cy.wrap(false);
    }
    const csvName = stdout.trim();
    cy.log(`${operatorName} is already installed (CSV: ${csvName})`);
    return cy.wrap(true);
  });
};

/**
 * Install an operator by applying a subscription YAML content
 * @param yamlContent YAML content of the subscription
 * @returns Cypress Chainable with the result of the apply operation
 */
export const installOperatorFromYaml = (
  yamlContent: string,
): Cypress.Chainable<CommandLineResult> => {
  cy.log('Installing operator from YAML content');
  return applyOpenShiftYaml(yamlContent).then((result) => {
    if (result.code !== 0) {
      cy.log(`ERROR installing operator: ${result.stderr}`);
      throw new Error(`Failed to install operator: ${result.stderr}`);
    }
    cy.log('Operator subscription applied successfully');
    return cy.wrap(result);
  });
};

/**
 * Get the install plan name for a subscription
 * @param subscriptionName The name of the subscription
 * @param namespace The namespace where the subscription exists (default: 'openshift-operators')
 * @returns Cypress Chainable that resolves to the install plan name or undefined
 */
export const getInstallPlanName = (
  subscriptionName: string,
  namespace = 'openshift-operators',
): Cypress.Chainable<string | undefined> => {
  cy.log(`Getting install plan for subscription ${subscriptionName} in ${namespace}`);

  // First, try to get from subscription status (most reliable)
  const subscriptionCommand = `oc get subscription ${subscriptionName} -n ${namespace} -o jsonpath='{.status.installPlanRef.name}' 2>/dev/null || echo ''`;
  return execWithOutput(subscriptionCommand).then(({ code, stdout }) => {
    if (code === 0 && stdout.trim()) {
      const installPlanName = stdout.trim();
      cy.log(`Found install plan from subscription status: ${installPlanName}`);
      return cy.wrap(installPlanName);
    }

    // Fallback: find pending install plans in the namespace
    const ocCommand = `oc get installplan -n ${namespace} -o json | jq -r '.items[] | select(.spec.approved == false) | .metadata.name' | head -n 1`;
    return execWithOutput(ocCommand).then(({ code: ipCode, stdout: ipStdout }) => {
      if (ipCode === 0 && ipStdout.trim()) {
        const installPlanName = ipStdout.trim();
        cy.log(`Found pending install plan: ${installPlanName}`);
        return cy.wrap(installPlanName);
      }
      cy.log(`No install plan found for ${subscriptionName}`);
      return cy.wrap(undefined);
    });
  }) as unknown as Cypress.Chainable<string | undefined>;
};

/**
 * Approve an install plan
 * @param installPlanName The name of the install plan to approve
 * @param namespace The namespace where the install plan exists (default: 'openshift-operators')
 * @returns Cypress Chainable with the result of the patch operation
 */
export const approveInstallPlan = (
  installPlanName: string,
  namespace = 'openshift-operators',
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Approving install plan ${installPlanName} in ${namespace}`);
  const patchContent = JSON.stringify({ spec: { approved: true } });
  return patchOpenShiftResource('installplan', installPlanName, patchContent, namespace);
};

/**
 * Wait for a CSV to reach Succeeded phase
 * @param operatorName The name of the operator (e.g., 'kueue-operator')
 * @param namespace The namespace to check (default: 'openshift-operators')
 * @param timeout Timeout in seconds (default: 300)
 * @returns Cypress Chainable that resolves when CSV is Succeeded
 */
export const waitForCsvSucceeded = (
  operatorName: string,
  namespace = 'openshift-operators',
  timeout = 300,
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Waiting for CSV matching ${operatorName} to reach Succeeded phase in ${namespace}`);
  const maxAttempts = Math.floor(timeout / 5);
  let attempts = 0;

  // Search by CSV name (metadata.name) which starts with the operator name, e.g., "kueue-operator.v1.0.1"
  const findCsvCommand = `oc get csv -n ${namespace} -o json | jq -r '.items[] | select(.metadata.name | startswith("${operatorName}.")) | .metadata.name' | head -n 1`;

  const checkCsvPhase = (csvName?: string): Cypress.Chainable<CommandLineResult> => {
    attempts += 1;

    // If we don't have CSV name yet, find it first
    if (!csvName) {
      return execWithOutput(findCsvCommand).then(({ code, stdout }) => {
        const foundCsvName = code === 0 && stdout.trim() ? stdout.trim() : undefined;
        if (foundCsvName) {
          cy.log(`Found CSV: ${foundCsvName}`);
          // Now check its phase using the exact CSV name
          const ocCommand = `oc get csv ${foundCsvName} -n ${namespace} -o jsonpath='{.status.phase}' 2>/dev/null || echo ''`;
          return execWithOutput(ocCommand).then((result) => {
            return checkPhaseResult(result, foundCsvName);
          });
        }
        // CSV not found yet
        cy.log(`CSV phase check (attempt ${attempts}/${maxAttempts}): CSV not found yet`);
        if (attempts >= maxAttempts) {
          const errorMsg = `Timeout waiting for CSV ${operatorName} to be created`;
          cy.log(`ERROR: ${errorMsg}`);
          throw new Error(errorMsg);
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(5000).then(() => checkCsvPhase());
      });
    }

    // We have CSV name, check its phase directly using jsonpath
    const ocCommand = `oc get csv ${csvName} -n ${namespace} -o jsonpath='{.status.phase}' 2>/dev/null || echo ''`;
    return execWithOutput(ocCommand).then((result) => {
      return checkPhaseResult(result, csvName);
    });
  };

  const checkPhaseResult = (
    result: CommandLineResult,
    currentCsvName: string,
  ): Cypress.Chainable<CommandLineResult> => {
    const phase = result.stdout.trim();
    cy.log(`CSV phase check (attempt ${attempts}/${maxAttempts}): ${phase || 'not found'}`);

    if (phase === 'Succeeded') {
      cy.log(`CSV ${currentCsvName} is Succeeded!`);
      return cy.wrap({ code: 0, stdout: 'Succeeded', stderr: '' });
    }

    if (attempts >= maxAttempts) {
      const errorMsg = `Timeout waiting for CSV ${operatorName} to reach Succeeded phase. Last phase: ${
        phase || 'not found'
      }`;
      cy.log(`ERROR: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Wait 5 seconds before next attempt, pass the CSV name so we don't need to find it again
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    return cy.wait(5000).then(() => checkCsvPhase(currentCsvName));
  };

  return checkCsvPhase();
};

/**
 * Install the kueue operator with all necessary steps
 * @param subscriptionYamlContent YAML content of the subscription
 * @param namespace The namespace where to install (default: 'openshift-operators')
 * @returns Cypress Chainable that resolves when installation is complete
 */
export const installKueueOperator = (
  subscriptionYamlContent: string,
  namespace = 'openshift-operators',
): Cypress.Chainable<void> => {
  cy.log('Installing kueue-operator');

  return isOperatorInstalled('kueue-operator', namespace).then((installed) => {
    if (installed) {
      cy.log('kueue-operator is already installed, verifying CSV is Succeeded');
      // Just verify the CSV is Succeeded and return
      return waitForCsvSucceeded('kueue-operator', namespace, 300).then(() => {
        cy.log('kueue-operator is already installed and CSV is Succeeded');
      });
    }

    // Step 2: Install the operator
    cy.log('Installing kueue-operator subscription');
    return installOperatorFromYaml(subscriptionYamlContent)
      .then(() => {
        // Wait a bit for OLM to create the install plan
        cy.log('Waiting for install plan to be created');
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(5000);
      })
      .then(() => {
        // Step 3: Get the install plan
        cy.log('Getting install plan');
        return getInstallPlanName('kueue-operator', namespace);
      })
      .then((installPlanName) => {
        if (!installPlanName) {
          cy.log(
            'No install plan found, operator may already be installed or installation may be automatic',
          );
          // Still wait for CSV in case it's installing
          return cy.then(() => {
            // Return void
          });
        }

        // Step 4: Approve the install plan
        cy.log(`Approving install plan: ${installPlanName}`);
        return approveInstallPlan(installPlanName, namespace).then(() => {
          // Wait a bit for OLM to start creating the CSV after approval
          cy.log('Waiting for CSV to be created after install plan approval');
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          return cy.wait(10000);
        });
      })
      .then(() => {
        // Step 5: Wait for CSV to be Succeeded
        cy.log('Waiting for CSV to reach Succeeded phase');
        return waitForCsvSucceeded('kueue-operator', namespace, 300);
      })
      .then(() => {
        cy.log('kueue-operator installation completed successfully');
      });
  }) as unknown as Cypress.Chainable<void>;
};
