import * as yaml from 'js-yaml';
import { execWithOutput } from './baseCommands';
import { getModelRegistryNamespace } from './modelRegistry';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const DEFAULT_CONFIGMAP = 'default-catalog-sources';
const USER_CONFIGMAP = 'mcp-catalog-sources';
const CONFIGMAP_KEY = 'sources.yaml';
const MCP_CATALOGS_KEY = 'mcp_catalogs';

interface McpCatalogEntry {
  id: string;
  name: string;
  type: string;
  enabled?: boolean;
  [key: string]: unknown;
}

interface SourcesYaml {
  [MCP_CATALOGS_KEY]?: McpCatalogEntry[];
  [key: string]: unknown;
}

/**
 * Read and parse the sources.yaml from a ConfigMap, extracting MCP catalog entries.
 */
const getMcpCatalogEntriesFromConfigMap = (
  configMapName: string,
): Cypress.Chainable<McpCatalogEntry[]> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get configmap ${configMapName} -n ${namespace} -o jsonpath='{.data.sources\\.yaml}'`;

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      return cy.wrap([] as McpCatalogEntry[]);
    }
    const parsed = yaml.load(result.stdout) as SourcesYaml;
    return cy.wrap(parsed[MCP_CATALOGS_KEY] ?? []);
  });
};

/**
 * Get all MCP catalog source IDs from the default ConfigMap.
 * Useful for dynamically discovering which sources are available on the cluster.
 */
export const getMcpCatalogSourceIds = (): Cypress.Chainable<string[]> =>
  getMcpCatalogEntriesFromConfigMap(DEFAULT_CONFIGMAP).then((entries) =>
    cy.wrap(entries.map((e) => e.id)),
  );

/**
 * Verify the enabled status of a specific MCP catalog source.
 * Checks user overrides first, then falls back to defaults.
 * Polls until the expected value is found.
 */
export const verifyMcpCatalogSourceEnabled = (
  sourceId: string,
  expectedEnabled: boolean,
  maxAttempts = 10,
  pollIntervalMs = 2000,
): Cypress.Chainable<undefined> => {
  cy.log(`Polling for MCP source '${sourceId}' enabled=${expectedEnabled}`);

  const checkStatus = (attempt: number): void => {
    getMcpCatalogEntriesFromConfigMap(USER_CONFIGMAP).then((userEntries) => {
      const userEntry = userEntries.find((e) => e.id === sourceId);

      if (userEntry && userEntry.enabled !== undefined) {
        const actualEnabled = userEntry.enabled;
        cy.log(
          `Attempt ${attempt}/${maxAttempts}: MCP source '${sourceId}' enabled=${actualEnabled} (user configmap), expected=${expectedEnabled}`,
        );

        if (actualEnabled === expectedEnabled) {
          cy.log(`✓ MCP source '${sourceId}' enabled status is ${expectedEnabled}`);
          return;
        }

        if (attempt >= maxAttempts) {
          throw new Error(
            `MCP source '${sourceId}' enabled status mismatch after ${maxAttempts} attempts: expected ${expectedEnabled}, got ${actualEnabled}`,
          );
        }

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(pollIntervalMs).then(() => checkStatus(attempt + 1));
        return;
      }

      getMcpCatalogEntriesFromConfigMap(DEFAULT_CONFIGMAP).then((defaultEntries) => {
        const defaultEntry = defaultEntries.find((e) => e.id === sourceId);
        const actualEnabled = defaultEntry ? defaultEntry.enabled !== false : undefined;

        cy.log(
          `Attempt ${attempt}/${maxAttempts}: MCP source '${sourceId}' enabled=${String(
            actualEnabled,
          )} (default configmap), expected=${expectedEnabled}`,
        );

        if (defaultEntry && actualEnabled === expectedEnabled) {
          cy.log(`✓ MCP source '${sourceId}' enabled status is ${expectedEnabled}`);
          return;
        }

        if (attempt >= maxAttempts) {
          throw new Error(
            `MCP source '${sourceId}' enabled status mismatch after ${maxAttempts} attempts: expected ${expectedEnabled}, got ${String(
              actualEnabled,
            )}`,
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
 * Enable an MCP catalog source by patching the user ConfigMap.
 * If the source has an override with enabled=false, updates it to true.
 * If there is no user override, creates one.
 */
export const enableMcpCatalogSource = (sourceId: string): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();

  cy.log(`Enabling MCP catalog source: ${sourceId}`);

  const getCommand = `oc get configmap ${USER_CONFIGMAP} -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' 2>/dev/null`;

  return cy.then(() => {
    execWithOutput(getCommand, 30).then((result: CommandLineResult) => {
      let parsed: SourcesYaml = {};
      if (result.exitCode === 0 && result.stdout.trim()) {
        const loaded = yaml.load(result.stdout) as SourcesYaml | null;
        if (loaded) {
          parsed = loaded;
        }
      }

      const catalogs = parsed[MCP_CATALOGS_KEY] ?? [];
      const existing = catalogs.find((e) => e.id === sourceId);

      if (existing) {
        existing.enabled = true;
      } else {
        catalogs.push({ id: sourceId, name: sourceId, type: 'yaml', enabled: true });
      }
      parsed[MCP_CATALOGS_KEY] = catalogs;

      const updatedYaml = yaml.dump(parsed);
      const escapedYaml = JSON.stringify(updatedYaml);
      const patchCommand = `oc patch configmap ${USER_CONFIGMAP} -n ${namespace} --type=merge -p '{"data":{"${CONFIGMAP_KEY}": ${escapedYaml}}}'`;

      execWithOutput(patchCommand, 60).then((patchResult: CommandLineResult) => {
        if (patchResult.exitCode !== 0) {
          const maskedStderr = maskSensitiveInfo(patchResult.stderr);
          throw new Error(`Failed to enable MCP source '${sourceId}': ${maskedStderr}`);
        }
        cy.log(`✓ Successfully enabled MCP source '${sourceId}'`);
      });
    });
  });
};

