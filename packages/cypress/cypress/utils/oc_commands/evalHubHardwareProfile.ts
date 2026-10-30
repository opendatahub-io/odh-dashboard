import { applyOpenShiftYaml } from './baseCommands';
import {
  addKueueLabelToNamespace,
  createKueueWorkbenchResources,
  type KueueWorkbenchConfig,
} from './kueueWorkbench';
import type { CommandLineResult } from '../../types';

const KUBERNETES_NAME_RE = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;

const assertEvalHubResourceName = (value: string, resourceDescription: string): string => {
  if (!KUBERNETES_NAME_RE.test(value)) {
    throw new Error(
      `Invalid ${resourceDescription}: '${value}' must be a DNS-1123 name with at most 63 characters.`,
    );
  }
  return value;
};

const assertCommandSucceeded = (result: CommandLineResult, action: string): CommandLineResult => {
  if (result.exitCode !== 0) {
    throw new Error(`${action} failed: ${result.stderr || result.stdout}`);
  }
  return result;
};

export const getEvalHubApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (typeof namespace !== 'string' || !namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return assertEvalHubResourceName(namespace, 'APPLICATIONS_NAMESPACE');
};

/**
 * HardwareProfiles are shared from APPLICATIONS_NAMESPACE by the EvalHub model deployment.
 * Use a per-spec name so concurrent EvalHub suites do not replace one another's profile.
 */
export const getEvalHubHardwareProfileName = (testRunId: string): string =>
  assertEvalHubResourceName(
    `evalhub-e2e-hardware-profile-${testRunId}`,
    'EvalHub HardwareProfile name',
  );

const renderHardwareProfileYaml = (
  yamlContent: string,
  profileName: string,
  localQueueName?: string,
): string => {
  assertEvalHubResourceName(profileName, 'EvalHub HardwareProfile name');

  if (yamlContent.includes('${localQueueName}') && !localQueueName) {
    throw new Error('EvalHub Queue HardwareProfile fixture requires a LocalQueue name.');
  }
  if (localQueueName) {
    assertEvalHubResourceName(localQueueName, 'EvalHub LocalQueue name');
  }

  if (!/^ {2}name:[ \t]*[^\r\n#]+[ \t]*$/m.test(yamlContent)) {
    throw new Error('EvalHub HardwareProfile fixture has no metadata.name.');
  }

  return yamlContent
    .replace(/^( {2}name:[ \t]*)[^\r\n]+$/m, `$1${profileName}`)
    .replace(/^( {2}displayName:[ \t]*)[^\r\n]+$/m, `$1${profileName}`)
    .replace(/\$\{localQueueName\}/g, localQueueName ?? '');
};

export const cleanupEvalHubHardwareProfile = (
  profileName: string,
): Cypress.Chainable<CommandLineResult> => {
  const namespace = getEvalHubApplicationsNamespace();
  assertEvalHubResourceName(profileName, 'EvalHub HardwareProfile name');

  const deleteCommand =
    `oc delete hardwareprofiles "${profileName}" -n "${namespace}" ` +
    '--ignore-not-found --wait=true --timeout=60s';
  cy.log(`Deleting EvalHub HardwareProfile ${profileName} from ${namespace}`);

  return cy.exec(deleteCommand, { failOnNonZeroExit: false }).then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to delete EvalHub HardwareProfile ${profileName} in ${namespace}: ${
          result.stderr || result.stdout
        }`,
      );
    }
    return result;
  });
};

export const createEvalHubHardwareProfile = (
  fixturePath: string,
  profileName: string,
  localQueueName?: string,
): Cypress.Chainable<CommandLineResult> => {
  const namespace = getEvalHubApplicationsNamespace();
  cy.log(`Creating EvalHub HardwareProfile ${profileName} in ${namespace}`);

  return cleanupEvalHubHardwareProfile(profileName).then(() =>
    cy.fixture(fixturePath, 'utf8').then((yamlContent: string) =>
      applyOpenShiftYaml(
        renderHardwareProfileYaml(yamlContent, profileName, localQueueName),
        namespace,
      ).then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(`EvalHub HardwareProfile apply failed: ${result.stderr}`);
        }
        return result;
      }),
    ),
  );
};

/** Enables Kueue after the test model is deployed, then creates an isolated queue and profile. */
export const setupEvalHubKueueResources = (
  config: KueueWorkbenchConfig,
  namespace: string,
  hardwareProfileFixturePath: string,
): Cypress.Chainable<CommandLineResult> =>
  addKueueLabelToNamespace(assertEvalHubResourceName(namespace, 'EvalHub evaluation namespace'))
    .then((result) => assertCommandSucceeded(result, `Label namespace ${namespace} for Kueue`))
    .then(() => createKueueWorkbenchResources(config, namespace))
    .then((result) => assertCommandSucceeded(result, 'Create EvalHub Kueue queues'))
    .then(() =>
      createEvalHubHardwareProfile(
        hardwareProfileFixturePath,
        config.hardwareProfileName,
        config.localQueueName,
      ),
    );

export const deleteEvalHubClusterQueue = (name: string): Cypress.Chainable<CommandLineResult> =>
  cy
    .exec(
      `oc delete clusterqueue ${assertEvalHubResourceName(
        name,
        'EvalHub ClusterQueue name',
      )} --ignore-not-found --wait=false`,
      { failOnNonZeroExit: false },
    )
    .then((result) => assertCommandSucceeded(result, `Delete ClusterQueue ${name}`));

export const deleteEvalHubResourceFlavor = (name: string): Cypress.Chainable<CommandLineResult> =>
  cy
    .exec(
      `oc delete resourceflavor ${assertEvalHubResourceName(
        name,
        'EvalHub ResourceFlavor name',
      )} --ignore-not-found --wait=false`,
      { failOnNonZeroExit: false },
    )
    .then((result) => assertCommandSucceeded(result, `Delete ResourceFlavor ${name}`));
