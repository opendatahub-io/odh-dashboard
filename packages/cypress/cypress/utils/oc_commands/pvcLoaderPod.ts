import { applyOpenShiftYaml } from './baseCommands';
import { replacePlaceholdersInYaml } from '../yaml_files';
import type { CommandLineResult, PVCLoaderPodReplacements } from '../../types';

export const createS3LoaderPod = (
  replacements: PVCLoaderPodReplacements,
  yamlFilePath = 'resources/yaml/pvc-loader-pod.yaml',
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, replacements);
    return applyOpenShiftYaml(modifiedYamlContent);
  });
