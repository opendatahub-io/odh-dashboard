import { execWithOutput } from './baseCommands';
import { getModelRegistryNamespace } from './modelRegistry';
import type { CommandLineResult } from '../../types';

/**
 * Verify that the model-catalog-default-sources ConfigMap exists in the model registry namespace.
 * @returns A Cypress chainable that resolves with the command result.
 */
export const verifyModelCatalogSourcesConfigMap = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get configmap model-catalog-default-sources -n ${namespace}`;
  cy.log(`Verifying model-catalog-default-sources ConfigMap: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR: model-catalog-default-sources ConfigMap not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${result.stderr}`);
      throw new Error(
        `model-catalog-default-sources ConfigMap not found in ${namespace}: ${result.stderr}`,
      );
    }
    cy.log(`✓ model-catalog-default-sources ConfigMap exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Verify that the model-catalog deployment exists and is available in the model registry namespace.
 * @returns A Cypress chainable that resolves with the command result.
 */
export const verifyModelCatalogDeployment = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get deployment model-catalog -n ${namespace}`;
  cy.log(`Verifying model-catalog deployment: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR: model-catalog deployment not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${result.stderr}`);
      throw new Error(`model-catalog deployment not found in ${namespace}: ${result.stderr}`);
    }
    cy.log(`✓ model-catalog deployment exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Verify that the model-catalog service exists in the model registry namespace.
 * @returns A Cypress chainable that resolves with the command result.
 */
export const verifyModelCatalogService = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get service model-catalog -n ${namespace}`;
  cy.log(`Verifying model-catalog service: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR: model-catalog service not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${result.stderr}`);
      throw new Error(`model-catalog service not found in ${namespace}: ${result.stderr}`);
    }
    cy.log(`✓ model-catalog service exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Comprehensive verification of Model Catalog backend resources.
 * This checks deployment, ConfigMap, and service in the model registry namespace.
 * @returns A Cypress chainable that performs all verifications.
 */
export const verifyModelCatalogBackend = (): Cypress.Chainable<CommandLineResult> => {
  const modelRegistryNamespace = getModelRegistryNamespace();

  cy.step(`Verifying Model Catalog backend resources`);
  cy.log(`Model Registry namespace: ${modelRegistryNamespace}`);

  // Check deployment (most critical - the actual backend server)
  verifyModelCatalogDeployment();

  // Check required ConfigMap (contains model definitions)
  verifyModelCatalogSourcesConfigMap();

  // Check service (routes traffic to deployment)
  return verifyModelCatalogService();
};

/**
 * Verify the enabled status of a specific source in the catalog configmaps.
 * First checks model-catalog-sources (user overrides), then falls back to model-catalog-default-sources.
 * Polls until the expected value is found or max attempts is reached.
 * @param sourceId The ID of the source to check (e.g., 'redhat_ai')
 * @param expectedEnabled The expected enabled status (true or false)
 * @param maxAttempts Maximum number of polling attempts (default: 10)
 * @param pollIntervalMs Interval between attempts in milliseconds (default: 2000)
 * @returns A Cypress chainable that resolves when the verification is complete.
 */
