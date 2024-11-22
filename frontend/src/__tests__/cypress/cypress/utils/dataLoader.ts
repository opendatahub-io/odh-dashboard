import yaml from 'js-yaml';
import type { DataScienceProjectData, PVCReplacements } from '~/__tests__/cypress/cypress/types';

// Load fixture function that returns a specific type
export const loadFixture = (fixturePath: string): Cypress.Chainable<DataScienceProjectData> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as DataScienceProjectData;

    return data;
  });
};

export const loadPVCFixture = (fixturePath: string): Cypress.Chainable<PVCReplacements> => {
  return cy.fixture(fixturePath, 'utf8').then((yamlContent: string) => {
    const data = yaml.load(yamlContent) as PVCReplacements;

    return data;
  });
};
