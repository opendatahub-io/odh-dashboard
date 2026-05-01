import { pollUntilSuccess, waitForNamespace } from './baseCommands';
import { waitForLlamaStackOperatorReady } from './llamaStackDistribution';
import { appChrome } from '../../pages/appChrome';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

// Resource identifiers
const DSC_RESOURCE = 'datasciencecluster default-dsc';
const DASHBOARD_CONFIG = 'odhdashboardconfig odh-dashboard-config';

// Polling configuration for UI visibility (slower, requires page reload)
const UI_POLL_CONFIG = {
  maxAttempts: 20,
  pollIntervalMs: 5000,
} as const;

/**
 * Get the applications namespace from Cypress environment.
 * @throws Error if APPLICATIONS_NAMESPACE is not configured.
 */
const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return namespace;
};

/**
 * Build an oc patch command with JSON merge strategy.
 */
const buildPatchCommand = (resource: string, patchJson: object, namespace?: string): string => {
  const namespaceFlag = namespace ? ` -n ${namespace}` : '';
  return `oc patch ${resource}${namespaceFlag} --type=merge -p '${JSON.stringify(patchJson)}'`;
};

/**
 * Set the LlamaStack operator management state.
 */
const setLlamaStackState = (state: 'Managed' | 'Removed'): Cypress.Chainable<CommandLineResult> => {
  const patchSpec = { spec: { components: { llamastackoperator: { managementState: state } } } };
  return cy.exec(buildPatchCommand(DSC_RESOURCE, patchSpec)).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`Failed to set LlamaStack state to ${state}: ${maskedStderr}`);
    }
    return result;
  });
};

/**
 * Set the Gen AI Studio enabled/disabled state in the dashboard config.
 */
const setGenAiStudioEnabled = (
  enabled: boolean,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const patchSpec = { spec: { dashboardConfig: { genAiStudio: enabled } } };
  return cy.exec(buildPatchCommand(DASHBOARD_CONFIG, patchSpec, namespace)).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`Failed to set Gen AI Studio enabled to ${enabled}: ${maskedStderr}`);
    }
    return result;
  });
};

/**
 * Poll until the genAiStudio feature flag is true in the dashboard config.
 * Uses jq -e to check the flag value and exit with appropriate code.
 *
 * @returns A Cypress chainable that resolves when the flag is true.
 */
const waitForGenAiStudioFeatureFlag = (): Cypress.Chainable<Cypress.Exec> => {
  const checkFlagCommand = `oc get OdhDashboardConfig -A -o json | jq -e '.items[].spec.dashboardConfig.genAiStudio == true'`;
  return pollUntilSuccess(checkFlagCommand, 'genAiStudio feature flag to be true', {
    maxAttempts: 30,
    pollIntervalMs: 2000,
  });
};

/**
 * Retry-aware check for an element inside the sidebar.
 * See `findNavItemInSidebar` in mlflow.ts for rationale.
 *
 * After `dashboard-page-main` appears, extension nav items can render asynchronously.
 * Poll the live `#page-sidebar` DOM (not only the initial command subject) until the
 * selector matches or the settle window elapses.
 *
 * The inner poll can run up to `NAV_ITEM_SETTLE_MS`; `.then()` must use a longer timeout
 * than `defaultCommandTimeout` (10s) or Cypress aborts while the Promise is still pending.
 */
const SIDEBAR_SETTLE_TIMEOUT = 30000;
const NAV_ITEM_SETTLE_MS = 15000;
const NAV_ITEM_POLL_MS = 500;
const NAV_ITEM_FIND_TIMEOUT_MS = NAV_ITEM_SETTLE_MS + 5000;

const findInSidebar = (selector: string): Cypress.Chainable<boolean> =>
  appChrome.findSideBar().then(
    { timeout: NAV_ITEM_FIND_TIMEOUT_MS },
    () =>
      new Cypress.Promise<boolean>((resolve) => {
        const deadline = Date.now() + NAV_ITEM_SETTLE_MS;
        const poll = () => {
          const $sidebar = Cypress.$('#page-sidebar');
          if ($sidebar.length > 0 && $sidebar.find(selector).length > 0) {
            resolve(true);
          } else if (Date.now() >= deadline) {
            resolve(false);
          } else {
            setTimeout(poll, NAV_ITEM_POLL_MS);
          }
        };
        poll();
      }),
  );

