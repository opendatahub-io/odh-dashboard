import { execWithOutput } from './baseCommands';
import { getModelRegistryNamespace } from './modelRegistry';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const UI_POLL_CONFIG = {
  maxAttempts: 10,
  pollIntervalMs: 5000,
  pageLoadWaitMs: 10000,
} as const;

/**
 * Helper to parse YAML using either yq or jq (with Python fallback).
 * Agents live under `agent_catalogs` in the ConfigMap (not `catalogs` like models).
 */
const getYamlParseCommand = (sourceId: string): string =>
  `
    if command -v yq >/dev/null 2>&1; then
      yq '.agent_catalogs[] | select(.id == "${sourceId}") | .enabled'
    else
      python3 -c 'import sys, yaml, json; json.dump(yaml.safe_load(sys.stdin), sys.stdout)' 2>/dev/null | jq -r '.agent_catalogs[] | select(.id == "${sourceId}") | .enabled // empty'
    fi
  `.trim();

/**
 * Helper to update YAML using either yq or Python.
 * Sets enabled=true for the matching agent_catalogs entry.
 */
const getYamlUpdateCommand = (sourceId: string): string =>
  `
    if command -v yq >/dev/null 2>&1; then
      yq '(.agent_catalogs[] | select(.id == "${sourceId}")).enabled = true'
    else
      python3 -c "
import sys, yaml, json
data = yaml.safe_load(sys.stdin)
for catalog in data.get('agent_catalogs', []):
    if catalog.get('id') == '${sourceId}':
        catalog['enabled'] = True
print(yaml.dump(data, default_flow_style=False), end='')
"
    fi
  `.trim();

/**
 * Verify that the model-catalog deployment exists and is available.
 * The agents catalog shares the model-catalog backend.
 */
export const verifyAgentsCatalogDeployment = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get deployment model-catalog -n ${namespace}`;
  cy.log(`Verifying model-catalog deployment for agents: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`model-catalog deployment not found in ${namespace}: ${maskedStderr}`);
    }
    cy.log(`✓ model-catalog deployment exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Verify that the model-catalog service exists.
 */
export const verifyAgentsCatalogService = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get service model-catalog -n ${namespace}`;
  cy.log(`Verifying model-catalog service for agents: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`model-catalog service not found in ${namespace}: ${maskedStderr}`);
    }
    cy.log(`✓ model-catalog service exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Verify that the default-catalog-sources ConfigMap contains the agents source entry
 * under the `agent_catalogs` section.
 */
export const verifyAgentsCatalogSourcesConfigMap = (
  sourceId: string,
): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const parseCmd = getYamlParseCommand(sourceId);
  const command = `oc get configmap default-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | ${parseCmd}`;
  cy.log(`Verifying agents source '${sourceId}' exists in agent_catalogs section`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`Failed to check agent_catalogs in default-catalog-sources: ${maskedStderr}`);
    }
    const value = result.stdout.trim();
    if (!value && value !== 'true' && value !== 'false') {
      throw new Error(
        `Agents source '${sourceId}' not found in agent_catalogs section of default-catalog-sources ConfigMap`,
      );
    }
    cy.log(`✓ Agents source '${sourceId}' found in agent_catalogs (enabled=${value})`);
    return cy.wrap(result);
  });
};

/**
 * Comprehensive verification of Agents Catalog backend resources.
 * Checks deployment, service, and ConfigMap with agents source entry.
 */
export const verifyAgentsCatalogBackend = (
  sourceId: string,
): Cypress.Chainable<CommandLineResult> => {
  cy.step('Verifying Agents Catalog backend resources');

  verifyAgentsCatalogDeployment();
  verifyAgentsCatalogService();
  return verifyAgentsCatalogSourcesConfigMap(sourceId);
};

/**
 * Verify the enabled status of a specific agents source in the catalog configmaps.
 * Polls until the expected value is found or max attempts is reached.
 */
