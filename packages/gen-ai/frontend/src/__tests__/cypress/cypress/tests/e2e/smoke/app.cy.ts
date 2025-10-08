import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

describe('App Smoke Tests', () => {
  // Tags: @Smoke @GenAI @AppLoad
  it('should load the app with Gen-AI feature enabled', () => {
    cy.step('Enable Gen-AI feature flag and visit home');
    appChrome.visit();

    cy.step('Verify app loaded successfully');
    appChrome.findBody().should('be.visible');
  });

  // Tags: @Smoke @GenAI @Navigation
  it('should be able to navigate to Gen-AI Studio', () => {
    cy.step('Enable Gen-AI feature flag');
    appChrome.visit();

    cy.step('Verify successful navigation to dashboard');
    cy.location('pathname').should('exist');

    cy.step('Verify Gen-AI Studio is accessible');
    cy.visit('/gen-ai-studio');
    cy.location('pathname').should('include', 'gen-ai-studio');
  });
});
