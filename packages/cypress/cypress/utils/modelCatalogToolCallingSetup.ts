import * as yaml from 'js-yaml';
import { loadDSPFixture } from './dataLoader';
import {
  detectModelCatalogNamespace,
  ensureModelCatalogSourceEnabled,
  verifyModelCatalogBackend,
} from './oc_commands/modelCatalog';
import { provisionProjectForModelServing } from './oc_commands/modelServing';
import type { DataScienceProjectData, ModelCatalogSourceTestData } from '../types';

export type ToolCallingWizardSetupData = {
  sourceData: ModelCatalogSourceTestData;
  projectName: string;
  modelName: string;
  validatedConfigurationOptionId: string;
};

const LOCAL_BUILD_FALLBACK = '0';

export const setupToolCallingWizardTestData = (
  uuid: string,
  awsBucket: 'BUCKET_1' | 'BUCKET_3',
  toolCallingFixturePath = 'e2e/modelCatalog/testSourceEnableDisable.yaml',
  modelCatalogFixturePath = 'e2e/modelCatalog/testModelCatalog.yaml',
  modelServingConnectionYamlPath = 'resources/yaml/data_connection_model_serving.yaml',
): Cypress.Chainable<ToolCallingWizardSetupData> =>
  detectModelCatalogNamespace()
    .then((namespace) => {
      if (!namespace) {
        throw new Error(
          'model-catalog deployment was not found. Log in with oc to the cluster that serves the dashboard.',
        );
      }
      Cypress.env('MODEL_REGISTRY_NAMESPACE_OVERRIDE', namespace);
      cy.log(`Using model catalog namespace: ${namespace}`);
      return cy.fixture(toolCallingFixturePath, 'utf8');
    })
    .then((yamlContent: string) => {
      const sourceData = yaml.load(yamlContent) as ModelCatalogSourceTestData;
      if (!sourceData.toolCallingModelName) {
        throw new Error(
          `Set toolCallingModelName in ${toolCallingFixturePath} to a catalog card that has validated tool-calling args.`,
        );
      }
      const validatedConfigurationOptionId = sourceData.toolCallingLabel
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

      cy.step('Verify Model Catalog backend resources are available');
      verifyModelCatalogBackend();

      cy.step('Ensure the Red Hat AI validated catalog source is enabled');
      return ensureModelCatalogSourceEnabled(sourceData.redhatAiSourceId2).then(() => ({
        sourceData,
        validatedConfigurationOptionId,
      }));
    })
    .then(({ sourceData, validatedConfigurationOptionId }) =>
      loadDSPFixture(modelCatalogFixturePath).then((fixtureData: DataScienceProjectData) => {
        const { projectResourceName, singleModelName: modelName } = fixtureData;
        const build =
          Cypress.env('BUILD_NUMBER') || Cypress.env('GITHUB_RUN_ID') || LOCAL_BUILD_FALLBACK;
        const localRunSuffix =
          build === LOCAL_BUILD_FALLBACK ? `-${Date.now().toString().slice(-4)}` : '';
        const projectName = `${projectResourceName}-${uuid}${localRunSuffix}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }

        cy.log(`Loaded project name: ${projectName}`);
        provisionProjectForModelServing(projectName, awsBucket, modelServingConnectionYamlPath);

        return cy.wrap({
          sourceData,
          projectName,
          modelName,
          validatedConfigurationOptionId,
        });
      }),
    );
