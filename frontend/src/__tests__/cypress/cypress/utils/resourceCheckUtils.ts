import { resources } from '#~/__tests__/cypress/cypress/pages/resources';

interface ResourceInfo {
  name: string;
  metaDataName: string;
  description: string;
}

export const getCardWithWait = (
  id: string | undefined,
  timeout = 180000,
): Cypress.Chainable<JQuery<HTMLElement>> => {
  if (!id) {
    throw new Error(`Invalid card ID: undefined`);
  }

  cy.log(`Waiting for card with id: ${id}`);

  return cy
    .get('[data-testid="learning-center-card-view"]', { timeout })
    .should('exist')
    .and('be.visible')
    .then(($cardView) => {
      if ($cardView.length === 0) {
        throw new Error(`Card view not found within ${timeout}ms`);
      }
      return cy.wrap($cardView);
    })
    .get(`[data-testid="card ${id}"]`, { timeout })
    .should('exist')
    .and('be.visible')
    .then(($card) => {
      if ($card.length === 0) {
        throw new Error(`Card with id '${id}' not found or not visible within ${timeout}ms`);
      }
      return $card;
    });
};

export const checkResources = (resourceInfoList: ResourceInfo[]): void => {
  cy.log(`Starting resource check for ${resourceInfoList.length} resources.`);

  resourceInfoList.forEach((resourceInfo) => {
    cy.log(`Checking for resource: ${resourceInfo.name}`);

    resources.getLearningCenterToolbar().findSearchInput().clear().type(resourceInfo.name);

    cy.wrap(null)
      .then(() => {
        return getCardWithWait(resourceInfo.metaDataName, 180000);
      })
      .then(() => {
        cy.log(`✅ Resource found: ${resourceInfo.name}`);
        // Additional actions can be performed here if needed
      });
  });

  Cypress.on('fail', (error) => {
    cy.log(`❌ Error finding resource: ${error.message}`);
    throw error; // Re-throw the error to fail the test
  });
};
