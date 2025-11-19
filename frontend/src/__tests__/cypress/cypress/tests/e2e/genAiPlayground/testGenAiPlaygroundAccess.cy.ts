import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { genAiPlayground } from '#~/__tests__/cypress/cypress/pages/genAiPlayground';

describe('Verify Gen AI Playground Access', () => {
  // Use existing crimson-dev namespace instead of creating a new one
  const testProjectName = 'crimson-dev';

  it(
    'should allow user to access Gen AI playground from navigation',
    { tags: ['@Sanity', '@SanitySet1', '@Dashboard', '@GenAI', '@Featureflagged'] },
    () => {
      // Authentication and navigation with feature flags enabled
      cy.step('Log into the application with Gen AI feature flags enabled');
      cy.visitWithLogin(
        '/projects?devFeatureFlags=genAiStudio%3Dtrue%2CmodelAsService%3Dtrue',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      // Verify Gen AI studio section is visible in navigation
      cy.step('Verify Gen AI studio section exists in navigation');
      appChrome.findNavSection('Gen AI studio').should('be.visible');

      // Navigate directly to the playground with the test project namespace
      cy.step(`Navigate to Gen AI Playground with project: ${testProjectName}`);
      genAiPlayground.visit(testProjectName, false); // false = don't add feature flags again

      // Verify playground page is accessible
      cy.step('Verify playground page loads and is accessible');
      genAiPlayground.shouldBeAccessible();

      // Verify the URL contains the project namespace
      cy.step('Verify URL contains the project namespace');
      cy.url().should('include', `/gen-ai-studio/playground/${testProjectName}`);

      // Verify the project selector shows (may show loading initially)
      cy.step('Verify project selector is present');
      genAiPlayground.findProjectSelector().should('be.visible');

      // Verify the page title
      cy.step('Verify Gen AI playground page structure is present');
      genAiPlayground.findPageTitle().should('contain', 'Playground');
    },
  );
});
