import yaml from 'js-yaml';
import type {
  DataScienceProjectData,
  PVCReplacements,
  ResourcesData,
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
