import type { PVCReplacements, CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { replacePlaceholdersInYaml } from '#~/__tests__/cypress/cypress/utils/yaml_files';
import { applyOpenShiftYaml } from './baseCommands';

/**
 * Create an Persistent Volume Claim based on the PVCReplacements config
 * @param persistentVolumeClaimReplacements Dictionary with the config values
 *      Dict Structure:
 *               export type PVCReplacements = {
 *                   NAMESPACE: string;
 *                   PVC_NAME: string;
 *                   PVC_DISPLAY_NAME: string;
 *                   PVC_SIZE: string;
 *               };
 * @param yamlFilePath
 */
export const createPersistentVolumeClaim = (
  persistentVolumeClaimReplacements: PVCReplacements,
  yamlFilePath = 'resources/yaml/persistentVolumeClaim.yaml',
): Cypress.Chainable<CommandLineResult> => {
  return cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(
      yamlContent,
      persistentVolumeClaimReplacements,
    );
    cy.log(modifiedYamlContent);
    return applyOpenShiftYaml(modifiedYamlContent);
  });
};
