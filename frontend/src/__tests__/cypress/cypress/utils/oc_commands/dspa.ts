import { replacePlaceholdersInYaml } from '~/__tests__/cypress/cypress/utils/yaml_files';
import type { DspaSecretReplacements, DspaReplacements } from '~/__tests__/cypress/cypress/types';
import { applyOpenShiftYaml } from './baseCommands';

/**
 * Try to create a DSPA Secret based on the dspaSecretReplacements config
 * @param dspaSecretReplacements Dictionary with the config values
 *      Dict Structure:
 *              dspaSecretReplacements = {
 *                  DSPA_SECRET_NAME: <DSPA SECRET NAME>,
 *                  NAMESPACE: <PROJECT NAME>,
 *                  AWS_ACCESS_KEY_ID: <AWS ACCESS KEY ID>,
 *                  AWS_SECRET_ACCESS_KEY: <AWS SECRET>,
 *               }
 * @param yamlFilePath
 */
export const createDSPASecret = (
  dspaSecretReplacements: DspaSecretReplacements,
  yamlFilePath = 'resources/yaml/dspa_secret.yaml',
) => {
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaSecretReplacements);
    applyOpenShiftYaml(modifiedYamlContent).then((result) => {
      return result;
    });
  });
};

/**
 * Try to create a DSPA based on the dspaReplacements config
 * @param dspaReplacements Dictionary with the config values
 *      Dict Structure:
 *              dspaSecretReplacements = {
 *                  DSPA_SECRET_NAME: <DSPA SECRET NAME>,
 *                  NAMESPACE: <PROJECT NAME>,
 *                  AWS_S3_BUCKET: <AWS BUCKET NAME>
 *               }
 * @param yamlFilePath
 */
export const createDSPA = (
  dspaReplacements: DspaReplacements,
  yamlFilePath = 'resources/yaml/dspa.yaml',
) => {
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaReplacements);
    applyOpenShiftYaml(modifiedYamlContent).then((result) => {
      return result;
    });
  });
};
