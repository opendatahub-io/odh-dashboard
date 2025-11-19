import { appChrome } from './appChrome';

class GenAiPlayground {
  visit(namespace?: string, enableFeatureFlags = true) {
    let url = namespace ? `/gen-ai-studio/playground/${namespace}` : '/gen-ai-studio/playground';

    // Add dev feature flags if needed
    if (enableFeatureFlags) {
      url += '?devFeatureFlags=genAiStudio%3Dtrue%2CmodelAsService%3Dtrue';
    }

    cy.visitWithLogin(url);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Playground', rootSection: 'Gen AI studio' }).click();
    this.wait();
  }

  private wait() {
    // Wait for the playground page to load (either chatbot or empty state)
    cy.findByRole('heading', { name: 'Playground' }).should('be.visible');
  }

  findPageTitle() {
    return cy.findByRole('heading', { name: 'Playground' });
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-toggle');
  }

  findChatbot() {
    return cy.findByTestId('chatbot');
  }

  findWelcomePrompt() {
    return cy.contains('Welcome to the model playground');
  }

  findMessageBar() {
    return cy.get('[aria-label="Message bar"]');
  }

  findLoadingIndicator() {
    return cy.contains('Loading');
  }

  shouldBeAccessible() {
    // Verify the playground page is accessible (title visible)
    this.findPageTitle().should('be.visible');
    return this;
  }

  shouldBeVisible() {
    // Verify the chatbot interface is fully loaded
    this.findChatbot().should('be.visible');
    return this;
  }
}

export const genAiPlayground = new GenAiPlayground();
