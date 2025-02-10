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
} from '~/__tests__/cypress/cypress/types';

// Load fixture function that returns DataScienceProjectData
export const loadDSPFixture = (fixturePath: string): Cypress.Chainable<DataScienceProjectData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as DataScienceProjectData;
    return data;
  });
};

// Load fixture function that returns ResourcesData
export const loadResourcesFixture = (fixturePath: string): Cypress.Chainable<ResourcesData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as ResourcesData;
    return data;
  });
};

export const loadPVCFixture = (fixturePath: string): Cypress.Chainable<PVCReplacements> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as PVCReplacements;

    return data;
  });
};
export const loadPVCEditFixture = (fixturePath: string): Cypress.Chainable<WBEditTestData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBEditTestData;

    return data;
  });
};
export const loadWBControlSuiteFixture = (
  fixturePath: string,
): Cypress.Chainable<WBControlSuiteTestData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBControlSuiteTestData;

    return data;
  });
};
export const loadWBVariablesFixture = (
  fixturePath: string,
): Cypress.Chainable<WBVariablesTestData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBVariablesTestData;

    return data;
  });
};

export const loadWBStatusFixture = (fixturePath: string): Cypress.Chainable<WBStatusTestData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as WBStatusTestData;

    return data;
  });
};

export const loadOOTBConnectionTypesFixture = (
  fixturePath: string,
): Cypress.Chainable<OOTBConnectionTypesData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as OOTBConnectionTypesData;

    return data;
  });
};
