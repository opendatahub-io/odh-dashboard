import { applyOpenShiftYaml } from './baseCommands';
import { replacePlaceholdersInYaml } from '../yaml_files';
import { loadYamlFixture } from '../dataLoader';
import type { CommandLineResult, PVCLoaderPodReplacements } from '../../types';

export const createS3LoaderPod = (
  replacements: PVCLoaderPodReplacements,
  yamlFilePath = 'resources/yaml/pvc-loader-pod.yaml',
): Cypress.Chainable<CommandLineResult> =>
  loadYamlFixture(yamlFilePath).then((yamlContent) => {
    const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, replacements);
    return applyOpenShiftYaml(modifiedYamlContent);
  });