export const verifyAgentsCatalogSourceEnabled = (
  sourceId: string,
  expectedEnabled: boolean,
  maxAttempts = 10,
  pollIntervalMs = 2000,
): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();
  const parseCmd = getYamlParseCommand(sourceId);
  const userCommand = `oc get configmap agent-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' 2>/dev/null | ${parseCmd}`;
  const defaultCommand = `oc get configmap default-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | ${parseCmd}`;

  cy.log(`Polling for source ${sourceId} enabled status to be ${expectedEnabled}`);

  const checkStatus = (attempt: number): void => {
    execWithOutput(userCommand, 30).then((userResult: CommandLineResult) => {
      const userValue = userResult.stdout.trim();

      if (userResult.exitCode === 0 && (userValue === 'true' || userValue === 'false')) {
        const actualEnabled = userValue === 'true';
        cy.log(
          `Attempt ${attempt}/${maxAttempts}: Source ${sourceId} enabled=${actualEnabled} (user configmap), expected=${expectedEnabled}`,
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

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(pollIntervalMs).then(() => checkStatus(attempt + 1));
        return;
      }

      execWithOutput(defaultCommand, 30).then((defaultResult: CommandLineResult) => {
        if (defaultResult.exitCode !== 0) {
          const maskedStderr = maskSensitiveInfo(defaultResult.stderr);
          throw new Error(`Failed to verify source enabled status: ${maskedStderr}`);
        }

        const defaultValue = defaultResult.stdout.trim();
        const actualEnabled = defaultValue === '' ? true : defaultValue === 'true';
        cy.log(
          `Attempt ${attempt}/${maxAttempts}: Source ${sourceId} enabled=${actualEnabled} (default configmap), expected=${expectedEnabled}`,
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

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(pollIntervalMs).then(() => checkStatus(attempt + 1));
      });
    });
  };

  return cy.then(() => checkStatus(1));
};

/**
 * Check if a specific agents catalog source is currently enabled.
 * Checks user-override agent-catalog-sources first, falls back to default-catalog-sources.
 */
export const isAgentsCatalogSourceEnabled = (sourceId: string): Cypress.Chainable<boolean> => {
  const namespace = getModelRegistryNamespace();
  const parseCmd = getYamlParseCommand(sourceId);
  const userCommand = `oc get configmap agent-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' 2>/dev/null | ${parseCmd}`;
  const defaultCommand = `oc get configmap default-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | ${parseCmd}`;

  return execWithOutput(userCommand, 30).then((userResult: CommandLineResult) => {
    const userValue = userResult.stdout.trim();
    if (userResult.exitCode === 0 && (userValue === 'true' || userValue === 'false')) {
      const enabled = userValue === 'true';
      cy.log(`Source ${sourceId} enabled=${enabled} (from agent-catalog-sources)`);
      return cy.wrap(enabled);
    }

    return execWithOutput(defaultCommand, 30).then((defaultResult: CommandLineResult) => {
      if (defaultResult.exitCode !== 0) {
        const maskedStderr = maskSensitiveInfo(defaultResult.stderr);
        cy.log(`ERROR: Failed to check source enabled status`);
        cy.log(`stderr: ${maskedStderr}`);
        return cy.wrap(false);
      }
      const defaultValue = defaultResult.stdout.trim();
      const enabled = defaultValue === '' ? true : defaultValue === 'true';
      cy.log(`Source ${sourceId} enabled=${enabled} (from default-catalog-sources)`);
      return cy.wrap(enabled);
    });
  });
};

/**
 * Enable a specific agents catalog source via oc command.
 * Updates the sources.yaml in the agent-catalog-sources ConfigMap.
 */
export const enableAgentsCatalogSource = (sourceId: string): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();

  cy.log(`Enabling agents catalog source: ${sourceId}`);

  const getCommand = `oc get configmap agent-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}'`;

  return cy.then(() => {
    execWithOutput(getCommand, 30).then((result: CommandLineResult) => {
      if (result.exitCode !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        throw new Error(`Failed to get agent-catalog-sources ConfigMap: ${maskedStderr}`);
      }

      const updateCmd = getYamlUpdateCommand(sourceId);
      const updateCommand = `
        YAML_CONTENT=$(oc get configmap agent-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}')
        UPDATED_YAML=$(echo "$YAML_CONTENT" | ${updateCmd})
        oc patch configmap agent-catalog-sources -n ${namespace} --type=merge -p "{\\"data\\":{\\"sources.yaml\\": $(echo "$UPDATED_YAML" | jq -Rs .)}}"
      `;

      execWithOutput(updateCommand, 60).then((patchResult: CommandLineResult) => {
        if (patchResult.exitCode !== 0) {
          const maskedStderr = maskSensitiveInfo(patchResult.stderr);
          cy.log(`stdout: ${patchResult.stdout}`);
          cy.log(`stderr: ${maskedStderr}`);
          throw new Error(`Failed to enable source ${sourceId}: ${maskedStderr}`);
        }
        cy.log(`✓ Successfully enabled source ${sourceId}`);
      });
    });
  });
};

/**
 * Ensure an agents catalog source is enabled. If not enabled, enables it via oc command.
 * Matches the model catalog pattern: check → enable if needed → verify.
 */
export const ensureAgentsCatalogSourceEnabled = (
  sourceId: string,
): Cypress.Chainable<undefined> => {
  cy.step(`Ensuring agents catalog source '${sourceId}' is enabled`);

  return cy.then(() => {
    isAgentsCatalogSourceEnabled(sourceId).then((isEnabled) => {
      if (isEnabled) {
        cy.log(`✓ Source ${sourceId} is already enabled, no action needed`);
      } else {
        cy.log(`Source ${sourceId} is not enabled, enabling it now...`);
        enableAgentsCatalogSource(sourceId).then(() => {
          verifyAgentsCatalogSourceEnabled(sourceId, true, 10, 2000);
        });
      }
    });
  });
};

/**
 * Poll until agents catalog cards are visible, reloading the page between attempts.
 */
export const waitForAgentsCatalogCards = (
  maxAttempts = UI_POLL_CONFIG.maxAttempts,
  pollIntervalMs = UI_POLL_CONFIG.pollIntervalMs,
): Cypress.Chainable<undefined> => {
  const startTime = Date.now();

  const checkForCards = (attempt: number): void => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(UI_POLL_CONFIG.pageLoadWaitMs);
    cy.get('body').then(($body) => {
      const cardCount = $body.find('[data-testid^="agent-catalog-card-"]').length;
      const hasEmptyState = $body.find('[data-testid="empty-agents-catalog-state"]').length > 0;

      cy.log(
        `Attempt ${attempt}/${maxAttempts}: cards=${cardCount}, emptyState=${hasEmptyState}, elapsed=${elapsedTime}s`,
      );

      if (cardCount > 0) {
        cy.log(`✅ Agents catalog cards are now visible (found ${cardCount} cards)`);
        return;
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `Agents catalog cards did not appear after ${maxAttempts} attempts (${elapsedTime}s)`,
        );
      }

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs);
      cy.reload();
      checkForCards(attempt + 1);
    });
  };

  cy.step(`Polling for agents catalog cards (max ${maxAttempts} attempts)`);
  return cy.then(() => checkForCards(1));
};
