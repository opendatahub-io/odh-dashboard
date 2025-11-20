import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { genAiPlayground } from '#~/__tests__/cypress/cypress/pages/genAiPlayground';

describe('Verify Gen AI Playground Access', () => {
  const testProjectName = 'crimson-dev';

  it(
    'should allow user to access Gen AI playground from navigation',
    {
      tags: ['@Sanity', '@SanitySet1', '@Dashboard', '@GenAI', '@Featureflagged'],
    },
    () => {
      // Navigate directly to the Gen AI Playground with feature flags enabled
      // Note: Using cy.visit() since the cluster uses Red Hat SSO authentication
      // Make sure you're logged into the cluster in your browser before running the test
      cy.step(`Navigate to Gen AI Playground with project: ${testProjectName}`);
      cy.visit(
        `/gen-ai-studio/playground/${testProjectName}?devFeatureFlags=genAiStudio%3Dtrue%2CmodelAsService%3Dtrue`,
      );

      // Verify playground page loads
      cy.step('Verify playground page is accessible');
      genAiPlayground.shouldBeAccessible();

      // Verify the URL contains the project namespace
      cy.step('Verify URL contains the project namespace');
      cy.url().should('include', `/gen-ai-studio/playground/${testProjectName}`);

      // Verify the project selector is present
      cy.step('Verify project selector is present');
      genAiPlayground.findProjectSelector().should('be.visible');

      // Verify Gen AI studio section is visible in navigation
      cy.step('Verify Gen AI studio section exists in navigation');
      appChrome.findNavSection('Gen AI studio').should('be.visible');

      // Verify the page title
      cy.step('Verify Gen AI playground page structure is present');
      genAiPlayground.findPageTitle().should('contain', 'Playground');

      // Test chatbot interaction with a simple deterministic geography question
      cy.step('Verify a model is selected');
      // Check if there's a model dropdown and it has a value
      cy.get('button[class*="pf-v6-c-menu-toggle"]')
        .contains(/vllm|llama|qwen/i)
        .should('exist');

      cy.step('Send a test message to the chatbot');
      const testQuestion = 'Where is New York?';

      // First, verify we have the welcome message
      genAiPlayground.findAllBotMessages().should('have.length', 1);

      // Verify the input is not disabled and send button is enabled
      cy.step('Verify message input is ready');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      // Send the message
      genAiPlayground.sendMessage(testQuestion);

      // Verify user message appears in the chat
      cy.step('Verify user message appears in chat');
      cy.get('.pf-chatbot__message--user').should('exist').and('contain', testQuestion);

      // Wait for bot response to appear (2 bot messages: welcome + response)
      cy.step('Wait for chatbot to generate response');
      genAiPlayground.findAllBotMessages().should('have.length.at.least', 2, { timeout: 60000 });

      // Wait for the loading state to complete (response should not contain "loading message")
      cy.step('Wait for loading to complete');
      genAiPlayground
        .findBotMessageContent()
        .should('be.visible')
        .invoke('text')
        .should('not.contain', 'loading message'); // Wait until loading is done

      // Wait for the actual response content to have substantial text
      cy.step('Wait for chatbot response content to complete streaming');
      genAiPlayground
        .findBotMessageContent()
        .invoke('text')
        .should((text) => {
          const cleanText = text.trim().toLowerCase();
          // Response should have substantial content and not be loading state
          expect(cleanText).to.have.length.greaterThan(20);
          expect(cleanText).to.not.contain('loading');
        });

      // Verify the response contains expected answer and log it
      cy.step('Verify chatbot response contains United States or America');
      genAiPlayground
        .findBotMessageContent()
        .invoke('text')
        .then((text) => {
          const cleanText = text.trim();
          const lowerText = cleanText.toLowerCase();
          cy.log(`Chatbot response: ${cleanText}`);
          // Check if response contains "united states" or "america"
          expect(lowerText).to.satisfy(
            (txt: string) => txt.includes('united states') || txt.includes('america'),
            'Response should mention United States or America',
          );
        });
    },
  );
});
