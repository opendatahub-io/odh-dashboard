import { applyOpenShiftYaml, shellQuote } from './baseCommands';
import type {
  DataConnectionReplacements,
  CommandLineResult,
  DataConnectionUriReplacements,
} from '../../types';
import { replacePlaceholdersInYaml } from '../yaml_files';

/**
 * Try to create a data connection based on the dataConnectionReplacements config
 * @param dataConnectionReplacements Dictionary with the config values
 *      Dict Structure:
 *              dataConnectionReplacements = {
 *                  NAMESPACE: <PROJECT NAME>,
 *                  AWS_ACCESS_KEY_ID: <AWS ACCESS KEY ID>,
 *                  AWS_DEFAULT_REGION: <AWS REGION>,
 *                  AWS_S3_BUCKET: <AWS BUCKET NAME>,
 *                  AWS_S3_ENDPOINT: <AWS ENDPOINT>,
 *                  AWS_SECRET_ACCESS_KEY: <AWS SECRET>,
 *               }
 * @param yamlFilePath
 */
export const createDataConnection = (
  dataConnectionReplacements: DataConnectionReplacements,
  yamlFilePath = 'resources/yaml/data_connection.yaml',
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dataConnectionReplacements);
    return applyOpenShiftYaml(modifiedYamlContent);
  });

/**
 * Verify the S3 endpoint persisted in the default AutoX data connection Secret.
 *
 * @param namespace Namespace containing the data connection Secret
 * @param expectedEndpoint Endpoint expected in AWS_S3_ENDPOINT
 */
export const assertDataConnectionEndpoint = (
  namespace: string,
  expectedEndpoint: string,
): Cypress.Chainable<Cypress.Exec> =>
  cy
    .exec(
      `oc get secret ${shellQuote('aws-connection-ods-ci-ds-pipelines')} ` +
        `-n ${shellQuote(namespace)} -o jsonpath='{.data.AWS_S3_ENDPOINT}'`,
      { failOnNonZeroExit: true, log: false },
    )
    .then((result: Cypress.Exec) => {
      const actualEndpoint = Buffer.from(result.stdout.trim(), 'base64').toString('utf8');
      expect(actualEndpoint, 'AutoX data connection S3 endpoint').to.equal(expectedEndpoint);
    });

export const createDataConnectionUri = (
  dataConnectionUriReplacements: DataConnectionUriReplacements,
  yamlFilePath = 'resources/yaml/data_connections_uri_connection_type.yaml',
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(
      yamlContent,
      dataConnectionUriReplacements,
    );
    return applyOpenShiftYaml(modifiedYamlContent);
  });
