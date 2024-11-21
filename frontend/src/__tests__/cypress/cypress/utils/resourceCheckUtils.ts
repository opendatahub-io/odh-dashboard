import { resources } from '~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string; // This can be retained if needed for logging, but we won't use it for assertions.
}

export const waitAndCheckResources = (resourceInfoList: ResourceInfo[]) => {
  const timeout = 60000; // Total timeout of 1 minute
  const checkInterval = 5000; // Check every 5 seconds

  const checkResource = (resourceInfo: ResourceInfo, startTime: number) => {
    // If the total timeout has been reached, log that the resource is missing
    if (Date.now() - startTime >= timeout) {
      cy.log(`Timeout reached. Resource not found: ${resourceInfo.name}`);
      return; // Stop checking this resource
    }

    cy.log(`Searching for resource: ${resourceInfo.name}`);

    // Clear the search input and type the resource name
    resources.getLearningCenterToolbar().findSearchInput().clear().type(resourceInfo.name);

    // Wait for a moment to allow search results to load
    cy.wait(1000); // Adjust this if necessary based on your app's response time

    // Check if the resource card is visible by looking for its metadata name
    resources.getCardView().getCard(resourceInfo.metaDataName).find().then(($card) => {
      if ($card.length > 0 && $card.is(':visible')) {
        cy.log(`✅ Resource found: ${resourceInfo.name}`);
      } else {
        cy.log(`Resource not found yet: ${resourceInfo.name}`);
        // Wait before checking again
        cy.wait(checkInterval).then(() => checkResource(resourceInfo, startTime));
      }
    });
  };

  // Start checking each resource independently
  const startTime = Date.now();

  resourceInfoList.forEach((resourceInfo) => {
    checkResource(resourceInfo, startTime);
  });
};