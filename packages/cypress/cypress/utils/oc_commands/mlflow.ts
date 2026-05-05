import { pollUntilSuccess } from './baseCommands';
import { enableGenAiBackend, disableGenAiFeatures } from './genAi';
import { appChrome } from '../../pages/appChrome';
import type { CommandLineResult, MlflowExperimentRunData } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const DSC_RESOURCE = 'datasciencecluster default-dsc';
const K8S_NAMESPACE_RE = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;

const UI_POLL_CONFIG = {
  maxAttempts: 20,
  pollIntervalMs: 5000,
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

/**
 * Check if the MLflow operator is currently set to Managed in the DSC.
 */
export const isMlflowOperatorManaged = (): Cypress.Chainable<boolean> =>
  cy
    .exec(
      `oc get ${DSC_RESOURCE} -o jsonpath="{.spec.components.mlflowoperator.managementState}"`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.code !== 0) {
        throw new Error(`Failed to read mlflowoperator state: ${maskSensitiveInfo(result.stderr)}`);
      }
      return result.stdout.replace(/"/g, '').trim() === 'Managed';
    });

/**
 * Check if Gen AI (LlamaStack operator) is currently set to Managed in the DSC.
 */
export const isGenAiEnabled = (): Cypress.Chainable<boolean> =>
  cy
    .exec(
      `oc get ${DSC_RESOURCE} -o jsonpath="{.spec.components.llamastackoperator.managementState}"`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.code !== 0) {
        throw new Error(
          `Failed to read llamastackoperator state: ${maskSensitiveInfo(result.stderr)}`,
        );
      }
      return result.stdout.replace(/"/g, '').trim() === 'Managed';
    });

/**
 * Check if an MLflow CR exists in the applications namespace.
 */