export const verifyModelCatalogSourceEnabled = (
  sourceId: string,
  expectedEnabled: boolean,
  maxAttempts = 10,
  pollIntervalMs = 2000,
): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();
  // User changes are stored in model-catalog-sources, defaults in model-catalog-default-sources
  // Try user configmap first, fall back to default if source not found there
  const userCommand = `oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' 2>/dev/null | yq '.catalogs[] | select(.id == "${sourceId}") | .enabled'`;
  const defaultCommand = `oc get configmap model-catalog-default-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | yq '.catalogs[] | select(.id == "${sourceId}") | .enabled'`;

  cy.log(`Polling for source ${sourceId} enabled status to be ${expectedEnabled}`);

  const checkStatus = (attempt: number): void => {
    // First try user configmap
    execWithOutput(userCommand, 30).then((userResult: CommandLineResult) => {
      const userValue = userResult.stdout.trim();

      // If user configmap has a value for this source, use it
      if (userResult.code === 0 && (userValue === 'true' || userValue === 'false')) {
        const actualEnabled = userValue === 'true';
        cy.log(
          `Attempt ${attempt}/${maxAttempts}: Source ${sourceId} enabled=${actualEnabled} (from user configmap), expected=${expectedEnabled}`,
        );

        if (actualEnabled === expectedEnabled) {
          cy.log(`✓ Source ${sourceId} enabled status is ${expectedEnabled}`);
          return;
        }

        if (attempt >= maxAttempts) {
          throw new Error(
            `Source ${sourceId} enabled status mismatch after ${maxAttempts} attempts: expected ${expectedEnabled}, got ${actualEnabled}`,
          );
        }

        // Wait and retry
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(pollIntervalMs).then(() => checkStatus(attempt + 1));
        return;
      }

      // Fall back to default configmap
      execWithOutput(defaultCommand, 30).then((defaultResult: CommandLineResult) => {
        if (defaultResult.code !== 0) {
          cy.log(`ERROR: Failed to get source enabled status from both configmaps`);
          cy.log(`stderr: ${defaultResult.stderr}`);
          throw new Error(`Failed to verify source enabled status: ${defaultResult.stderr}`);
        }

        const defaultValue = defaultResult.stdout.trim();
        // Default sources have enabled=true if not explicitly set
        const actualEnabled = defaultValue === '' ? true : defaultValue === 'true';
        cy.log(
          `Attempt ${attempt}/${maxAttempts}: Source ${sourceId} enabled=${actualEnabled} (from default configmap), expected=${expectedEnabled}`,
        );

        if (actualEnabled === expectedEnabled) {
          cy.log(`✓ Source ${sourceId} enabled status is ${expectedEnabled}`);
          return;
        }

        if (attempt >= maxAttempts) {
          throw new Error(
            `Source ${sourceId} enabled status mismatch after ${maxAttempts} attempts: expected ${expectedEnabled}, got ${actualEnabled}`,
          );
        }

        // Wait and retry
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(pollIntervalMs).then(() => checkStatus(attempt + 1));
      });
    });
  };

  return cy.then(() => checkStatus(1));
};

/**
 * Check if a specific model catalog source is currently enabled.
 * Checks the model-catalog-default-sources ConfigMap for the source's enabled status.
 * @param sourceId The ID of the source to check (e.g., 'redhat_ai_models')
 * @returns A Cypress chainable that resolves with true if enabled, false otherwise.
 */
export const isModelCatalogSourceEnabled = (sourceId: string): Cypress.Chainable<boolean> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get configmap model-catalog-default-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | yq '.catalogs[] | select(.id == "${sourceId}") | .enabled'`;

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR: Failed to check source enabled status`);
      cy.log(`stderr: ${result.stderr}`);
      return cy.wrap(false);
    }
    const isEnabled = result.stdout.trim() === 'true';
    cy.log(`Source ${sourceId} is currently enabled: ${isEnabled}`);
    return cy.wrap(isEnabled);
  });
};

/**
 * Enable a specific model catalog source via oc command.
 * Updates the sources.yaml in the model-catalog-sources ConfigMap.
 * @param sourceId The ID of the source to enable (e.g., 'redhat_ai_models')
 * @returns A Cypress chainable that resolves when the source is enabled.
 */
export const enableModelCatalogSource = (sourceId: string): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();

  cy.log(`Enabling model catalog source: ${sourceId}`);

  // Get current ConfigMap, update the source, and apply it back
  const getCommand = `oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}'`;

  return cy.then(() => {
    execWithOutput(getCommand, 30).then((result: CommandLineResult) => {
      if (result.code !== 0) {
        throw new Error(`Failed to get model-catalog-sources ConfigMap: ${result.stderr}`);
      }

      // Use yq to update the enabled field and apply via oc patch
      const updateCommand = `
        YAML_CONTENT=$(oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}')
        UPDATED_YAML=$(echo "$YAML_CONTENT" | yq '(.catalogs[] | select(.id == "${sourceId}")).enabled = true')
        oc patch configmap model-catalog-sources -n ${namespace} --type=merge -p "{\\"data\\":{\\"sources.yaml\\": $(echo "$UPDATED_YAML" | jq -Rs .)}}"
      `;

      execWithOutput(updateCommand, 60).then((patchResult: CommandLineResult) => {
        if (patchResult.code !== 0) {
          cy.log(`stdout: ${patchResult.stdout}`);
          cy.log(`stderr: ${patchResult.stderr}`);
          throw new Error(`Failed to enable source ${sourceId}: ${patchResult.stderr}`);
        }
        cy.log(`✓ Successfully enabled source ${sourceId}`);
      });
    });
  });
};

/**
 * Ensure a model catalog source is enabled. If not enabled, enables it via oc command.
 * This is useful as a setup step in tests that require model catalog content.
 * @param sourceId The ID of the source to ensure is enabled (e.g., 'redhat_ai_models')
 * @returns A Cypress chainable that resolves when the source is confirmed enabled.
 */