const waitForGenAiStudioInSidebar = (): Cypress.Chainable<boolean> => {
  const { maxAttempts, pollIntervalMs } = UI_POLL_CONFIG;
  const startTime = Date.now();

  const checkForSection = (attemptNumber = 1): Cypress.Chainable<boolean> => {
    cy.step(`Attempt ${attemptNumber}/${maxAttempts} - Checking for Gen AI studio in sidebar...`);

    if (attemptNumber === 1) {
      cy.visitWithLogin('/');
    } else {
      cy.reload();
    }

    cy.get('[data-testid="dashboard-page-main"]', { timeout: SIDEBAR_SETTLE_TIMEOUT });

    return findInSidebar('button:contains("Gen AI studio")').then((isVisible) => {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (isVisible) {
        cy.log(`Gen AI studio section found in sidebar (after ${elapsedTime}s)`);
        return cy.wrap(true);
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(
          `Gen AI studio section not found in sidebar after ${maxAttempts} attempts (${elapsedTime}s)`,
        );
      }

      cy.log(
        `Gen AI studio not yet visible (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsedTime}s)`,
      );

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => checkForSection(attemptNumber + 1));
    });
  };

  const totalTimeout = (maxAttempts * pollIntervalMs) / 1000;
  cy.log(`Polling for Gen AI studio in sidebar (max ${totalTimeout}s)`);
  return checkForSection();
};

/**
 * Enable Gen AI backend resources without waiting for sidebar visibility.
 * Sets LlamaStack operator to Managed, waits for readiness, namespace,
 * enables Gen AI Studio flag, and polls for the feature flag.
 *
 * Useful for composition when a caller will perform its own sidebar check.
 */
export const enableGenAiBackend = (): Cypress.Chainable<Cypress.Exec> => {
  const namespace = getApplicationsNamespace();

  cy.step('Set LlamaStack to Managed');
  return setLlamaStackState('Managed')
    .then(() => {
      cy.step('Wait for LlamaStack operator to be ready');
      return waitForLlamaStackOperatorReady();
    })
    .then(() => {
      cy.step(`Wait for namespace ${namespace} to be created`);
      return waitForNamespace(namespace);
    })
    .then(() => {
      cy.step('Enable Gen AI Studio');
      return setGenAiStudioEnabled(true, namespace);
    })
    .then(() => {
      cy.step('Wait for genAiStudio feature flag to be set');
      return waitForGenAiStudioFeatureFlag();
    });
};

/**
 * Poll until the DSC status reports llamastackoperator as Managed.
 * The dashboard frontend reads DSC status to evaluate the plugin-gen-ai area flag.
 */
const waitForDSCLlamaStackManaged = (): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get ${DSC_RESOURCE} -o json | jq -e '.status.components.llamastackoperator.managementState == "Managed"'`,
    'DSC status to reflect llamastackoperator as Managed',
    { maxAttempts: 60, pollIntervalMs: 5000 },
  );

/**
 * Enable Gen AI features by patching the DataScienceCluster and ODHDashboardConfig resources.
 * Sets LlamaStack operator to Managed, waits for the operator to be ready,
 * waits for the namespace, enables Gen AI Studio, polls for the feature flag,
 * verifies DSC status, and finally polls until it appears in the sidebar.
 *
 * @returns A Cypress chainable that resolves when Gen AI Studio is visible in the sidebar.
 */
export const enableGenAiFeatures = (): Cypress.Chainable<boolean> => {
  return enableGenAiBackend()
    .then(() => {
      cy.step('Verify DSC status reflects llamastackoperator as Managed');
      return waitForDSCLlamaStackManaged();
    })
    .then(() => {
      cy.step('Wait for Gen AI Studio to appear in sidebar');
      return waitForGenAiStudioInSidebar();
    });
};

/**
 * Disable Gen AI features by patching the DataScienceCluster and ODHDashboardConfig resources.
 * Sets LlamaStack operator to Removed and disables Gen AI Studio and Model as Service.
 *
 * @returns A Cypress chainable that resolves when both patches are applied successfully.
 */
export const disableGenAiFeatures = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();

  cy.step('Set LlamaStack to Removed');
  return setLlamaStackState('Removed').then(() => {
    cy.step('Disable Gen AI Studio');
    return setGenAiStudioEnabled(false, namespace);
  });
};

/**
 * Cleanup serving runtime template by ServingRuntime name.
 * Searches for templates containing a ServingRuntime with the given name.
 *
 * @param servingRuntimeName - The ServingRuntime metadata.name to search for inside templates.
 * @returns A Cypress chainable that resolves when cleanup is complete.
 */
export const cleanupServingRuntimeTemplate = (
  servingRuntimeName: string,
): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();

  const jqFilter = `.items[] | select(.objects[]? | select(.kind == "ServingRuntime" and .metadata.name == "${servingRuntimeName}")) | .metadata.name`;
  const findCommand = `oc get templates -ojson -n ${namespace} | jq -r '${jqFilter}'`;

  cy.log(`Searching for template with ServingRuntime: ${servingRuntimeName}`);

  return cy.exec(findCommand, { failOnNonZeroExit: false }).then((result) => {
    const templateName = result.stdout.trim();

    if (templateName) {
      cy.log(`Template found: ${templateName}. Proceeding to delete.`);
      return cy.exec(`oc delete template ${templateName} -n ${namespace}`, {
        failOnNonZeroExit: false,
      });
    }

    cy.log('No matching serving runtime template found.');
    return cy.wrap(result);
  });
};
