import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  enablePromptManagementFeatures,
  disablePromptManagementFeatures,
  setMlflowOperatorState,
  deleteMlflowCR,
} from '../../../utils/oc_commands/mlflow';
import { retryableBefore } from '../../../utils/retryableHooks';
import { promptManagement } from '../../../pages/promptManagement';

describe('Verify Prompt Management page', () => {
  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('expected expression') || err.message.includes('Unexpected token')) {
        return false;
      }
      return true;
    });

    cy.step('Enable all features required for Prompt Management');
    enablePromptManagementFeatures();
  });

  after(() => {
    disablePromptManagementFeatures();
  });

  it(
    'Prompt management page loads successfully when MLflow is enabled',
    {
      tags: ['@Sanity', '@SanitySet1', '@PromptManagement', '@MLflow', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Prompt Management page via sidebar');
      promptManagement.navigate();

      cy.step('Verify page title is displayed');
      promptManagement.findPageTitle().should('contain', 'Prompts');

      cy.step('Verify Launch MLflow button is present');
      promptManagement.findLaunchMlflowButton().should('be.visible');

      cy.step('Verify the MLflow embedded component loaded (no unavailable state)');
      promptManagement.findMlflowUnavailableState().should('not.exist');
    },
  );

  it(
    'Shows unavailable state when MLflow operator is disabled',
    {
      tags: ['@Sanity', '@SanitySet1', '@PromptManagement', '@MLflow', '@NonConcurrent'],
    },
    () => {
      const namespace = Cypress.env('APPLICATIONS_NAMESPACE');

      cy.step('Set MLflow operator to Removed');
      setMlflowOperatorState('Removed');

      cy.step('Delete MLflow CR');
      deleteMlflowCR(namespace);

      cy.step('Log into the application and navigate to Prompts page');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      promptManagement.visit();

      cy.step('Verify MLflow unavailable empty state is displayed');
      promptManagement.findMlflowUnavailableState().should('be.visible');
      promptManagement
        .findMlflowUnavailableState()
        .should('contain', 'MLflow is currently unavailable');
      promptManagement
        .findMlflowUnavailableState()
        .should(
          'contain',
          'The MLflow service could not be reached. Please check that MLflow is deployed and running, then try again.',
        );

      cy.step('Re-enable prompt management features for remaining tests');
      enablePromptManagementFeatures();
    },
  );

  it(
    'Prompt page displays correctly',
    {
      tags: ['@Sanity', '@SanitySet1', '@PromptManagement', '@MLflow', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Prompt Management page');
      promptManagement.navigate();

      cy.step('Verify the embedded MLflow component rendered');
      promptManagement.findMlflowUnavailableState().should('not.exist');

      cy.step('Verify page title is present');
      promptManagement.findPageTitle().should('contain', 'Prompts');

      cy.step('Verify Launch MLflow link is present');
      promptManagement.findLaunchMlflowButton().should('be.visible');
    },
  );

  it(
    'Navigation to and from the Prompt management page works correctly',
    {
      tags: ['@Sanity', '@SanitySet1', '@PromptManagement', '@MLflow', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Prompt Management via sidebar');
      promptManagement.navigate();

      cy.step('Verify URL contains the prompt management path');
      cy.url().should('include', '/gen-ai-studio/prompts');

      cy.step('Verify the page rendered');
      promptManagement.findPageTitle().should('contain', 'Prompts');

      cy.step('Navigate away to home page');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      cy.findByTestId('home-page').should('be.visible');

      cy.step('Navigate back to Prompt Management via sidebar');
      promptManagement.navigate();

      cy.step('Verify the Prompt Management page loads again');
      promptManagement.findPageTitle().should('contain', 'Prompts');
      cy.url().should('include', '/gen-ai-studio/prompts');
    },
  );

  it(
    'Dark mode theming syncs correctly with dashboard theme toggle',
    {
      tags: ['@Sanity', '@SanitySet1', '@PromptManagement', '@MLflow', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Prompt Management page');
      promptManagement.navigate();

      cy.step('Toggle dark mode on');
      promptManagement.findDarkThemeToggle().click();

      cy.step('Verify HTML element has dark theme class');
      promptManagement.getHtmlDarkModeClass().should('equal', true);

      cy.step('Verify MLflow dark mode localStorage value is synced');
      promptManagement.getMlflowDarkModeStorageValue().should('equal', 'true');

      cy.step('Toggle light mode back on');
      promptManagement.findLightThemeToggle().click();

      cy.step('Verify HTML element no longer has dark theme class');
      promptManagement.getHtmlDarkModeClass().should('equal', false);

      cy.step('Verify MLflow dark mode localStorage value is cleared');
      promptManagement.getMlflowDarkModeStorageValue().should('equal', 'false');
    },
  );
});
