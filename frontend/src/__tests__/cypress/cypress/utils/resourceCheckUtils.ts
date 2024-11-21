import { resources } from '~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string;
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

    // Check if the resource card is visible
    resources
      .getCardView()
      .getCard(resourceInfo.metaDataName)
      .find()
      .within(() => {
        cy.contains(resourceInfo.description)
          .should('be.visible')
          .then(() => {
            cy.log(`✅ Resource found: ${resourceInfo.name}`);
          });
      })
      .then(() => {
        // If we reach here, it means the resource was not found on this attempt
        cy.log(`Resource not found yet: ${resourceInfo.name}`);

        // Wait before checking again
        cy.wait(checkInterval).then(() => checkResource(resourceInfo, startTime));
      });
  };

  // Start checking each resource independently
  const startTime = Date.now();

  resourceInfoList.forEach((resourceInfo) => {
    checkResource(resourceInfo, startTime);
  });
};
