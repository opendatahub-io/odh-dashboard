import { chatbotPage, modelsTabPage } from '@odh-dashboard/gen-ai/testing/pages';
import { portalModel, portalLlamaModel } from '../../__mocks__/playground';
import { portal } from '../../pages/portal';
import { genAiApi, setupPlaygroundMocks } from '../../support/playground';
import { portalPath, setupPortalMocks } from '../../support/portal';

describe('Portal playground', () => {
  beforeEach(() => {
    setupPortalMocks();
    setupPlaygroundMocks();
  });

  it('opens a MaaS model from AI assets and sends the selected subscription to the portal BFF', () => {
    portal.visit();
    modelsTabPage.getRow(portalModel.display_name).findTryInPlaygroundButton().click();
    cy.location('pathname').should('include', portalPath('/gen-ai-studio/playground'));
    chatbotPage.findChatModelToggle().should('contain.text', portalModel.display_name);
    chatbotPage.findSubscriptionSelector().should('contain.text', 'Premium Team').click();
    chatbotPage.findSubscriptionOption('Basic Team').click();
    chatbotPage.toggleStreaming(false);
    chatbotPage.findStreamingToggle().should('not.be.checked');
    chatbotPage.findMessageInput().type('Hello portal');
    chatbotPage.findSendButton().click();
    cy.wait('@chat').its('request.body').should('include', {
      model: portalLlamaModel.id,
      subscription: 'basic-team-sub',
      // eslint-disable-next-line camelcase
      model_source_type: 'maas',
      stream: false,
    });
    chatbotPage
      .findChatbotPlayground()
      .should('contain.text', 'Hello portal')
      .and('contain.text', 'Hello from the portal model');
  });

  it('starts a new conversation without leaving the portal', () => {
    portal.visit('/gen-ai-studio/playground');
    chatbotPage.toggleStreaming(false);
    chatbotPage.findStreamingToggle().should('not.be.checked');
    chatbotPage.findMessageInput().type('Clear this conversation');
    chatbotPage.findSendButton().click();
    cy.wait('@chat');
    chatbotPage.findChatbotPlayground().should('contain.text', 'Hello from the portal model');
    chatbotPage.findNewChatButton().click();
    chatbotPage.findConfirmNewChatButton().click();
    chatbotPage.findChatbotPlayground().should('not.contain.text', 'Clear this conversation');
    chatbotPage.findMessageInput().should('be.enabled');
    cy.location('pathname').should('include', portalPath('/gen-ai-studio/playground'));
  });

  it('renders an inference error while keeping navigation and the input available', () => {
    cy.intercept('POST', genAiApi('/lsd/responses*'), {
      statusCode: 500,
      body: { error: { code: '500', message: 'Portal inference unavailable' } },
    }).as('chatFailure');
    portal.visit('/gen-ai-studio/playground');
    chatbotPage.toggleStreaming(false);
    chatbotPage.findStreamingToggle().should('not.be.checked');
    chatbotPage.findMessageInput().type('Hello');
    chatbotPage.findSendButton().click();
    cy.wait('@chatFailure');
    chatbotPage.findChatbotPlayground().should('contain.text', 'Something went wrong');
    chatbotPage.findMessageInput().should('be.enabled');
    portal.findNavLink('API keys').should('be.visible');
  });
});
