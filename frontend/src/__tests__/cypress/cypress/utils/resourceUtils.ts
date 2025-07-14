import type { ResourcesData } from '#~/__tests__/cypress/cypress/types';
import { resources } from '#~/__tests__/cypress/cypress/pages/resources';
import { createCustomResource, deleteCustomResource } from './oc_commands/customResources';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

const listView = resources.getListView();
const cardView = resources.getCardView();

const resourcesToolbar = resources.getLearningCenterToolbar();
const resourceFilters = resources.getLearningCenterFilters();

export const setupCustomResources = (resourcesData: ResourcesData): Cypress.Chainable<void> => {
  const resourceTypes: (keyof ResourcesData['resources'])[] = [
    'CustomQuickStart',
    'CustomApplication',
    'CustomHowTo',
    'CustomTutorial',
  ];

  resourceTypes.forEach((resourceType) => {
    // Removed unnecessary conditional check
    if (!resourcesData.resources[resourceType].length) {
      throw new Error(`No ${resourceType} resources found in fixture.`);
    }
  });

  const setupPromises = resourceTypes.map((resourceType) => {
    const resource = resourcesData.resources[resourceType][0];
    return createCustomResource(applicationNamespace, resource.yamlPath);
  });

  return cy.then(() =>
    Promise.all(setupPromises).then(() => {
      cy.log('All resources have been set up successfully.');
    }),
  );
};

export const cleanupCustomResources = (resourcesData: ResourcesData): Cypress.Chainable<void> => {
  const resourceTypes: (keyof ResourcesData['resources'])[] = [
    'CustomQuickStart',
    'CustomApplication',
    'CustomHowTo',
    'CustomTutorial',
  ];

  const cleanupPromises = resourceTypes.map((resourceType) => {
    const resource = resourcesData.resources[resourceType][0];
    return deleteCustomResource(applicationNamespace, resource.kind, resource.labelSelector).then(
      (result) => {
        cy.log(`Command execution result: ${JSON.stringify(result)}`);
        expect(result.code).to.equal(0);
        cy.log('Custom resource deleted successfully.');
      },
    );
  });

  return cy.then(() =>
    Promise.all(cleanupPromises).then(() => {
      cy.log('All resources have been cleaned up successfully.');
    }),
  );
};

/**
 * Get values of custom resources from ResourcesData.
 *
 * @param resourcesData The resources data containing information about custom resources.
 * @returns An object containing names and metadata of the custom resources.
 */
export const getResourceValues = (
  resourcesData: ResourcesData,
): {
  quickStartName: string;
  applicationName: string;
  howToName: string;
  tutorialName: string;

  quickStartMetaDataName: string;
  customAppMetaDataName: string;
  howToMetaDataName: string;
  tutorialMetaDataName: string;

  quickStartDescription: string;
  customAppDescription: string;
  howToDescription: string;
  tutorialDescription: string;
} => {
  return {
    quickStartName: resourcesData.resources.CustomQuickStart[0].createdName,
    applicationName: resourcesData.resources.CustomApplication[0].createdName,
    howToName: resourcesData.resources.CustomHowTo[0].createdName,
    tutorialName: resourcesData.resources.CustomTutorial[0].createdName,

    quickStartMetaDataName: resourcesData.resources.CustomQuickStart[0].metaDataName,
    customAppMetaDataName: resourcesData.resources.CustomApplication[0].metaDataName,
    howToMetaDataName: resourcesData.resources.CustomHowTo[0].metaDataName,
    tutorialMetaDataName: resourcesData.resources.CustomTutorial[0].metaDataName,

    quickStartDescription: resourcesData.resources.CustomQuickStart[0].description,
    customAppDescription: resourcesData.resources.CustomApplication[0].description,
    howToDescription: resourcesData.resources.CustomHowTo[0].description,
    tutorialDescription: resourcesData.resources.CustomTutorial[0].description,
  };
};

/**
 * Verifies whether resource count in filter matches the number of cards
 *
 * @param filterId The filter Id to get the resource count of checkbox
 * @param getViewItems Function that takes Cypress Chainable Jquery HTML element.
 * @param getParentView Function that takes Cypress Chainable Jquery HTML element.
 */
export const verifyResourceCountMatchesView = (
  filterId: string,
  getViewItems: () => Cypress.Chainable<JQuery<HTMLElement>>,
  getParentView: () => Cypress.Chainable<JQuery<HTMLElement>>,
): void => {
  resourceFilters.findResourceCountById(filterId).then((resourceCount) => {
    if (resourceCount === 0) {
      getParentView().should('not.exist');
    } else {
      getViewItems().should('have.length', resourceCount);
    }
  });
};

/**
 * Verifies card view and list view resources for each filter Id
 *
 * @param Id The filter Id to verify resource count
 */
export const verifyResourcesForFilter = (Id: string): void => {
  resourceFilters.findFilter(Id).should('not.be.checked');
  resourceFilters.findFilter(Id).check();
  verifyResourceCountMatchesView(
    Id,
    () => cardView.findCardItems(),
    () => cardView.find(),
  );
  resourcesToolbar.findListToggleButton().click();
  verifyResourceCountMatchesView(
    Id,
    () => listView.findListItems(),
    () => listView.find(),
  );
  resourceFilters.findFilter(Id).should('be.checked');
  resourceFilters.findFilter(Id).uncheck();
};
