import * as yaml from 'js-yaml';
import { loadDSPFixture } from './dataLoader';
import {
  detectModelCatalogNamespace,
  ensureModelCatalogSourceEnabled,
  verifyModelCatalogBackend,
} from './oc_commands/modelCatalog';
import { provisionProjectForModelServing } from './oc_commands/modelServing';
import type { ModelCatalogSourceTestData } from '../types';

export type ToolCallingWizardSetupData = {
  sourceData: ModelCatalogSourceTestData;
  projectName: string;
  modelName: string;
  awsBucket: 'BUCKET_1';
  validatedConfigurationOptionId: string;
};

type ModelCatalogToolCallingFixtureData = {
  projectResourceName: string;
  singleModelName: string;
  awsBucket: 'BUCKET_1';
};

const TOOL_CALLING_FIXTURE_PATH = 'e2e/modelCatalog/testSourceEnableDisable.yaml';
const MODEL_CATALOG_FIXTURE_PATH = 'e2e/modelCatalog/testModelCatalog.yaml';
const MODEL_SERVING_CONNECTION_YAML = 'resources/yaml/data_connection_model_serving.yaml';
const LOCAL_BUILD_FALLBACK = '0';

export const setupToolCallingWizardTestData = (
  uuid: string,
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
      return cy.fixture(TOOL_CALLING_FIXTURE_PATH, 'utf8');
    })
    .then((yamlContent: string) => {
      const sourceData = yaml.load(yamlContent) as ModelCatalogSourceTestData;
      if (!sourceData.toolCallingModelName) {
        throw new Error(
          'Set toolCallingModelName in e2e/modelCatalog/testSourceEnableDisable.yaml to a catalog card that has validated tool-calling args.',
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
      loadDSPFixture(MODEL_CATALOG_FIXTURE_PATH).then((fixtureData) => {
        const modelCatalogFixtureData = fixtureData as ModelCatalogToolCallingFixtureData;
        const {
          awsBucket,
          projectResourceName,
          singleModelName: modelName,
        } = modelCatalogFixtureData;
        const build =
          Cypress.env('BUILD_NUMBER') || Cypress.env('GITHUB_RUN_ID') || LOCAL_BUILD_FALLBACK;
        const localRunSuffix =
          build === LOCAL_BUILD_FALLBACK ? `-${Date.now().toString().slice(-4)}` : '';
        const projectName = `${projectResourceName}-${uuid}${localRunSuffix}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }

        cy.log(`Loaded project name: ${projectName}`);
        provisionProjectForModelServing(projectName, awsBucket, MODEL_SERVING_CONNECTION_YAML);

        return cy.wrap({
          sourceData,
          projectName,
          modelName,
          awsBucket,
          validatedConfigurationOptionId,
        });
      }),
    );
