import yaml from 'js-yaml';
<<<<<<< HEAD
import type { DataScienceProjectData, ResourcesData } from '~/__tests__/cypress/cypress/types';
=======
import type {
  DataScienceProjectData,
  PVCReplacements,
  ResourcesData,
} from '~/__tests__/cypress/cypress/types';
>>>>>>> main

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
<<<<<<< HEAD
=======
    return data;
  });
};

export const loadPVCFixture = (fixturePath: string): Cypress.Chainable<PVCReplacements> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as PVCReplacements;

>>>>>>> main
    return data;
  });
};
