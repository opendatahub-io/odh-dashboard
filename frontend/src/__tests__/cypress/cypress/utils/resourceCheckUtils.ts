import type { CardView } from '~/__tests__/cypress/cypress/pages/resources';
import { resources } from '~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string;
}

export const getCardWithWait = (
  cardView: CardView,
  id: string | undefined,
  timeout = 180000,
): Cypress.Chainable<JQuery<HTMLElement>> => {
  if (!id) {
    throw new Error(
      'The "id" parameter is undefined. Ensure that metaDataName is correctly passed.',
    );
  }

  cy.log(`Waiting for card with id: ${id}`);

  // Apply timeout to the Cypress command that supports it
  return cardView.getCard(id).find().should('exist', { timeout }).and('be.visible');
};

export const checkResources = (resourceInfoList: ResourceInfo[]): void => {
  cy.log(`Starting resource check for ${resourceInfoList.length} resources.`);

  resourceInfoList.forEach((resourceInfo) => {
    cy.log(`Checking for resource: ${resourceInfo.name}`);

    // Clear the search input and type the resource name
    resources.getLearningCenterToolbar().findSearchInput().clear().type(resourceInfo.name);

    getCardWithWait(resources.getCardView(180000), resourceInfo.metaDataName)
      .should('exist')
      .and('be.visible')
      .then(() => {
        cy.log(`✅ Resource found: ${resourceInfo.name}`);
        // Additional checks can be performed here if needed
      });
  });
};
