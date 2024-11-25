import { resources } from '~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string;
}

// Specify the return type of the function
export const checkResources = (resourceInfoList: ResourceInfo[]): void => {
  cy.log(`Starting resource check for ${resourceInfoList.length} resources.`);

  resourceInfoList.forEach((resourceInfo) => {
    cy.log(`Checking for resource: ${resourceInfo.name}`);

    // Clear the search input and type the resource name
    resources.getLearningCenterToolbar().findSearchInput().clear().type(resourceInfo.name);

    // Check if the resource card is visible by looking for its metadata name
    resources
      .getCardView(180000)
      .getCard(resourceInfo.metaDataName)
      .find()
      .should('exist')
      .then(($card) => {
        if ($card.length > 0 && $card.is(':visible')) {
          cy.log(`✅ Resource found: ${resourceInfo.name}`);
        } else {
          cy.log(`❌ Resource not found: ${resourceInfo.name}`);
        }
      });
  });
};
