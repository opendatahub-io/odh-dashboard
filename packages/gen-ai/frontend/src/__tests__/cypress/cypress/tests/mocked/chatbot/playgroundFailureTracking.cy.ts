import {
  captureTracking,
  expectSafeTracking,
} from '@odh-dashboard/cypress/cypress/utils/analytics';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';

const TEST_NAMESPACE = 'mock-test-namespace-2';

describe('Playground failure tracking', () => {
  it('keeps a delete failure diagnostic out of analytics', () => {
    const message = 'Private playground deletion diagnostic';
    chatbotPage.visit(TEST_NAMESPACE);
    chatbotPage.findChatbotPlayground().should('be.visible');
    chatbotPage.openKebabMenu();
    chatbotPage.findDeleteMenuItem().click();
    chatbotPage
      .findDeletePlaygroundModal()
      .find('strong')
      .invoke('text')
      .then((playgroundName) => {
        chatbotPage.findDeletePlaygroundInput().type(playgroundName);
      });
    cy.intercept('DELETE', '**/api/v1/lsd/delete*', {
      statusCode: 500,
      body: { error: { code: 'internal_error', message } },
    }).as('deletePlaygroundFailure');
    captureTracking();
    chatbotPage.findDeletePlaygroundSubmitButton().click();
    cy.wait('@deletePlaygroundFailure');
    chatbotPage.findDeletePlaygroundError().should('contain.text', message);
    expectSafeTracking('Playground Delete', { success: false, error: 'unknown_error' }, message);
  });
});
