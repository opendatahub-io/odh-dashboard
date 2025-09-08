import { replacePlaceholdersInYaml } from '#~/__tests__/cypress/cypress/utils/yaml_files';
import type {
  CommandLineResult,
  PVCLoaderPodReplacements,
} from '#~/__tests__/cypress/cypress/types';
import { applyOpenShiftYaml } from './baseCommands';

export const createS3LoaderPod = (
  replacements: PVCLoaderPodReplacements,
  yamlFilePath = 'resources/yaml/pvc-loader-pod.yaml',
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, replacements);
    cy.log('Creating S3 copy pod with YAML:', modifiedYamlContent);
    return applyOpenShiftYaml(modifiedYamlContent);
  });
