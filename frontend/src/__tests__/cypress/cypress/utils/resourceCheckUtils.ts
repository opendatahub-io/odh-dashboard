import { resources, CardView  } from '~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string;
}

export const getCardWithWait = (cardView: CardView, id: string, timeout: number = 180000): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cardView.getCard(id).find().should('exist').and('be.visible', { timeout });
};

export const checkResources = (resourceInfoList: ResourceInfo[]): void => {
  cy.log(`Starting resource check for ${resourceInfoList.length} resources.`);

  resourceInfoList.forEach((resourceInfo) => {
    cy.log(`Checking for resource: ${resourceInfo.name}`);

    // Clear the search input and type the resource name
    resources.getLearningCenterToolbar().findSearchInput().clear().type(resourceInfo.name);

    // Use the new getCardWithWait utility
    getCardWithWait(resources.getCardView(180000), resourceInfo.metaDataName)
      .should('exist')
      .and('be.visible')
      .then(($card) => {
        cy.log(`✅ Resource found: ${resourceInfo.name}`);
        // Additional checks can be performed here if needed
      });
  });
};
