import { pollUntilSuccess } from './baseCommands';
import { enableGenAiFeatures, disableGenAiFeatures } from './genAi';
import { appChrome } from '../../pages/appChrome';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const DSC_RESOURCE = 'datasciencecluster default-dsc';
const K8S_NAMESPACE_RE = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;

const UI_POLL_CONFIG = {
  maxAttempts: 20,
  pollIntervalMs: 10000,
  pageLoadWaitMs: 5000,
} as const;

const assertNamespace = (namespace: string): string => {
  if (!K8S_NAMESPACE_RE.test(namespace)) {
    throw new Error(`Invalid namespace: ${namespace}`);
  }
  return namespace;
};

const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error('APPLICATIONS_NAMESPACE is not configured.');
  }
  return assertNamespace(namespace);
};

const buildPatchCommand = (resource: string, patchJson: object, namespace?: string): string => {
  const safeNamespace = namespace ? assertNamespace(namespace) : undefined;
  const namespaceFlag = safeNamespace ? ` -n ${safeNamespace}` : '';
  return `oc patch ${resource}${namespaceFlag} --type=merge -p '${JSON.stringify(patchJson)}'`;
};

/**
 * Set the MLflow operator management state in DataScienceCluster.
 *
 * @param state - The management state ('Managed' or 'Removed').
 * @returns A Cypress.Chainable that resolves when the patch is applied.
 */
export const setMlflowOperatorState = (
  state: 'Managed' | 'Removed',
): Cypress.Chainable<CommandLineResult> => {
  const patchSpec = { spec: { components: { mlflowoperator: { managementState: state } } } };
  return cy.exec(buildPatchCommand(DSC_RESOURCE, patchSpec)).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`Failed to set MLflow operator state to ${state}: ${maskedStderr}`);
    }
    return result;
  });
};

/**
 * Poll until the MLflow operator pod is ready.
 */
const waitForMlflowOperatorReady = (): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get pods -A -l app.kubernetes.io/name=mlflow-operator --no-headers | grep Running`,
    'MLflow operator pod to be Running',
    { maxAttempts: 60, pollIntervalMs: 5000 },
  );

/**
 * Create an MLflow CR in the given namespace so the MLflow service is deployed.
 * Loads the CR spec from the fixture file and applies it with the target namespace.
 * Skips creation if one already exists.
 *
 * @param namespace - The namespace in which to create the MLflow CR.
 * @returns A Cypress.Chainable that resolves when the CR is created or already exists.
 */
const ensureMlflowCR = (namespace: string): Cypress.Chainable<CommandLineResult> => {
  const safeNamespace = assertNamespace(namespace);
  const checkCommand = `oc get mlflows.mlflow.opendatahub.io -n ${safeNamespace} --no-headers 2>/dev/null | head -1`;
  return cy.exec(checkCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.stdout.trim()) {
      cy.log('MLflow CR already exists, skipping creation.');
      return cy.wrap(result);
    }

    cy.log('Creating MLflow CR...');
    return cy
      .exec(`oc apply -n ${safeNamespace} -f cypress/fixtures/e2e/promptManagement/mlflowCR.yaml`, {
        failOnNonZeroExit: false,
      })
      .then((applyResult) => {
        if (applyResult.code !== 0) {
          const maskedStderr = maskSensitiveInfo(applyResult.stderr);
          throw new Error(`Failed to create MLflow CR: ${maskedStderr}`);
        }
        return applyResult;
      });
  });
};

/**
 * Delete the MLflow CR in the given namespace.
 *
 * @param namespace - The namespace from which to delete the MLflow CR.
 * @returns A Cypress.Chainable that resolves when deletion is complete.
 */
export const deleteMlflowCR = (namespace: string): Cypress.Chainable<CommandLineResult> => {
  const safeNamespace = assertNamespace(namespace);
  return cy
    .exec(`oc delete mlflows.mlflow.opendatahub.io --all -n ${safeNamespace}`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      if (result.code !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        cy.log(`Warning: Failed to delete MLflow CR: ${maskedStderr}`);
      }
      return result;
    });
};

/**
 * Poll until the MLflow CR has a ready status.address.url.
 *
 * @param namespace - The namespace in which to check the MLflow CR status.
 * @returns A Cypress.Chainable that resolves when the CR has status.address.url.
 */
const waitForMlflowCRReady = (namespace: string): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get mlflows.mlflow.opendatahub.io -n ${assertNamespace(
      namespace,
    )} -o json | jq -e '.items[0].status.address.url'`,
    'MLflow CR to have status.address.url',
    { maxAttempts: 60, pollIntervalMs: 5000 },
  );

