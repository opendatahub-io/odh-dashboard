import { applyOpenShiftYaml } from './baseCommands';
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

const renderHardwareProfileYaml = (yamlContent: string, profileName: string): string => {
  assertEvalHubResourceName(profileName, 'EvalHub HardwareProfile name');

  if (!/^ {2}name:[ \t]*[^\r\n#]+[ \t]*$/m.test(yamlContent)) {
    throw new Error('EvalHub HardwareProfile fixture has no metadata.name.');
  }

  return yamlContent
    .replace(/^( {2}name:[ \t]*)[^\r\n]+$/m, `$1${profileName}`)
    .replace(/^( {2}displayName:[ \t]*)[^\r\n]+$/m, `$1${profileName}`);
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
): Cypress.Chainable<CommandLineResult> => {
  const namespace = getEvalHubApplicationsNamespace();
  cy.log(`Creating EvalHub HardwareProfile ${profileName} in ${namespace}`);

  return cleanupEvalHubHardwareProfile(profileName).then(() =>
    cy.fixture(fixturePath, 'utf8').then((yamlContent: string) =>
      applyOpenShiftYaml(renderHardwareProfileYaml(yamlContent, profileName), namespace).then(
        (result) => {
          if (result.exitCode !== 0) {
            throw new Error(`EvalHub HardwareProfile apply failed: ${result.stderr}`);
          }
          return result;
        },
      ),
    ),
  );
};
