import yaml from 'js-yaml';
import { applyOpenShiftYaml } from './baseCommands';
import type { CommandLineResult } from '../../types';

const AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_NAME = 'autox-dspa-ca-bundle';
const AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_KEY = 'ca-bundle.crt';
const OPENSHIFT_INGRESS_CONFIG_MAP_NAMESPACE = 'openshift-config-managed';
const OPENSHIFT_INGRESS_CONFIG_MAP_NAME = 'default-ingress-cert';
const OPENSHIFT_INGRESS_CONFIG_MAP_KEY = 'ca-bundle.crt';
const OPENSHIFT_SERVICE_CA_CONFIG_MAP_NAME = 'openshift-service-ca.crt';
const OPENSHIFT_SERVICE_CA_CONFIG_MAP_KEY = 'service-ca.crt';
const DSPA_RESOURCE_NAME = 'dspa';
const CONFIG_MAP_KEY_MAX_ATTEMPTS = 30;
const CONFIG_MAP_KEY_RETRY_INTERVAL_MS = 2000;
// A stalled oc process fails fast; only returned transient failures and empty data are retried.
const CONFIG_MAP_KEY_COMMAND_TIMEOUT_MS = 5000;
const AUTOX_DSPA_COMMAND_TIMEOUT_MS = 30000;

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const isAuthorizationFailure = (output: string): boolean =>
  /\b(?:forbidden|unauthorized)\b|access denied|must be logged in|not logged in|authentication required|login required|no credentials/i.test(
    output,
  );

const readConfigMapKey = (
  namespace: string,
  configMapName: string,
  configMapKey: string,
): Cypress.Chainable<string> => {
  const escapedKey = configMapKey.replace(/\./g, '\\.');
  const command =
    `oc get configmap ${shellQuote(configMapName)} -n ${shellQuote(namespace)} ` +
    `-o jsonpath='{.data.${escapedKey}}'`;

  const read = (attempt: number): Cypress.Chainable<string> =>
    cy
      .exec(command, {
        failOnNonZeroExit: false,
        log: false,
        timeout: CONFIG_MAP_KEY_COMMAND_TIMEOUT_MS,
      })
      .then((result: CommandLineResult) => {
        const value = result.stdout.trim();
        if (result.exitCode === 0 && value) {
          return cy.wrap(value, { log: false });
        }

        if (result.exitCode !== 0 && isAuthorizationFailure(`${result.stderr}\n${result.stdout}`)) {
          throw new Error(
            `Unable to read ConfigMap ${configMapName}/${configMapKey} in ${namespace}: ` +
              'the oc identity is not authorized.',
          );
        }

        if (attempt >= CONFIG_MAP_KEY_MAX_ATTEMPTS) {
          if (result.exitCode !== 0) {
            throw new Error(
              `Unable to read ConfigMap ${configMapName}/${configMapKey} in ${namespace} ` +
                `(exit ${result.exitCode}).`,
            );
          }
          throw new Error(`ConfigMap ${configMapName}/${configMapKey} in ${namespace} is empty.`);
        }

        cy.log(
          `Waiting for ConfigMap ${configMapName}/${configMapKey} in ${namespace} ` +
            `(attempt ${attempt}/${CONFIG_MAP_KEY_MAX_ATTEMPTS}).`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(CONFIG_MAP_KEY_RETRY_INTERVAL_MS).then(() => read(attempt + 1));
      });

  return read(1);
};

/**
 * Create the namespace-local CA bundle consumed by the shared AutoX DSPA fixture.
 *
 * The AutoX provisioning path is shared by AutoML and AutoRAG. Both components need
 * the OpenShift ingress CA for the MaaS route and the namespace service CA for
 * in-cluster TLS, so the bundle intentionally contains both trust roots. Keeping the
 * generated ConfigMap in the test namespace lets project cleanup remove it without
 * modifying cluster-managed certificate resources. (RHAI-59341)
 */
export const createAutoXDspaCABundle = (
  projectName: string,
): Cypress.Chainable<CommandLineResult> =>
  readConfigMapKey(
    OPENSHIFT_INGRESS_CONFIG_MAP_NAMESPACE,
    OPENSHIFT_INGRESS_CONFIG_MAP_NAME,
    OPENSHIFT_INGRESS_CONFIG_MAP_KEY,
  )
    .then((ingressCA) =>
      readConfigMapKey(
        projectName,
        OPENSHIFT_SERVICE_CA_CONFIG_MAP_NAME,
        OPENSHIFT_SERVICE_CA_CONFIG_MAP_KEY,
      ).then((serviceCA) => `${ingressCA}\n${serviceCA}\n`),
    )
    .then((caBundle) =>
      applyOpenShiftYaml(
        yaml.dump({
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_NAME,
            namespace: projectName,
            labels: {
              'odh-dashboard.io/e2e-owner': 'autox',
              'odh-dashboard.io/e2e-resource': 'dspa-ca-bundle',
            },
          },
          data: {
            [AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_KEY]: caBundle,
          },
        }),
      ).then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(
            `Failed to apply AutoX DSPA CA bundle ConfigMap in ${projectName} ` +
              `(exit ${result.exitCode}).`,
          );
        }

        return readConfigMapKey(
          projectName,
          AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_NAME,
          AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_KEY,
        ).then((appliedBundle) => {
          if (appliedBundle !== caBundle.trim()) {
            throw new Error(
              `AutoX DSPA CA bundle ConfigMap in ${projectName} did not persist the expected bundle.`,
            );
          }
          return result;
        });
      }),
    );

/**
 * Verify that the API server accepted the CA ConfigMap reference from the AutoX DSPA fixture.
 * Runtime certificate use remains covered by the AutoML/AutoRAG live E2E flows.
 */
export const assertAutoXDspaCABundleReference = (
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  const expectedReference = `${AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_NAME}:${AUTOX_DSPA_CA_BUNDLE_CONFIG_MAP_KEY}`;
  const command =
    `oc get dspa ${DSPA_RESOURCE_NAME} -n ${shellQuote(projectName)} ` +
    `-o jsonpath='{.spec.apiServer.cABundle.configMapName}:{.spec.apiServer.cABundle.configMapKey}'`;

  return cy
    .exec(command, {
      failOnNonZeroExit: false,
      log: false,
      timeout: AUTOX_DSPA_COMMAND_TIMEOUT_MS,
    })
    .then((result: CommandLineResult) => {
      if (result.exitCode !== 0) {
        if (isAuthorizationFailure(`${result.stderr}\n${result.stdout}`)) {
          throw new Error(
            `Unable to read the AutoX DSPA CA bundle reference in ${projectName}: ` +
              'the oc identity is not authorized.',
          );
        }
        throw new Error(
          `Unable to read the AutoX DSPA CA bundle reference in ${projectName} ` +
            `(exit ${result.exitCode}).`,
        );
      }

      if (result.stdout.trim() !== expectedReference) {
        throw new Error(`AutoX DSPA in ${projectName} does not reference the expected CA bundle.`);
      }

      return result;
    });
};