export const ensureModelCatalogSourceEnabled = (sourceId: string): Cypress.Chainable<undefined> => {
  cy.step(`Ensuring model catalog source '${sourceId}' is enabled`);

  return cy.then(() => {
    isModelCatalogSourceEnabled(sourceId).then((isEnabled) => {
      if (isEnabled) {
        cy.log(`✓ Source ${sourceId} is already enabled, no action needed`);
      } else {
        cy.log(`Source ${sourceId} is not enabled, enabling it now...`);
        enableModelCatalogSource(sourceId).then(() => {
          // Verify the change took effect
          verifyModelCatalogSourceEnabled(sourceId, true, 10, 2000);
        });
      }
    });
  });
};
// polling and refresh is required until https://issues.redhat.com/browse/RHOAIENG-45098 is resolved
// UI polling configuration
const UI_POLL_CONFIG = {
  maxAttempts: 10,
  pollIntervalMs: 5000,
  pageLoadWaitMs: 10000,
} as const;

// polling and refresh is required until https://issues.redhat.com/browse/RHOAIENG-45098 is resolved
/**
 * Poll until model catalog cards are visible, reloading the page between attempts.
 * Useful after enabling a source to wait for the UI to reflect the change.
 * @param maxAttempts Maximum number of attempts (default: 10)
 * @param pollIntervalMs Interval between attempts in milliseconds (default: 5000)
 * @returns A Cypress chainable that resolves when cards are visible.
 */
export const waitForModelCatalogCards = (
  maxAttempts = UI_POLL_CONFIG.maxAttempts,
  pollIntervalMs = UI_POLL_CONFIG.pollIntervalMs,
): Cypress.Chainable<undefined> => {
  const startTime = Date.now();

  const checkForCards = (attempt: number): void => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Wait for the page content to stabilize after reload
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(UI_POLL_CONFIG.pageLoadWaitMs);
    cy.get('body').then(($body) => {
      const cardCount = $body.find('[data-testid="model-catalog-card"]').length;
      const hasEmptyState = $body.find('[data-testid="empty-model-catalog-state"]').length > 0;

      cy.log(
        `Attempt ${attempt}/${maxAttempts}: cards=${cardCount}, emptyState=${hasEmptyState}, elapsed=${elapsedTime}s`,
      );

      if (cardCount > 0) {
        cy.log(`✅ Model catalog cards are now visible (found ${cardCount} cards)`);
        return;
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `Model catalog cards did not appear after ${maxAttempts} attempts (${elapsedTime}s)`,
        );
      }

      // Reload and retry
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs);
      cy.reload();
      checkForCards(attempt + 1);
    });
  };

  cy.step(`Polling for model catalog cards (max ${maxAttempts} attempts)`);
  return cy.then(() => checkForCards(1));
};

/**
 * Poll until model catalog shows empty state, reloading the page between attempts.
 * Useful after disabling all sources to wait for the UI to reflect the change.
 * @param maxAttempts Maximum number of attempts (default: 20)
 * @param pollIntervalMs Interval between attempts in milliseconds (default: 5000)
 * @returns A Cypress chainable that resolves when empty state is visible.
 */
export const waitForModelCatalogEmptyState = (
  maxAttempts = 20,
  pollIntervalMs = UI_POLL_CONFIG.pollIntervalMs,
): Cypress.Chainable<undefined> => {
  const startTime = Date.now();

  const checkForEmptyState = (attempt: number): void => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Wait for the page content to stabilize after reload
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(UI_POLL_CONFIG.pageLoadWaitMs);
    cy.get('body').then(($body) => {
      const hasEmptyState = $body.find('[data-testid="empty-model-catalog-state"]').length > 0;
      const hasCards = $body.find('[data-testid="model-catalog-card"]').length > 0;

      cy.log(
        `Attempt ${attempt}/${maxAttempts}: emptyState=${hasEmptyState}, hasCards=${hasCards}, elapsed=${elapsedTime}s`,
      );

      if (hasEmptyState && !hasCards) {
        cy.log(`✅ Model catalog empty state is now visible (after ${elapsedTime}s)`);
        return;
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `Model catalog empty state did not appear after ${maxAttempts} attempts (${elapsedTime}s)`,
        );
      }

      // Reload and retry
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs);
      cy.reload();
      checkForEmptyState(attempt + 1);
    });
  };

  cy.step(`Polling for model catalog empty state (max ${maxAttempts} attempts)`);
  return cy.then(() => checkForEmptyState(1));
};
