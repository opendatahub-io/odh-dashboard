import { loadResourcesFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import type { ResourcesData } from '~/__tests__/cypress/cypress/types';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { resources } from '~/__tests__/cypress/cypress/pages/resources';
import {
  setupCustomResources,
  getResourceValues,
  cleanupCustomResources,
} from '~/__tests__/cypress/cypress/utils/resourceUtils';

describe('Create a custom resource Quickstart by using Dashboard CRDs', () => {
  let resourcesData: ResourcesData;
  let resourceNames: ReturnType<typeof getResourceValues>;

  before(() => {
    return loadResourcesFixture('e2e/resources/testCustomResourceCreation.yaml').then((data) => {
      resourcesData = data;
      resourceNames = getResourceValues(resourcesData);
      cy.log(`Loaded resources data: ${JSON.stringify(resourcesData, null, 2)}`);
      return setupCustomResources(resourcesData);
    });
  });
  after(() => {
    return cleanupCustomResources(resourcesData);
  });

  it('Upload custom resource and verify', () => {
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step('Navigate to Resources tab and search for the Custom Resources');
    resources.visit();

    //TODO: Remove this and add a more reliable mechanism to verify resource creation
    //Currently investigating how to do this via an 'oc' command 
    cy.wait(50000);

    cy.step(`Search for the newly created custom resource: ${resourceNames.quickStartName}`);
    resources.getLearningCenterToolbar().findSearchInput().type(resourceNames.quickStartName);
    resources
      .getCardView()
      .getCard(resourceNames.quickStartMetaDataName)
      .find()
      .within(() => {
        cy.contains(resourceNames.quickStartDescription)
          .should('be.visible')
          .then(() => {
            cy.log(`✅ Resource found: ${resourceNames.quickStartDescription}`);
          });
      });
    resources.findResetButton().click();

    cy.step(`Search for the newly created custom resource: ${resourceNames.applicationName}`);
    resources.getLearningCenterToolbar().findSearchInput().type(resourceNames.applicationName);
    resources
      .getCardView()
      .getCard(resourceNames.customAppMetaDataName)
      .find()
      .within(() => {
        cy.contains(resourceNames.customAppDescription)
          .should('be.visible')
          .then(() => {
            cy.log(`✅ Resource found: ${resourceNames.customAppMetaDataName}`);
          });
      });
    resources.findResetButton().click();

    cy.step(`Search for the newly created custom resource: ${resourceNames.howToName}`);
    resources.getLearningCenterToolbar().findSearchInput().type(resourceNames.howToName);
    resources
      .getCardView()
      .getCard(resourceNames.howToMetaDataName)
      .find()
      .within(() => {
        cy.contains(resourceNames.howToDescription)
          .should('be.visible')
          .then(() => {
            cy.log(`✅ Resource found: ${resourceNames.howToMetaDataName}`);
          });
      });
    resources.findResetButton().click();

    cy.step(`Search for the newly created custom resource: ${resourceNames.tutorialName}`);
    resources.getLearningCenterToolbar().findSearchInput().type(resourceNames.tutorialName);
    resources
      .getCardView()
      .getCard(resourceNames.tutorialMetaDataName)
      .find()
      .within(() => {
        cy.contains(resourceNames.tutorialDescription)
          .should('be.visible')
          .then(() => {
            cy.log(`✅ Resource found: ${resourceNames.tutorialMetaDataName}`);
          });
      });
    resources.findResetButton().click();
  });
});
