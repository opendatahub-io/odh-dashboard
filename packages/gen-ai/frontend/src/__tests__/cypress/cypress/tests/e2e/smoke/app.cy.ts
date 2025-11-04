import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

describe('App Smoke Tests', () => {
  it(
    'should load the app with Gen-AI feature enabled',
    { tags: ['@Smoke', '@GenAI', '@AppLoad'] },
    () => {
      cy.step('Enable Gen-AI feature flag and visit home');
      appChrome.visit();

      cy.step('Verify app loaded successfully');
      appChrome.findBody().should('be.visible');
    },
  );

  it(
    'should be able to navigate to Gen-AI Studio',
    { tags: ['@Smoke', '@GenAI', '@Navigation'] },
    () => {
      cy.step('Enable Gen-AI feature flag');
      appChrome.visit();

      cy.step('Verify successful navigation to dashboard');
      appChrome.verifyPathnameExists();

      cy.step('Verify Gen-AI Studio is accessible');
      appChrome.navigateToPath('/gen-ai-studio');
      appChrome.verifyPathnameContains('gen-ai-studio');
    },
  );
});