/**
 * Check if the Prompts nav item is visible in the sidebar.
 */
const isPromptsNavVisible = (): Cypress.Chainable<boolean> =>
  appChrome.findSideBar().then(($sidebar) => $sidebar.find('a:contains("Prompts")').length > 0);

/**
 * Poll until the Prompts nav item appears in the sidebar.
 */
const waitForPromptsInSidebar = (): Cypress.Chainable<boolean> => {
  const { maxAttempts, pollIntervalMs, pageLoadWaitMs } = UI_POLL_CONFIG;
  const startTime = Date.now();

  const check = (attemptNumber = 1): Cypress.Chainable<boolean> => {
    cy.step(`Attempt ${attemptNumber}/${maxAttempts} - Checking for Prompts in sidebar...`);

    cy.visitWithLogin('/');

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    return cy.wait(pageLoadWaitMs).then(() =>
      isPromptsNavVisible().then((isVisible) => {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        if (isVisible) {
          cy.log(`Prompts nav item found in sidebar (after ${elapsedTime}s)`);
          return cy.wrap(true);
        }

        if (attemptNumber >= maxAttempts) {
          throw new Error(
            `Prompts nav item not found in sidebar after ${maxAttempts} attempts (${elapsedTime}s)`,
          );
        }

        cy.log(
          `Prompts not yet visible (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsedTime}s)`,
        );

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
      }),
    );
  };

  const totalTimeout = (maxAttempts * pollIntervalMs) / 1000;
  cy.log(`Polling for Prompts in sidebar (max ${totalTimeout}s)`);
  return check();
};

/**
 * Enable all features required for Prompt Management:
 * 1. Enable Gen AI features (LlamaStack operator, genAiStudio flag, sidebar)
 * 2. Set mlflowoperator to Managed and wait for it
 * 3. Create an MLflow CR and wait for it to be ready
 * 4. Wait for Prompts nav item in the sidebar
 */
export const enablePromptManagementFeatures = (): Cypress.Chainable<boolean> => {
  const namespace = getApplicationsNamespace();

  cy.step('Enable Gen AI features (required for Prompts nav)');
  return enableGenAiFeatures()
    .then(() => {
      cy.step('Set MLflow operator to Managed');
      return setMlflowOperatorState('Managed');
    })
    .then(() => {
      cy.step('Wait for MLflow operator to be ready');
      return waitForMlflowOperatorReady();
    })
    .then(() => {
      cy.step('Create MLflow CR');
      return ensureMlflowCR(namespace);
    })
    .then(() => {
      cy.step('Wait for MLflow CR to be ready');
      return waitForMlflowCRReady(namespace);
    })
    .then(() => {
      cy.step('Wait for Prompts nav item in sidebar');
      return waitForPromptsInSidebar();
    });
};

/**
 * Disable MLflow and Gen AI features.
 * Sets mlflowoperator to Removed and disables Gen AI features.
 */
export const disablePromptManagementFeatures = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();

  cy.step('Delete MLflow CR');
  return deleteMlflowCR(namespace)
    .then(() => {
      cy.step('Set MLflow operator to Removed');
      return setMlflowOperatorState('Removed');
    })
    .then(() => {
      cy.step('Disable Gen AI features');
      return disableGenAiFeatures();
    });
};
