import yaml from 'js-yaml';
import type {
  DataScienceProjectData,
  PVCReplacements,
  ResourcesData,
  WBEditTestData,
  WBControlSuiteTestData,
  WBVariablesTestData,
  WBStatusTestData,
  OOTBConnectionTypesData,
  WBTolerationsTestData,
  WBImagesTestData,
  DeployOCIModelData,
  ModelTolerationsTestData,
  RegisterModelTestData,
  ManageRegistryPermissionsTestData,
  ModelRegistryTestData,
} from '#~/__tests__/cypress/cypress/types';

// Load fixture function that returns DataScienceProjectData
export const loadDSPFixture = (fixturePath: string): Cypress.Chainable<DataScienceProjectData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as DataScienceProjectData;
    return data;
  });

// Load fixture function that returns ResourcesData
export const loadResourcesFixture = (fixturePath: string): Cypress.Chainable<ResourcesData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ResourcesData;
    return data;
  });

export const loadPVCFixture = (fixturePath: string): Cypress.Chainable<PVCReplacements> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as PVCReplacements;

    return data;
  });
export const loadPVCEditFixture = (fixturePath: string): Cypress.Chainable<WBEditTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBEditTestData;

    return data;
  });
export const loadWBControlSuiteFixture = (
  fixturePath: string,
): Cypress.Chainable<WBControlSuiteTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBControlSuiteTestData;

    return data;
  });
export const loadWBVariablesFixture = (
  fixturePath: string,
): Cypress.Chainable<WBVariablesTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBVariablesTestData;

    return data;
  });

export const loadWBStatusFixture = (fixturePath: string): Cypress.Chainable<WBStatusTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBStatusTestData;

    return data;
  });

export const loadOOTBConnectionTypesFixture = (
  fixturePath: string,
): Cypress.Chainable<OOTBConnectionTypesData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as OOTBConnectionTypesData;

    return data;
  });

export const loadWBTolerationsFixture = (
  fixturePath: string,
): Cypress.Chainable<WBTolerationsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBTolerationsTestData;

    return data;
  });

export const loadWBImagesFixture = (fixturePath: string): Cypress.Chainable<WBImagesTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBImagesTestData;

    return data;
  });

export const loadDeployOCIModelFixture = (
  fixturePath: string,
): Cypress.Chainable<DeployOCIModelData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as DeployOCIModelData;

    return data;
  });

export const loadModelTolerationsFixture = (
  fixturePath: string,
): Cypress.Chainable<ModelTolerationsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ModelTolerationsTestData;

    return data;
  });

export const loadRegisterModelFixture = (
  fixturePath: string,
): Cypress.Chainable<RegisterModelTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as RegisterModelTestData;

    return data;
  });

export const loadManagePermissionsFixture = (
  fixturePath: string,
): Cypress.Chainable<ManageRegistryPermissionsTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ManageRegistryPermissionsTestData;

    return data;
  });

export const loadModelRegistryFixture = (
  fixturePath: string,
): Cypress.Chainable<ModelRegistryTestData> =>
  cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ModelRegistryTestData;

    return data;
  });
