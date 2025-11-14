import { applyOpenShiftYaml } from './baseCommands';
import type { PVCReplacements, CommandLineResult } from '../../types';
import { replacePlaceholdersInYaml } from '../yaml_files';

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
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(
      yamlContent,
      persistentVolumeClaimReplacements,
    );
    return applyOpenShiftYaml(modifiedYamlContent);
  });
