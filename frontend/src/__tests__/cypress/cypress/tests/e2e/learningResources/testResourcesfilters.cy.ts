import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { resources } from '#~/__tests__/cypress/cypress/pages/resources';
import { verifyResourcesForFilter } from '#~/__tests__/cypress/cypress/utils/resourceUtils';

const listView = resources.getListView();
const cardView = resources.getCardView();

const resourcesToolbar = resources.getLearningCenterToolbar();
const resourceFilters = resources.getLearningCenterFilters();

describe('[Automation Bug: RHOAIENG-21088] Verify the filters on Resources page', () => {
  it(
    'Test whether enabled, resource type, provider and provider type filters are working',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-489', '@Dashboard', '@Maintain'] },
    () => {
      // Authentication
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to Resources
      cy.step('Navigate to Resources tab');
      resources.visit();

      cy.step('Check for Enabled and Not Enabled filters');

      // Enabled filter
      verifyResourcesForFilter('enabled-filter-checkbox');

      // Not enabled filter
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('not-enabled-filter-checkbox');

      // Verify Resource type filter
      cy.step('Resource type filter for card and list view');

      // Documentation
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('documentation');

      // HowTo
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('how-to');

      // QuickStart
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('quickstart');

      // Tutorial
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('tutorial');

      // Provider and Provider type filters
      cy.step('Provider and Provider type filters');

      // Jupyter
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Jupyter');

      // Self-managed
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Self-managed');

      // Red Hat managed
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Red Hat managed');

      // Check more than one filter
      cy.step('Use more than one filter');
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('how-to').should('not.be.checked');
      resourceFilters.findFilter('how-to').check();
      resourceFilters.findFilter('documentation').should('not.be.checked');
      resourceFilters.findFilter('documentation').check();
      resourceFilters
        .findResourceCountById('documentation')
        .then((resourceCount) =>
          cardView.findCardItems().should('have.length.at.least', resourceCount),
        );
      resourcesToolbar.findListToggleButton().click();
      resourceFilters
        .findResourceCountById('documentation')
        .then((resourceCount) =>
          listView.findListItems().should('have.length.at.least', resourceCount),
        );
    },
  );
});
