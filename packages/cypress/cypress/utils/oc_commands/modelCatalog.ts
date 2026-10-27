import * as yaml from 'js-yaml';
import { execWithOutput } from './baseCommands';
import { getModelRegistryNamespace } from './modelRegistry';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

/**
 * Normalize the legacy empty catalog representation before parsing.
 * Some older test runs appended block entries after `catalogs: []`, which is invalid YAML.
 */
const normalizeCatalogSourcesYaml = (yamlContent: string): string =>
  yamlContent.replace(/^(\s*catalogs:\s*)\[\]\s*$/m, '$1');

/**
 * Helper to parse YAML using awk — no yq, jq, or Python required.
 * Returns a command that reads YAML from stdin and reports the enabled state for a catalog ID.
 * The command prints `default` when the source exists without an explicit enabled field, and
 * `missing` when the source does not exist.
 *
 * @param sourceId The catalog source ID to query
 * @returns A command string that can be piped to
 */
const getYamlParseCommand = (sourceId: string): string => {
  // Use awk to extract the enabled field — no yq, jq, or Python required.
  // Handles both field orderings within a catalog entry:
  //   - enabled: true/false     (UI-written order)
  //     id: <sourceId>
  // and:
  //   - id: <sourceId>          (default configmap order)
  //     enabled: true/false
  // Scans each entry block and distinguishes a missing source from an enabled-by-default source.
  return `awk -v target="${sourceId}" '
/^[[:space:]]*-[[:space:]]/{
  if(in_entry && id_val==target){print (enabled_val=="" ? "default" : enabled_val); found=1; exit}
  in_entry=1; enabled_val=""; id_val=""
}
in_entry && /id:/{sub(/.*id:[[:space:]]*/,""); id_val=$0}
in_entry && /enabled:/{sub(/.*enabled:[[:space:]]*/,""); enabled_val=$0}
END{
  if(!found && in_entry && id_val==target){print (enabled_val=="" ? "default" : enabled_val); found=1}
  if(!found){print "missing"}
}
'`;
};

/**
 * Helper to update YAML using awk — no yq, jq, or Python required.
 * Returns a command that reads YAML from stdin, enables the given source, and outputs the
 * modified YAML. If the source only exists in the default ConfigMap, appends a user override.
 *
 * @param sourceId The catalog source ID to update
 * @returns A command string that can be used in a pipeline
 */
const getYamlUpdateCommand = (sourceId: string): string => {
  // Use awk to set enabled=true for the matching source — no yq or Python required.
  // Buffers each catalog entry, identifies it by id, then patches or adds the enabled field
  // before flushing. Appends a minimal user override when no matching entry exists.
  return `awk -v target="${sourceId}" '
/^[[:space:]]*-[[:space:]]/{flush_buf();buflen=0;delete buf;in_entry=1;entry_id=""}
in_entry{buflen++;buf[buflen]=$0;if(/id:/){tmp=$0;sub(/.*id:[[:space:]]*/,"",tmp);entry_id=tmp}next}
/^[[:space:]]*catalogs:[[:space:]]*/ && index($0, "[]") > 0 {sub(/[][[:space:]]*$/, "")}
{flush_buf();print}
END{flush_buf();if(!found){print "  - id: " target;print "    enabled: true"}}
function flush_buf(  i,line,is_target,has_enabled){
  if(buflen==0){return}
  is_target=(entry_id==target)
  if(is_target){found=1;for(i=1;i<=buflen;i++){if(buf[i]~/enabled:/){has_enabled=1}}}
  for(i=1;i<=buflen;i++){
    line=buf[i]
    if(is_target&&line~/enabled:/){sub(/enabled:[[:space:]]*[^[:space:]]*/,"enabled: true",line)}
    print line
  }
  if(is_target&&!has_enabled){print "    enabled: true"}
  buflen=0;delete buf;entry_id=""
}
'`;
};

/**
 * Verify that the default-catalog-sources ConfigMap exists in the model registry namespace.
 * @returns A Cypress chainable that resolves with the command result.
 */