export const doesMlflowCRExist = (): Cypress.Chainable<boolean> =>
  cy
    .exec(
      `oc get mlflows.mlflow.opendatahub.io -n ${getApplicationsNamespace()} --no-headers 2>/dev/null | head -1`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.code !== 0 && !result.stderr.includes('No resources found')) {
        throw new Error(`Failed to check MLflow CR: ${maskSensitiveInfo(result.stderr)}`);
      }
      return result.stdout.trim().length > 0;
    });

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
      .exec(`oc apply -n ${safeNamespace} -f cypress/fixtures/e2e/mlflow/mlflowCR.yaml`, {
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
 * Poll until a nav item with the given label appears in the sidebar.
 * Uses visitWithLogin for the first attempt to establish a session,
 * then cy.reload() for subsequent attempts to avoid repeated OAuth overhead.
 */
const SIDEBAR_SETTLE_TIMEOUT = 30000;

const logSidebarDiagnostics = (): void => {
  cy.window({ log: false }).then((win) => {
    const mfEl = win.document.getElementById('mf-remotes-json');
    const mfContent = mfEl?.textContent ?? '(element not found)';
    cy.log(`[DIAG] mf-remotes-json: ${mfContent}`);
  });

  appChrome.findSideBar().then(($sidebar) => {
    const links: string[] = [];
    $sidebar.find('a').each((_i, el) => {
      const text = el.textContent;
      if (text && text.trim()) {
        links.push(text.trim());
      }
    });
    cy.log(`[DIAG] Sidebar links (${links.length}): ${links.join(' | ')}`);

    const sections: string[] = [];
    $sidebar.find('button').each((_i, el) => {
      const text = el.textContent;
      if (text && text.trim()) {
        sections.push(text.trim());
      }
    });
    cy.log(`[DIAG] Sidebar sections (${sections.length}): ${sections.join(' | ')}`);
  });

  cy.request({ url: '/api/dsc/status', failOnStatusCode: false, timeout: 10000, log: false }).then(
    (resp) => {
      if (resp.status === 200 && resp.body?.components) {
        const mlflow = resp.body.components.mlflowoperator?.managementState ?? '(missing)';
        const llama = resp.body.components.llamastackoperator?.managementState ?? '(missing)';
        cy.log(`[DIAG] /api/dsc/status: mlflowoperator=${mlflow}, llamastackoperator=${llama}`);
      } else {
        cy.log(`[DIAG] /api/dsc/status: HTTP ${resp.status}`);
      }
    },
  );
};

/**
 * Retry-aware check for a nav item inside the sidebar element.
 *
 * After `dashboard-page-main` appears, area flags are set via a React
 * useEffect that runs asynchronously. Extension-provided nav items only
 * render once the PluginStore has evaluated those flags. This creates a
 * short gap (typically < 1 s) during which the sidebar exists but doesn't
 * yet contain extension items. A one-shot jQuery `.find()` during that gap
 * always misses the item, making the outer reload loop retry needlessly.
 *
 * This helper polls the live `#page-sidebar` DOM for up to `NAV_ITEM_SETTLE_MS`
 * so that a single page load is enough once the extensions are ready.
 *
 * `.then()` must allow longer than `defaultCommandTimeout` (10s) while the inner
 * `Cypress.Promise` polls for up to `NAV_ITEM_SETTLE_MS` (15s).
 */
const NAV_ITEM_SETTLE_MS = 15000;
const NAV_ITEM_POLL_MS = 500;
const NAV_ITEM_FIND_TIMEOUT_MS = NAV_ITEM_SETTLE_MS + 5000;

const findNavItemInSidebar = (navLabel: string): Cypress.Chainable<boolean> =>
  cy.wrap(null, { log: false }).then(
    { timeout: NAV_ITEM_FIND_TIMEOUT_MS },
    () =>
      new Cypress.Promise<boolean>((resolve) => {
        const deadline = Date.now() + NAV_ITEM_SETTLE_MS;
        const poll = () => {
          const $sidebar = Cypress.$('#page-sidebar');
          if ($sidebar.length > 0 && $sidebar.find(`a:contains("${navLabel}")`).length > 0) {
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

const waitForNavItemInSidebar = (navLabel: string): Cypress.Chainable<boolean> => {
  const { maxAttempts, pollIntervalMs } = UI_POLL_CONFIG;
  const startTime = Date.now();

  const check = (attemptNumber = 1): Cypress.Chainable<boolean> => {
    cy.step(`Attempt ${attemptNumber}/${maxAttempts} - Checking for ${navLabel} in sidebar...`);

    if (attemptNumber === 1) {
      cy.visitWithLogin('/');
    } else {
      cy.reload();
    }

    cy.get('[data-testid="dashboard-page-main"]', { timeout: SIDEBAR_SETTLE_TIMEOUT });

    return appChrome
      .findSideBar()
      .then(() => findNavItemInSidebar(navLabel))
      .then((found) => {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        if (found) {
          cy.log(`${navLabel} nav item found in sidebar (after ${elapsedTime}s)`);
          return cy.wrap(true);
        }

        if (attemptNumber === 1) {
          logSidebarDiagnostics();
        }

        if (attemptNumber >= maxAttempts) {
          logSidebarDiagnostics();
          throw new Error(
            `${navLabel} nav item not found in sidebar after ${maxAttempts} attempts (${elapsedTime}s)`,
          );
        }

        cy.log(
          `${navLabel} not yet visible (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsedTime}s)`,
        );

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
      });
  };

  const totalTimeout = (maxAttempts * pollIntervalMs) / 1000;
  cy.log(`Polling for ${navLabel} in sidebar (max ${totalTimeout}s)`);
  return check();
};

/**
 * Poll until the DSC status reports given components as Managed.
 * The dashboard frontend reads DSC status to evaluate area flags, so these
 * must be reflected in the cluster status before the nav items will appear.
 */
const waitForDSCComponentsManaged = (components: string[]): Cypress.Chainable<Cypress.Exec> => {
  const jqChecks = components
    .map((c) => `.components.${c}.managementState == "Managed"`)
    .join(' and ');
  const command = `oc get datasciencecluster default-dsc -o json | jq -e '.status | ${jqChecks}'`;
  return pollUntilSuccess(command, `DSC components [${components.join(', ')}] to be Managed`, {
    maxAttempts: 60,
    pollIntervalMs: 5000,
  });
};

/**
 * Poll until the MLflow tracking server pod is Ready (not just Running).
 * The CR status.address.url can be set before the pod passes readiness probes,
 * which means the BFF may still return 503 until the pod is fully ready.
 */
const waitForMlflowTrackingPodReady = (namespace: string): Cypress.Chainable<Cypress.Exec> => {
  const ns = assertNamespace(namespace);
  return pollUntilSuccess(
    `oc wait --for=condition=Available deployment/mlflow -n ${ns} --timeout=0`,
    'MLflow tracking server deployment to be Available',
    { maxAttempts: 60, pollIntervalMs: 5000 },
  );
};

/**
 * Poll the dashboard backend's /api/dsc/status until it reflects the expected
 * component management states.
 *
 * The backend uses a ResourceWatcher that caches DSC status with a 2-minute
 * (active) or 30-minute (inactive) polling interval. After patching the DSC
 * on the cluster, the cached response can be stale. Polling this endpoint:
 *  - activates the watcher (switches from 30 min to 2 min interval)
 *  - waits for the cache to refresh before the frontend evaluates area flags
 *
 * Requires an active browser session (call after cy.visitWithLogin).
 */
const waitForDashboardDSCStatus = (
  components: Record<string, string>,
): Cypress.Chainable<boolean> => {
  const maxAttempts = 60;
  const pollIntervalMs = 5000;
  const startTime = Date.now();
  const label = Object.entries(components)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  const check = (attempt = 1): Cypress.Chainable<boolean> => {
    cy.step(`Attempt ${attempt}/${maxAttempts} - Polling /api/dsc/status for ${label}...`);

    return cy
      .request({ url: '/api/dsc/status', failOnStatusCode: false, timeout: 10000 })
      .then((resp) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (resp.status === 200 && resp.body?.components) {
          const allMatch = Object.entries(components).every(
            ([comp, expected]) => resp.body.components[comp]?.managementState === expected,
          );
          if (allMatch) {
            cy.log(`Dashboard DSC status matches (after ${elapsed}s)`);
            return cy.wrap(true);
          }
        }

        if (attempt >= maxAttempts) {
          throw new Error(
            `Dashboard /api/dsc/status did not reflect ${label} after ${maxAttempts} ` +
              `attempts (${elapsed}s)`,
          );
        }

        cy.log(
          `Dashboard DSC status not yet updated (attempt ${attempt}/${maxAttempts}, ${elapsed}s)`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(pollIntervalMs).then(() => check(attempt + 1));
      });
  };

  const totalTimeout = (maxAttempts * pollIntervalMs) / 1000;
  cy.log(`Polling dashboard /api/dsc/status for ${label} (max ${totalTimeout}s)`);
  return check();
};

/**
 * Poll via cy.request() until the mlflowEmbedded module federation remote entry
 * returns HTTP 200. The dashboard proxies this through /_mf/mlflowEmbedded/*.
 *
 * The k8s deployment can report "Available" before the MLflow web server is
 * ready to serve the federated JavaScript bundle. Without this check the
 * sidebar poll would start while loadRemote() still fails silently, so the
 * nav item never appears.
 *
 * Requires an active browser session (call after cy.visitWithLogin).
 */
const waitForMlflowRemoteEntry = (): Cypress.Chainable<boolean> => {
  const remoteEntryPath = '/_mf/mlflowEmbedded/mlflow/static-files/federated/remoteEntry.js';
  const maxAttempts = 60;
  const pollIntervalMs = 5000;
  const startTime = Date.now();

  const check = (attempt = 1): Cypress.Chainable<boolean> => {
    cy.step(`Attempt ${attempt}/${maxAttempts} - Polling mlflowEmbedded remote entry...`);

    return cy
      .request({ url: remoteEntryPath, failOnStatusCode: false, timeout: 10000 })
      .then((resp) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (resp.status === 200) {
          cy.log(`mlflowEmbedded remote entry reachable (after ${elapsed}s)`);
          return cy.wrap(true);
        }

        if (attempt >= maxAttempts) {
          throw new Error(
            `mlflowEmbedded remote entry not reachable after ${maxAttempts} attempts ` +
              `(${elapsed}s, last status=${resp.status})`,
          );
        }

        cy.log(
          `remote entry returned ${resp.status} (attempt ${attempt}/${maxAttempts}, ${elapsed}s)`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(pollIntervalMs).then(() => check(attempt + 1));
      });
  };

  cy.log(`Polling mlflowEmbedded remote entry (max ${(maxAttempts * pollIntervalMs) / 1000}s)`);
  return check();
};

/**
 * Enable MLflow backend resources without waiting for sidebar visibility.
 * Sets MLflow operator to Managed, waits for it, creates MLflow CR,
 * waits for CR readiness and tracking server pod availability.
 *
 * Useful for composition when a caller will perform its own sidebar check.
 */
const enableMlflowBackend = (): Cypress.Chainable<Cypress.Exec> => {
  const namespace = getApplicationsNamespace();

  cy.step('Set MLflow operator to Managed');
  return setMlflowOperatorState('Managed')
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
      cy.step('Wait for MLflow tracking server deployment to be available');
      return waitForMlflowTrackingPodReady(namespace);
    });
};

/**
 * Enable MLflow operator and tracking server (no Gen AI):
 * 1. Set mlflowoperator to Managed and wait for it
 * 2. Create an MLflow CR and wait for it to be ready
 * 3. Verify DSC status reflects mlflowoperator as Managed
 * 4. Establish browser session and verify federated remote is loadable
 * 5. Wait for Experiments nav item in the sidebar
 */
export const enableMlflowFeatures = (): Cypress.Chainable<boolean> => {
  return enableMlflowBackend()
    .then(() => {
      cy.step('Verify DSC status reflects mlflowoperator as Managed');
      return waitForDSCComponentsManaged(['mlflowoperator']);
    })
    .then(() => {
      cy.step('Establish browser session for remote entry check');
      cy.visitWithLogin('/');
      return cy.get('#page-sidebar', { timeout: 15000 });
    })
    .then(() => {
      cy.step('Wait for mlflowEmbedded module federation remote to be loadable');
      return waitForMlflowRemoteEntry();
    })
    .then(() => {
      cy.step('Wait for dashboard backend to reflect mlflowoperator as Managed');
      return waitForDashboardDSCStatus({ mlflowoperator: 'Managed' });
    })
    .then(() => {
      cy.step('Wait for Experiments nav item in sidebar');
      return waitForNavItemInSidebar('Experiments');
    });
};

/**
 * Restore MLflow to its pre-test state.
 *
 * @param operatorWasManaged - If true, the operator was already Managed before the test; skip setting it to Removed.
 * @param crExisted - If true, the MLflow CR already existed before the test; skip deleting it.
 */
export const disableMlflowFeatures = (
  operatorWasManaged = true,
  crExisted = true,
): Cypress.Chainable<undefined> => {
  const namespace = getApplicationsNamespace();

  return cy
    .then(() => {
      if (!crExisted) {
        cy.step('Delete MLflow CR (was not present before test)');
        deleteMlflowCR(namespace);
      }
    })
    .then(() => {
      if (!operatorWasManaged) {
        cy.step('Set MLflow operator to Removed (was not Managed before test)');
        setMlflowOperatorState('Removed');
      }
    });
};

/**
 * Enable all features required for Prompt Management:
 * 1. Enable Gen AI backend (LlamaStack operator, genAiStudio flag)
 * 2. Enable MLflow backend (operator, CR, tracking pod readiness)
 * 3. Verify DSC status reflects both operators as Managed
 * 4. Single sidebar poll for "Prompts" nav item (confirms frontend picked up the state)
 *
 * Polls backend resources first so the sidebar check is a quick confirmation,
 * not a long discovery loop.
 */
export const enablePromptManagementFeatures = (): Cypress.Chainable<boolean> => {
  cy.step('Enable Gen AI backend (required for Prompts nav)');
  return enableGenAiBackend()
    .then(() => {
      cy.step('Enable MLflow backend (required for Prompts nav)');
      return enableMlflowBackend();
    })
    .then(() => {
      cy.step('Verify DSC status reflects both operators as Managed');
      return waitForDSCComponentsManaged(['llamastackoperator', 'mlflowoperator']);
    })
    .then(() => {
      cy.step('Establish browser session for remote entry check');
      cy.visitWithLogin('/');
      return cy.get('#page-sidebar', { timeout: 15000 });
    })
    .then(() => {
      cy.step('Wait for mlflowEmbedded module federation remote to be loadable');
      return waitForMlflowRemoteEntry();
    })
    .then(() => {
      cy.step('Wait for dashboard backend to reflect both operators as Managed');
      return waitForDashboardDSCStatus({
        llamastackoperator: 'Managed',
        mlflowoperator: 'Managed',
      });
    })
    .then(() => {
      cy.step('Wait for Prompts nav item in sidebar');
      return waitForNavItemInSidebar('Prompts');
    });
};

/**
 * Restore MLflow and Gen AI features to their pre-test state.
 *
 * @param operatorWasManaged - If true, the operator was already Managed before the test.
 * @param crExisted - If true, the MLflow CR already existed before the test.
 * @param genAiWasEnabled - If true, Gen AI features were already enabled before the test.
 */
export const disablePromptManagementFeatures = (
  operatorWasManaged = true,
  crExisted = true,
  genAiWasEnabled = true,
): Cypress.Chainable<undefined> =>
  disableMlflowFeatures(operatorWasManaged, crExisted).then(() => {
    if (!genAiWasEnabled) {
      cy.step('Disable Gen AI features (were not enabled before test)');
      disableGenAiFeatures();
    }
  });

/**
 * Get the MLflow tracking server URL from the MLflow CR status.
 */
export const getMlflowTrackingUrl = (): Cypress.Chainable<string> => {
  const namespace = getApplicationsNamespace();
  return cy
    .exec(
      `oc get mlflows.mlflow.opendatahub.io -n ${namespace} -o jsonpath="{.items[0].status.address.url}"`,
    )
    .then((result) => {
      const url = result.stdout.trim().replace(/"/g, '');
      if (!url) {
        throw new Error('MLflow tracking URL not found in CR status');
      }
      return url;
    });
};

/**
 * Get the name of a running MLflow tracking-server pod in the applications namespace.
 * Uses the tracking-server label to avoid matching operator, database, or minio pods.
 */
const getMlflowPodName = (): Cypress.Chainable<string> => {
  const namespace = getApplicationsNamespace();
  return cy
    .exec(
      `oc get pods -n ${namespace} -l app=mlflow -o jsonpath="{.items[0].metadata.name}" --field-selector=status.phase=Running`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      const podName = result.stdout.replace(/"/g, '').trim();
      if (!podName) {
        throw new Error(
          `No running MLflow tracking pod found (label app=mlflow) in namespace ${namespace}`,
        );
      }
      return podName;
    });
};

/**
 * Execute a curl command inside the MLflow pod against the tracking server.
 */
const execCurlInMlflowPod = (
  endpoint: string,
  body: object,
  workspace: string,
): Cypress.Chainable<string> => {
  const namespace = getApplicationsNamespace();
  const bodyJson = JSON.stringify(body);
  const escapedBody = bodyJson.replace(/'/g, "'\\''");
  return getMlflowPodName().then((podName) => {
    const ns = assertNamespace(workspace);
    const cmd = [
      `printf '%s' '${escapedBody}'`,
      '|',
      `oc exec -n ${namespace} -i ${podName} -c mlflow --`,
      `curl -sk -X POST 'https://localhost:8443${endpoint}'`,
      `-H 'Content-Type: application/json'`,
      `-H "Authorization: Bearer $(oc whoami -t)"`,
      `-H 'X-MLFLOW-WORKSPACE: ${ns}'`,
      `--data-binary @-`,
    ].join(' ');
    return cy.exec(cmd, { timeout: 30000, log: false }).then((result) => result.stdout.trim());
  });
};

/**
 * Create an MLflow experiment via the tracking server REST API.
 *
 * @param workspace - Namespace to scope the experiment to.
 * @param experimentName - Display name for the experiment.
 * @returns The experiment_id of the created experiment.
 */
export const createMlflowExperimentViaAPI = (
  workspace: string,
  experimentName: string,
): Cypress.Chainable<string> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/experiments/create',
    { name: experimentName },
    workspace,
  ).then((response) => JSON.parse(response).experiment_id);

/**
 * Log a run with parameters and metrics via the MLflow tracking server REST API.
 *
 * @param workspace - Namespace to scope the run to.
 * @param experimentId - The experiment_id to create the run under.
 * @param run - Run data (name, parameters, metrics).
 * @returns The run_id of the created run.
 */
export const logMlflowRunViaAPI = (
  workspace: string,
  experimentId: string,
  run: MlflowExperimentRunData,
): Cypress.Chainable<string> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/runs/create',
    /* eslint-disable camelcase */
    { experiment_id: experimentId, run_name: run.name },
    workspace,
  ).then((response) => {
    const runId = JSON.parse(response).run.info.run_id;
    const params = Object.entries(run.parameters).map(([key, value]) => ({ key, value }));
    const metricTimestamp = Date.now();
    const metrics = Object.entries(run.metrics).map(([key, value]) => ({
      key,
      value: parseFloat(value),
      timestamp: metricTimestamp,
      step: 0,
    }));
    return execCurlInMlflowPod(
      '/api/2.0/mlflow/runs/log-batch',
      { run_id: runId, params, metrics },
      workspace,
    ).then(() =>
      execCurlInMlflowPod(
        '/api/2.0/mlflow/runs/update',
        { run_id: runId, status: 'FINISHED', end_time: Date.now() },
        workspace,
      ).then(() => runId),
    );
    /* eslint-enable camelcase */
  });

/**
 * Delete an MLflow experiment via the tracking server REST API.
 *
 * @param workspace - Namespace the experiment is scoped to.
 * @param experimentId - The experiment_id to delete.
 */
export const deleteMlflowExperimentViaAPI = (
  workspace: string,
  experimentId: string,
): Cypress.Chainable<string> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/experiments/delete',
    { experiment_id: experimentId }, // eslint-disable-line camelcase
    workspace,
  );

/**
 * Look up an MLflow experiment by name and return its ID, or undefined if not found.
 */
export const getMlflowExperimentIdByName = (
  workspace: string,
  experimentName: string,
): Cypress.Chainable<string | undefined> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/experiments/get-by-name',
    { experiment_name: experimentName }, // eslint-disable-line camelcase
    workspace,
  ).then((response) => {
    try {
      return JSON.parse(response)?.experiment?.experiment_id;
    } catch {
      return undefined;
    }
  });

/**
 * Log multiple runs sequentially under a single experiment.
 *
 * @param workspace - Namespace to scope the runs to.
 * @param experimentId - The experiment_id to create the runs under.
 * @param runs - Array of run data objects (name, parameters, metrics).
 * @returns Array of run_ids for all created runs.
 */
export const logMlflowRunsViaAPI = (
  workspace: string,
  experimentId: string,
  runs: MlflowExperimentRunData[],
): Cypress.Chainable<string[]> => {
  const logNext = (
    remaining: MlflowExperimentRunData[],
    collected: string[],
  ): Cypress.Chainable<string[]> => {
    if (remaining.length === 0) {
      return cy.wrap(collected);
    }
    const [run, ...rest] = remaining;
    return logMlflowRunViaAPI(workspace, experimentId, run).then((runId) =>
      logNext(rest, [...collected, runId]),
    );
  };
  return logNext(runs, []);
};
