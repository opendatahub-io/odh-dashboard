import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { resources } from '~/__tests__/cypress/cypress/pages/resources';

const listView = resources.getListView();
const cardView = resources.getCardView();

const resourcesToolbar = resources.getLearningCenterToolbar();
const resourceFilters = resources.getLearningCenterFilters();

describe('Resources page', () => {
  beforeEach(() => {
    // Authentication
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    // Navigate to Resources
    cy.step('Navigate to Resources tab');
    resources.visit();
  });

  it(
    'Verify filters',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-489', '@Dashboard', '@Tier1'] },
    () => {
      cy.step('Check for Enabled and Not Enabled filters');

      // Enabled filter
      resourceFilters.findFilter('enabled-filter-checkbox').should('not.be.checked');
      resourceFilters.findFilter('enabled-filter-checkbox').check();
      cardView.findCardItems().should('have.length', 7);
      resourcesToolbar.findListToggleButton().click();
      listView.findListItems().should('have.length', 7);
      resourceFilters.findFilter('enabled-filter-checkbox').should('be.checked');
      resourceFilters.findFilter('enabled-filter-checkbox').uncheck();

      // Not enabled filter
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('not-enabled-filter-checkbox').should('not.be.checked');
      resourceFilters.findFilter('not-enabled-filter-checkbox').check();
      cardView.find().should('not.exist');
      resourcesToolbar.findListToggleButton().click();
      listView.find().should('not.exist');
      resourceFilters.findFilter('not-enabled-filter-checkbox').should('be.checked');
      resourceFilters.findFilter('not-enabled-filter-checkbox').uncheck();

      // Verify Resource type filter
      cy.step('Resource type filter for card and list view');

      // Documentation
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('documentation').should('not.be.checked');
      resourceFilters.findFilter('documentation').check();
      cardView.findCardItems().should('have.length', 1);
      resourcesToolbar.findListToggleButton().click();
      listView.findListItems().should('have.length', 1);
      resourceFilters.findFilter('documentation').should('be.checked');
      resourceFilters.findFilter('documentation').uncheck();

      // HowTo
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('how-to').should('not.be.checked');
      resourceFilters.findFilter('how-to').check();
      cardView.findCardItems().should('have.length', 4);
      resourcesToolbar.findListToggleButton().click();
      listView.findListItems().should('have.length', 4);
      resourceFilters.findFilter('how-to').should('be.checked');
      resourceFilters.findFilter('how-to').uncheck();

      // QuickStart
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('quickstart').should('not.be.checked');
      resourceFilters.findFilter('quickstart').check();
      cardView.findCardItems().should('have.length', 2);
      resourcesToolbar.findListToggleButton().click();
      listView.findListItems().should('have.length', 2);
      resourceFilters.findFilter('quickstart').should('be.checked');
      resourceFilters.findFilter('quickstart').uncheck();

      // Tutorial
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('tutorial').should('not.be.checked');
      resourceFilters.findFilter('tutorial').check();
      cardView.find().should('not.exist');
      resourcesToolbar.findListToggleButton().click();
      listView.find().should('not.exist');
      resourceFilters.findFilter('tutorial').should('be.checked');
      resourceFilters.findFilter('tutorial').uncheck();

      // Provider and Provider type filters
      cy.step('Provider and Provider type filters');

      // Jupyter
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('Jupyter').should('not.be.checked');
      resourceFilters.findFilter('Jupyter').check();
      cardView.findCardItems().should('have.length', 7);
      resourcesToolbar.findListToggleButton().click();
      listView.findListItems().should('have.length', 7);
      resourceFilters.findFilter('Jupyter').should('be.checked');
      resourceFilters.findFilter('Jupyter').uncheck();

      // Red Hat managed
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('Red Hat managed').should('not.be.checked');
      resourceFilters.findFilter('Red Hat managed').check();
      cardView.findCardItems().should('have.length', 7);
      resourcesToolbar.findListToggleButton().click();
      listView.findListItems().should('have.length', 7);
      resourceFilters.findFilter('Red Hat managed').should('be.checked');
      resourceFilters.findFilter('Red Hat managed').uncheck();

      // Check more than one filter
      cy.step('Use more than one filter');
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('how-to').should('not.be.checked');
      resourceFilters.findFilter('how-to').check();
      resourceFilters.findFilter('documentation').should('not.be.checked');
      resourceFilters.findFilter('documentation').check();
      cardView.findCardItems().should('have.length', 5);
      resourcesToolbar.findListToggleButton().click();
      listView.findListItems().should('have.length', 5);
    },
  );
});