/**
 * Ensure the user ConfigMap exists. Creates it if missing.
 */
const ensureUserConfigMapExists = (): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();
  const checkCmd = `oc get configmap ${USER_CONFIGMAP} -n ${namespace} 2>/dev/null`;

  return cy.then(() => {
    execWithOutput(checkCmd, 30).then((result: CommandLineResult) => {
      if (result.exitCode !== 0) {
        cy.log(`User ConfigMap '${USER_CONFIGMAP}' not found, creating it`);
        const createCmd = `oc create configmap ${USER_CONFIGMAP} -n ${namespace} --from-literal=${CONFIGMAP_KEY}="${MCP_CATALOGS_KEY}: []"`;
        execWithOutput(createCmd, 30).then((createResult: CommandLineResult) => {
          if (createResult.exitCode !== 0) {
            const maskedStderr = maskSensitiveInfo(createResult.stderr);
            throw new Error(`Failed to create user ConfigMap: ${maskedStderr}`);
          }
          cy.log(`✓ Created user ConfigMap '${USER_CONFIGMAP}'`);
        });
      }
    });
  });
};

/**
 * Ensure all MCP catalog sources from the default ConfigMap are enabled.
 * Creates user overrides with enabled=true for any source that is disabled.
 */
export const ensureAllMcpCatalogSourcesEnabled = (): Cypress.Chainable<undefined> => {
  cy.step('Ensuring all MCP catalog sources are enabled');

  return cy.then(() => {
    ensureUserConfigMapExists().then(() => {
      getMcpCatalogSourceIds().then((sourceIds) => {
        if (sourceIds.length === 0) {
          cy.log('No MCP catalog sources found in default ConfigMap');
          return;
        }

        cy.log(`Found MCP catalog sources: ${sourceIds.join(', ')}`);
        sourceIds.forEach((sourceId) => {
          enableMcpCatalogSource(sourceId);
        });
      });
    });
  });
};

/**
 * Wait for MCP catalog cards to appear in the UI, reloading the page between attempts.
 */
export const waitForMcpCatalogCards = (
  maxAttempts = 10,
  pollIntervalMs = 5000,
): Cypress.Chainable<undefined> => {
  const startTime = Date.now();

  const checkForCards = (attempt: number): void => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    cy.get('body').then(($body) => {
      const cardCount = $body.find('[data-testid^="mcp-catalog-card-"]').length;

      cy.log(`Attempt ${attempt}/${maxAttempts}: MCP cards=${cardCount}, elapsed=${elapsedTime}s`);

      if (cardCount > 0) {
        cy.log(`✅ MCP catalog cards are now visible (found ${cardCount} cards)`);
        return;
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `MCP catalog cards did not appear after ${maxAttempts} attempts (${elapsedTime}s)`,
        );
      }

      cy.reload();
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs);
      checkForCards(attempt + 1);
    });
  };

  cy.step(`Polling for MCP catalog cards (max ${maxAttempts} attempts)`);
  return cy.then(() => checkForCards(1));
};

/**
 * Wait for MCP catalog to reflect disabled source — either fewer cards or empty state.
 */
export const waitForMcpCatalogAfterDisable = (
  previousCardCount: number,
  maxAttempts = 20,
  pollIntervalMs = 5000,
): Cypress.Chainable<undefined> => {
  const startTime = Date.now();

  const checkForChange = (attempt: number): void => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    cy.get('body').then(($body) => {
      const currentCardCount = $body.find('[data-testid^="mcp-catalog-card-"]').length;
      const hasEmptyState = $body.find('[data-testid="mcp-catalog-empty-state"]').length > 0;

      cy.log(
        `Attempt ${attempt}/${maxAttempts}: MCP cards=${currentCardCount} (was ${previousCardCount}), emptyState=${hasEmptyState}, elapsed=${elapsedTime}s`,
      );

      if (currentCardCount < previousCardCount || hasEmptyState) {
        cy.log(
          `✅ MCP catalog reflects disabled source (cards: ${previousCardCount} → ${currentCardCount})`,
        );
        return;
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `MCP catalog did not reflect disabled source after ${maxAttempts} attempts (${elapsedTime}s). Cards still at ${currentCardCount}`,
        );
      }

      cy.reload();
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs);
      checkForChange(attempt + 1);
    });
  };

  cy.step(`Polling for MCP catalog to reflect disabled source (max ${maxAttempts} attempts)`);
  return cy.then(() => checkForChange(1));
};
