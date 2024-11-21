import { resources } from '~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string; // This can be retained if needed for logging, but we won't use it for assertions.
}

export const checkResources = (resourceInfoList: ResourceInfo[]) => {
  cy.log(`Starting resource check for ${resourceInfoList.length} resources.`);

  resourceInfoList.forEach((resourceInfo) => {
    cy.log(`Checking for resource: ${resourceInfo.name}`);

    // Clear the search input and type the resource name
    resources.getLearningCenterToolbar().findSearchInput().clear().type(resourceInfo.name);

    // Wait for a moment to allow search results to load
    cy.wait(1000); // Adjust this if necessary based on your app's response time

    // Check if the resource card is visible by looking for its metadata name
    resources
      .getCardView()
      .getCard(resourceInfo.metaDataName)
      .find()
      .then(($card) => {
        if ($card.length > 0 && $card.is(':visible')) {
          cy.log(`✅ Resource found: ${resourceInfo.name}`);
        } else {
          cy.log(`❌ Resource not found: ${resourceInfo.name}`);
        }
      });
  });
};
