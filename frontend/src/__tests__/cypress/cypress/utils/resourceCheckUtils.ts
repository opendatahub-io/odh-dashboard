import { resources } from '~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string;
}

export const checkResources = (resourceInfoList: ResourceInfo[]): void => {
  cy.log(`Starting resource check for ${resourceInfoList.length} resources.`);

  resourceInfoList.forEach((resourceInfo: ResourceInfo) => {
    cy.log(`Checking for resource: ${JSON.stringify(resourceInfo, null, 2)}`);

    // Clear the search input and type the resource name
    resources.getLearningCenterToolbar().findSearchInput().clear().type(resourceInfo.name);

    // Check if the resource card is visible by looking for its metadata name
    cy.log(`Attempting to find card with metaDataName: ${resourceInfo.metaDataName}`);

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
          // Additional logging for debugging
          cy.get('.odh-card')
            .its('length')
            .then((count) => cy.log(`Number of .odh-card elements: ${count}`));
        }
      });
  });
};
