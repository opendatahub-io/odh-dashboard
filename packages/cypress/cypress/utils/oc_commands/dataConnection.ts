import { applyOpenShiftYaml } from './baseCommands';
import type { DataConnectionReplacements, CommandLineResult } from '../../types';
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