export const verifyModelCatalogSourcesConfigMap = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get configmap default-catalog-sources -n ${namespace}`;
  cy.log(`Verifying default-catalog-sources ConfigMap: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      cy.log(`ERROR: default-catalog-sources ConfigMap not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${maskedStderr}`);
      throw new Error(
        `default-catalog-sources ConfigMap not found in ${namespace}: ${maskedStderr}`,
      );
    }
    cy.log(`✓ default-catalog-sources ConfigMap exists in ${namespace}`);
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
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      cy.log(`ERROR: model-catalog deployment not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${maskedStderr}`);
      throw new Error(`model-catalog deployment not found in ${namespace}: ${maskedStderr}`);
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
    if (result.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      cy.log(`ERROR: model-catalog service not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${maskedStderr}`);
      throw new Error(`model-catalog service not found in ${namespace}: ${maskedStderr}`);
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
 * First checks model-catalog-sources (user overrides), then falls back to default-catalog-sources.
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
  const parseCmd = getYamlParseCommand(sourceId);
  // User changes are stored in model-catalog-sources, defaults in default-catalog-sources
  // Try user configmap first, fall back to default if source not found there
  const userCommand = `oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' 2>/dev/null | ${parseCmd}`;
  const defaultCommand = `oc get configmap default-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | ${parseCmd}`;

  cy.log(`Polling for source ${sourceId} enabled status to be ${expectedEnabled}`);

  const checkStatus = (attempt: number): void => {
    // First try user configmap
    execWithOutput(userCommand, 30).then((userResult: CommandLineResult) => {
      const userValue = userResult.stdout.trim();

      // If user configmap has a value for this source, use it
      if (userResult.exitCode === 0 && userValue !== 'missing') {
        const actualEnabled = userValue !== 'false';
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
        if (defaultResult.exitCode !== 0) {
          const maskedStderr = maskSensitiveInfo(defaultResult.stderr);
          cy.log(`ERROR: Failed to get source enabled status from both configmaps`);
          cy.log(`stderr: ${maskedStderr}`);
          throw new Error(`Failed to verify source enabled status: ${maskedStderr}`);
        }

        const defaultValue = defaultResult.stdout.trim();
        if (defaultValue === 'missing') {
          throw new Error(`Model catalog source ${sourceId} was not found in either configmap`);
        }
        // Default sources have enabled=true if not explicitly set
        const actualEnabled = defaultValue !== 'false';
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
 * Checks model-catalog-sources for a user override before falling back to
 * default-catalog-sources for the source's enabled status.
 * @param sourceId The ID of the source to check (e.g., 'redhat_ai_validated_models')
 * @returns A Cypress chainable that resolves with true if enabled, false otherwise.
 */
export const isModelCatalogSourceEnabled = (sourceId: string): Cypress.Chainable<boolean> => {
  const namespace = getModelRegistryNamespace();
  const parseCmd = getYamlParseCommand(sourceId);
  const userCommand = `oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' 2>/dev/null | ${parseCmd}`;
  const defaultCommand = `oc get configmap default-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | ${parseCmd}`;

  return execWithOutput(userCommand, 30).then((userResult: CommandLineResult) => {
    if (userResult.exitCode !== 0) {
      const maskedStderr = maskSensitiveInfo(userResult.stderr);
      cy.log(`ERROR: Failed to check source enabled status`);
      cy.log(`stderr: ${maskedStderr}`);
      return cy.wrap(false);
    }

    const userStatus = userResult.stdout.trim();
    if (userStatus !== 'missing' && userStatus !== 'default') {
      const isEnabled = userStatus !== 'false';
      cy.log(`Source ${sourceId} is currently enabled: ${isEnabled} (from user configmap)`);
      return cy.wrap(isEnabled);
    }

    return execWithOutput(defaultCommand, 30).then((defaultResult: CommandLineResult) => {
      if (defaultResult.exitCode !== 0) {
        const maskedStderr = maskSensitiveInfo(defaultResult.stderr);
        cy.log(`ERROR: Failed to check source enabled status`);
        cy.log(`stderr: ${maskedStderr}`);
        return cy.wrap(false);
      }

      const defaultStatus = defaultResult.stdout.trim();
      const isEnabled = defaultStatus !== 'missing' && defaultStatus !== 'false';
      cy.log(`Source ${sourceId} is currently enabled: ${isEnabled} (from default configmap)`);
      return cy.wrap(isEnabled);
    });
  });
};

/**
 * Enable a specific model catalog source via oc command.
 * Updates the sources.yaml in the model-catalog-sources ConfigMap.
 * @param sourceId The ID of the source to enable (e.g., 'redhat_ai_validated_models')
 * @returns A Cypress chainable that resolves when the source is enabled.
 */
export const enableModelCatalogSource = (sourceId: string): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();
  const parseCmd = getYamlParseCommand(sourceId);

  cy.log(`Enabling model catalog source: ${sourceId}`);

  // Get current ConfigMap, update the source, and apply it back
  const getCommand = `oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}'`;
  const verifySourceExistsCommand = `
    USER_STATUS=$(oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' 2>/dev/null | ${parseCmd})
    DEFAULT_STATUS=$(oc get configmap default-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}' | ${parseCmd})
    if [ -z "$USER_STATUS" ] || [ -z "$DEFAULT_STATUS" ]; then
      echo "Failed to parse model catalog source ${sourceId}" >&2
      exit 1
    fi
    if [ "$USER_STATUS" = "missing" ] && [ "$DEFAULT_STATUS" = "missing" ]; then
      echo "Model catalog source ${sourceId} was not found in either configmap" >&2
      exit 1
    fi
  `;

  return cy.then(() => {
    execWithOutput(verifySourceExistsCommand, 30).then((sourceResult: CommandLineResult) => {
      if (sourceResult.exitCode !== 0) {
        throw new Error(maskSensitiveInfo(sourceResult.stderr));
      }

      execWithOutput(getCommand, 30).then((result: CommandLineResult) => {
        if (result.exitCode !== 0) {
          const maskedStderr = maskSensitiveInfo(result.stderr);
          throw new Error(`Failed to get model-catalog-sources ConfigMap: ${maskedStderr}`);
        }

        const updateCmd = getYamlUpdateCommand(sourceId);
        // Use yq/Python to update the enabled field and apply via oc patch
        const updateCommand = `
          YAML_CONTENT=$(oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}')
          UPDATED_YAML=$(echo "$YAML_CONTENT" | ${updateCmd})
          oc patch configmap model-catalog-sources -n ${namespace} --type=merge -p "{\\"data\\":{\\"sources.yaml\\": $(echo "$UPDATED_YAML" | jq -Rs .)}}"
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
  });
};

/**
 * Ensure a model catalog source is enabled. If not enabled, enables it via oc command.
 * This is useful as a setup step in tests that require model catalog content.
 * @param sourceId The ID of the source to ensure is enabled (e.g., 'redhat_ai_validated_models')
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
/**
 * Delete a user-created Hugging Face catalog source via oc commands.
 * Removes the source entry from the model-catalog-sources ConfigMap and deletes
 * the associated API key secret (catalog-{sourceId}-apikey).
 * Uses --ignore-not-found so cleanup is idempotent and safe to call even if
 * the source was never fully created.
 *
 * YAML filtering is done in TypeScript via js-yaml (same pattern as
 * hasOtherEnabledCatalogSources) to avoid fragile shell awk/sed scripts.
 *
 * @param sourceId The source ID (underscored) as stored in the ConfigMap, e.g. 'e2e_hf_rh_ai_hub_abc123'
 * @returns A Cypress chainable that resolves when cleanup is complete.
 */
export const deleteHuggingFaceCatalogSource = (sourceId: string): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();
  const secretName = `catalog-${sourceId.replace(/_/g, '-')}-apikey`;

  cy.log(`Cleaning up HF catalog source: ${sourceId}`);

  return cy.then(() => {
    cy.exec(`oc delete secret ${secretName} -n ${namespace} --ignore-not-found`, {
      failOnNonZeroExit: false,
      timeout: 30000,
    }).then((result: CommandLineResult) => {
      if (result.exitCode === 0) {
        cy.log(`✓ Deleted secret ${secretName}`);
      } else {
        cy.log(
          `⚠️ Secret deletion returned exit ${result.exitCode}: ${maskSensitiveInfo(
            result.stderr,
          )}`,
        );
      }
    });

    const getCmd = `oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}'`;
    execWithOutput(getCmd, 30).then((getResult: CommandLineResult) => {
      if (getResult.exitCode !== 0 || !getResult.stdout.trim()) {
        cy.log('⚠️ model-catalog-sources ConfigMap not found or empty — skipping');
        return;
      }

      const normalizedYaml = normalizeCatalogSourcesYaml(getResult.stdout);
      const parsed = yaml.load(normalizedYaml) as {
        catalogs?: Array<{ id?: string }>;
      };
      if (!parsed.catalogs) {
        cy.log('⚠️ No catalogs array in ConfigMap — skipping');
        return;
      }

      const before = parsed.catalogs.length;
      parsed.catalogs = parsed.catalogs.filter((c) => c.id !== sourceId);
      if (parsed.catalogs.length === before) {
        cy.log(`Source ${sourceId} not found in ConfigMap — nothing to remove`);
        return;
      }

      const updatedYaml = yaml.dump(parsed, { lineWidth: -1 });
      const escapedYaml = JSON.stringify(updatedYaml);
      const patchCmd = `oc patch configmap model-catalog-sources -n ${namespace} --type=merge -p '{"data":{"sources.yaml": ${escapedYaml}}}'`;

      execWithOutput(patchCmd, 30).then((patchResult: CommandLineResult) => {
        if (patchResult.exitCode === 0) {
          cy.log(`✓ Removed source ${sourceId} from model-catalog-sources ConfigMap`);
        } else {
          cy.log(
            `⚠️ ConfigMap patch returned exit ${patchResult.exitCode}: ${maskSensitiveInfo(
              patchResult.stderr,
            )}`,
          );
        }
      });
    });
  });
};

/**
 * Detect which namespace contains the model-catalog deployment.
 * Searches across all namespaces and returns the first match.
 * @returns A Cypress chainable that resolves with the namespace name, or null if not found.
 */
export const detectModelCatalogNamespace = (): Cypress.Chainable<string | null> => {
  Cypress.log({
    name: 'detectModelCatalogNamespace',
    message: 'Detecting deployment namespace...',
  });
  return cy
    .exec(
      'oc get deployments --all-namespaces -o json | jq -r \'.items[] | select(.metadata.name=="model-catalog") | .metadata.namespace\' | head -n1',
      {
        failOnNonZeroExit: false,
      },
    )
    .then((result: Cypress.Exec) => {
      const foundNamespace = result.stdout.trim();
      if (!foundNamespace || result.stderr) {
        Cypress.log({
          name: 'detectModelCatalogNamespace',
          message: 'model-catalog deployment not found in any namespace',
        });
      } else {
        Cypress.log({
          name: 'detectModelCatalogNamespace',
          message: `✓ Found in namespace: ${foundNamespace}`,
        });
      }
      return cy.wrap(!foundNamespace || result.stderr ? null : foundNamespace);
    });
};

/**
 * Wait for the model-catalog deployment to become Available.
 * The BFF resolves the model-catalog Kubernetes Service on every catalog API request,
 * so if the deployment is not ready all catalog endpoints return 404.
 * Throws an error (fails the test) if the deployment has no ready replicas within 120s.
 * @returns A Cypress chainable that resolves when the deployment is Available.
 */
export const waitForModelCatalogDeployment = (): Cypress.Chainable<undefined> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc wait --for=jsonpath='{.status.readyReplicas}'=1 deployment/model-catalog -n ${namespace} --timeout=120s`;

  cy.log(`Waiting for model-catalog deployment to have a ready pod in namespace ${namespace}...`);
  return cy.then(() => {
    cy.exec(command, { failOnNonZeroExit: false, timeout: 120000 }).then(
      (result: CommandLineResult) => {
        if (result.stdout) {
          cy.log(`model-catalog deployment wait result: ${result.stdout}`);
        }
        if (result.stderr) {
          const maskedStderr = maskSensitiveInfo(result.stderr);
          cy.log(`model-catalog deployment wait stderr: ${maskedStderr}`);
        }
        if (result.exitCode !== 0) {
          throw new Error(
            `model-catalog deployment has no ready replicas after 120s. The catalog backend must have at least 1 ready pod before running performance filter tests. stderr: ${maskSensitiveInfo(
              result.stderr,
            )}`,
          );
        }
        cy.log(`✓ model-catalog deployment has a ready pod in namespace ${namespace}`);
      },
    );
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
 * Check whether any catalog sources other than the specified ones are enabled.
 * Reads the model-catalog-sources (user overrides) ConfigMap, falling back to
 * model-catalog-default-sources. Parses YAML in TypeScript via js-yaml so there
 * is no dependency on yq, python3 or jq being available in CI.
 * Sources without an explicit `.enabled` field are treated as enabled by default.
 * @param excludeSourceIds Source IDs to exclude from the check
 * @returns A Cypress chainable that resolves with true if at least one other source is enabled.
 */
export const hasOtherEnabledCatalogSources = (
  excludeSourceIds: string[],
): Cypress.Chainable<boolean> => {
  const namespace = getModelRegistryNamespace();

  const parseAndCount = (yamlContent: string): boolean => {
    const normalizedYaml = normalizeCatalogSourcesYaml(yamlContent);
    const parsed = yaml.load(normalizedYaml) as {
      catalogs?: Array<{ id: string; enabled?: boolean }> | null;
    };
    const otherEnabled = (parsed.catalogs ?? []).filter(
      (c) => c.enabled !== false && !excludeSourceIds.includes(c.id),
    );
    cy.log(`Other enabled sources found: ${otherEnabled.length}`);
    return otherEnabled.length > 0;
  };

  const userCmd = `oc get configmap model-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}'`;
  const defaultCmd = `oc get configmap default-catalog-sources -n ${namespace} -o jsonpath='{.data.sources\\.yaml}'`;

  return execWithOutput(userCmd, 30).then((userResult: CommandLineResult) => {
    if (userResult.exitCode === 0 && userResult.stdout.trim()) {
      return cy.wrap(parseAndCount(userResult.stdout));
    }
    return execWithOutput(defaultCmd, 30).then((defaultResult: CommandLineResult) => {
      if (defaultResult.exitCode !== 0 || !defaultResult.stdout.trim()) {
        const maskedStderr = maskSensitiveInfo(
          [userResult.stderr, defaultResult.stderr].filter(Boolean).join('\n'),
        );
        throw new Error(`Failed to read catalog sources configmaps: ${maskedStderr}`);
      }
      return cy.wrap(parseAndCount(defaultResult.stdout));
    });
  });
};

/**
 * Poll until the model catalog UI has stabilized after disabling sources.
 * If other sources are still enabled, waits for cards to be present (no empty state).
 * If no other sources remain, waits for the empty state to appear.
 * @param disabledSourceIds The source IDs that were just disabled
 * @returns A Cypress chainable that resolves when the UI has stabilized.
 */
export const waitForModelCatalogAfterDisable = (
  disabledSourceIds: string[],
): Cypress.Chainable<undefined> =>
  hasOtherEnabledCatalogSources(disabledSourceIds).then((hasOthers) => {
    if (hasOthers) {
      cy.step('Other catalog sources are enabled — waiting for catalog cards');
      return waitForModelCatalogCards();
    }
    cy.step('No other catalog sources — waiting for empty state');
    return waitForModelCatalogEmptyState();
  });

/**
 * Poll until at least one model catalog card with validated performance data is visible,
 * reloading the page between attempts.
 * Required after enabling the performance view toggle on a fresh RHOAI install, where
 * the model-catalog pod may be ready but the BFF has not yet served validated model metrics.
 * @param maxAttempts Maximum number of attempts (default: 10)
 * @param pollIntervalMs Interval between attempts in milliseconds (default: 5000)
 * @returns A Cypress chainable that resolves when at least one validated model card is visible.
 */
export const waitForValidatedModelCards = (
  maxAttempts = UI_POLL_CONFIG.maxAttempts,
  pollIntervalMs = 10000,
): Cypress.Chainable<undefined> => {
  const startTime = Date.now();

  const checkForValidatedCards = (attempt: number): void => {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Wait for the page content to stabilize after reload
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(UI_POLL_CONFIG.pageLoadWaitMs);
    cy.get('body').then(($body) => {
      const validatedCardCount = $body.find(
        '[data-testid="model-catalog-card"]:has([data-testid="validated-model-hardware"])',
      ).length;

      cy.log(
        `Attempt ${attempt}/${maxAttempts}: validatedCards=${validatedCardCount}, elapsed=${elapsedTime}s`,
      );

      if (validatedCardCount > 0) {
        cy.log(
          `✅ Found ${validatedCardCount} validated model card(s) with performance data (after ${elapsedTime}s)`,
        );
        return;
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `Validated model cards with performance data did not appear after ${maxAttempts} attempts (${elapsedTime}s). ` +
            `Ensure the model-catalog BFF has fully loaded validated model metrics.`,
        );
      }

      // Reload and retry — re-enable the performance toggle after reload as it resets to OFF
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(pollIntervalMs);
      cy.reload();
      cy.findByTestId('model-performance-view-toggle').then(($toggle) => {
        if ($toggle.attr('aria-checked') !== 'true') {
          cy.wrap($toggle).click({ force: true });
        }
      });
      checkForValidatedCards(attempt + 1);
    });
  };

  cy.step(`Polling for validated model cards with performance data (max ${maxAttempts} attempts)`);
  return cy.then(() => checkForValidatedCards(1));
};

/**
 * Check if performance/benchmark data is available on the cluster.
 * Waits for cards to load and checks if any validated models have performance metrics.
 * @param maxWaitMs Maximum time to wait for performance data to appear (default: 15000ms)
 * @returns A Cypress chainable that resolves with the count of validated cards with performance data.
 */
export const checkPerformanceDataAvailable = (maxWaitMs = 15000): Cypress.Chainable<number> => {
  cy.log('Checking for validated models with performance data...');

  // Use a retry mechanism with Cypress's built-in waiting
  return cy.get('body', { timeout: maxWaitMs }).then(($body) => {
    const count = $body.find(
      '[data-testid="model-catalog-card"]:has([data-testid="validated-model-hardware"])',
    ).length;

    if (count > 0) {
      cy.log(`Found ${count} validated model card(s) with performance data`);
    } else {
      cy.log('No validated models with performance data found');
    }

    return count;
  });
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
