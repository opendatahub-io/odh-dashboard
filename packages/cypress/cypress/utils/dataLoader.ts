import yaml from 'js-yaml';
import type {
  DataScienceProjectData,
  PVCReplacements,
  ResourcesData,
  WBEditTestData,
  WBControlSuiteTestData,
  WBVariablesTestData,
  WBStatusTestData,
  WBStorageClassesTestData,
  ClusterStorageAccessModesTestData,
  OOTBConnectionTypesData,
  WBTolerationsTestData,
  ModifyHardwareProfileTestData,
  WBImagesTestData,
  DeployOCIModelData,
  ModelTolerationsTestData,
  ManageRegistryPermissionsTestData,
  ModelRegistryTestData,
  PipelineTestData,
  ResourcesFiltersTestData,
  WorkloadMetricsTestData,
  KueueWorkbenchTestData,
  KueueWorkbenchLifecycleTestData,
  PromptManagementTestData,
  MlflowExperimentsTestData,
  ModelAsAServiceTestData,
} from '../types';

/**
 * Merge a platform-specific fixture overlay onto base fixture data.
 *
 * When CY_PLATFORM is set (e.g., "s390x"), looks for a sibling file named
 * `<fixture>.<platform>.yaml` and shallow-merges its fields over the base.
 * If no overlay file exists or CY_PLATFORM is unset, returns base data unchanged.
 */
const mergePlatformOverlay = <T extends Record<string, unknown>>(
  fixturePath: string,
  baseData: T,
): Cypress.Chainable<T> => {
  const platform = Cypress.env('CY_PLATFORM') as string | undefined;
  if (!platform) {
    return cy.wrap(baseData, { log: false });
  }

  const dotIndex = fixturePath.lastIndexOf('.');
  const overlayPath =
    dotIndex >= 0
      ? `${fixturePath.slice(0, dotIndex)}.${platform}${fixturePath.slice(dotIndex)}`
      : `${fixturePath}.${platform}`;

  return cy
    .task<Partial<T> | null>('loadYamlOverlay', overlayPath, { log: false })
    .then((overlayData) => {
      if (overlayData) {
        cy.log(`Loaded platform overlay: ${overlayPath}`);
        return { ...baseData, ...overlayData } as T;
      }
      return baseData;
    });
};

// Load fixture function that returns DataScienceProjectData
export const loadDSPFixture = (fixturePath: string): Cypress.Chainable<DataScienceProjectData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as DataScienceProjectData;
    return mergePlatformOverlay(fixturePath, data);
  });

// Load fixture function that returns ResourcesData
export const loadResourcesFixture = (fixturePath: string): Cypress.Chainable<ResourcesData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ResourcesData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadPVCFixture = (fixturePath: string): Cypress.Chainable<PVCReplacements> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as PVCReplacements;
    return mergePlatformOverlay(fixturePath, data);
  });
export const loadPVCEditFixture = (fixturePath: string): Cypress.Chainable<WBEditTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBEditTestData;
    return mergePlatformOverlay(fixturePath, data);
  });
export const loadWBControlSuiteFixture = (
  fixturePath: string,
): Cypress.Chainable<WBControlSuiteTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBControlSuiteTestData;
    return mergePlatformOverlay(fixturePath, data);
  });
export const loadWBVariablesFixture = (
  fixturePath: string,
): Cypress.Chainable<WBVariablesTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBVariablesTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadWBStatusFixture = (fixturePath: string): Cypress.Chainable<WBStatusTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBStatusTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadWBStorageClassesFixture = (
  fixturePath: string,
): Cypress.Chainable<WBStorageClassesTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBStorageClassesTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadClusterStorageAccessModesFixture = (
  fixturePath: string,
): Cypress.Chainable<ClusterStorageAccessModesTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ClusterStorageAccessModesTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadOOTBConnectionTypesFixture = (
  fixturePath: string,
): Cypress.Chainable<OOTBConnectionTypesData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as OOTBConnectionTypesData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadWBTolerationsFixture = (
  fixturePath: string,
): Cypress.Chainable<WBTolerationsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBTolerationsTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadModifyHardwareProfileFixture = (
  fixturePath: string,
): Cypress.Chainable<ModifyHardwareProfileTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ModifyHardwareProfileTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadWBImagesFixture = (fixturePath: string): Cypress.Chainable<WBImagesTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBImagesTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadDeployOCIModelFixture = (
  fixturePath: string,
): Cypress.Chainable<DeployOCIModelData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as DeployOCIModelData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadModelTolerationsFixture = (
  fixturePath: string,
): Cypress.Chainable<ModelTolerationsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ModelTolerationsTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadManagePermissionsFixture = (
  fixturePath: string,
): Cypress.Chainable<ManageRegistryPermissionsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ManageRegistryPermissionsTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadModelRegistryFixture = (
  fixturePath: string,
): Cypress.Chainable<ModelRegistryTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ModelRegistryTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadPipelineFixture = (fixturePath: string): Cypress.Chainable<PipelineTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as PipelineTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadResourcesFiltersFixture = (
  fixturePath: string,
): Cypress.Chainable<ResourcesFiltersTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ResourcesFiltersTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadWorkloadMetricsFixture = (
  fixturePath: string,
): Cypress.Chainable<WorkloadMetricsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WorkloadMetricsTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadKueueWorkbenchFixture = (
  fixturePath: string,
): Cypress.Chainable<KueueWorkbenchTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as KueueWorkbenchTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadKueueWorkbenchLifecycleFixture = (
  fixturePath: string,
): Cypress.Chainable<KueueWorkbenchLifecycleTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as KueueWorkbenchLifecycleTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadPromptManagementFixture = (
  fixturePath: string,
): Cypress.Chainable<PromptManagementTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as PromptManagementTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadMlflowExperimentsFixture = (
  fixturePath: string,
): Cypress.Chainable<MlflowExperimentsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as MlflowExperimentsTestData;
    return mergePlatformOverlay(fixturePath, data);
  });

export const loadMaaSFixture = (fixturePath: string): Cypress.Chainable<ModelAsAServiceTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ModelAsAServiceTestData;
    return mergePlatformOverlay(fixturePath, data);
  });
