import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { resources } from '~/__tests__/cypress/cypress/pages/resources';

const listView = resources.getListView();
const cardView = resources.getCardView();

const resourcesToolbar = resources.getLearningCenterToolbar();
const resourceFilters = resources.getLearningCenterFilters();

const verifyResourceCountMatchesView = (
  filterId: string,
  getViewItems: () => Cypress.Chainable<JQuery<HTMLElement>>,
  getParentView: () => Cypress.Chainable<JQuery<HTMLElement>>,
) => {
  resourceFilters.findResourceCountById(filterId).then((resourceCount) => {
    if (resourceCount === 0) {
      getParentView().should('not.exist');
    } else {
      getViewItems().should('have.length', resourceCount);
    }
  });
};

describe('Resources page', () => {
  before(() => {
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
      verifyResourceCountMatchesView(
        'enabled-filter-checkbox',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'enabled-filter-checkbox',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('enabled-filter-checkbox').should('be.checked');
      resourceFilters.findFilter('enabled-filter-checkbox').uncheck();

      // Not enabled filter
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('not-enabled-filter-checkbox').should('not.be.checked');
      resourceFilters.findFilter('not-enabled-filter-checkbox').check();
      verifyResourceCountMatchesView(
        'not-enabled-filter-checkbox',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'not-enabled-filter-checkbox',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('not-enabled-filter-checkbox').should('be.checked');
      resourceFilters.findFilter('not-enabled-filter-checkbox').uncheck();

      // Verify Resource type filter
      cy.step('Resource type filter for card and list view');

      // Documentation
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('documentation').should('not.be.checked');
      resourceFilters.findFilter('documentation').check();
      verifyResourceCountMatchesView(
        'documentation',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'documentation',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('documentation').should('be.checked');
      resourceFilters.findFilter('documentation').uncheck();

      // HowTo
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('how-to').should('not.be.checked');
      resourceFilters.findFilter('how-to').check();
      verifyResourceCountMatchesView(
        'how-to',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'how-to',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('how-to').should('be.checked');
      resourceFilters.findFilter('how-to').uncheck();

      // QuickStart
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('quickstart').should('not.be.checked');
      resourceFilters.findFilter('quickstart').check();
      verifyResourceCountMatchesView(
        'quickstart',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'quickstart',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('quickstart').should('be.checked');
      resourceFilters.findFilter('quickstart').uncheck();

      // Tutorial
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('tutorial').should('not.be.checked');
      resourceFilters.findFilter('tutorial').check();
      verifyResourceCountMatchesView(
        'tutorial',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'tutorial',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('tutorial').should('be.checked');
      resourceFilters.findFilter('tutorial').uncheck();

      // Provider and Provider type filters
      cy.step('Provider and Provider type filters');

      // Jupyter
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('Jupyter').should('not.be.checked');
      resourceFilters.findFilter('Jupyter').check();
      verifyResourceCountMatchesView(
        'Jupyter',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'Jupyter',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('Jupyter').should('be.checked');
      resourceFilters.findFilter('Jupyter').uncheck();

      // Self-managed
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('Self-managed').should('not.be.checked');
      resourceFilters.findFilter('Self-managed').check();
      verifyResourceCountMatchesView(
        'Self-managed',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'Self-managed',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('Self-managed').should('be.checked');
      resourceFilters.findFilter('Self-managed').uncheck();

      // Red Hat managed
      resourcesToolbar.findCardToggleButton().click();
      resourceFilters.findFilter('Red Hat managed').should('not.be.checked');
      resourceFilters.findFilter('Red Hat managed').check();
      verifyResourceCountMatchesView(
        'Red Hat managed',
        () => cardView.findCardItems(),
        () => cardView.find(),
      );
      resourcesToolbar.findListToggleButton().click();
      verifyResourceCountMatchesView(
        'Red Hat managed',
        () => listView.findListItems(),
        () => listView.find(),
      );
      resourceFilters.findFilter('Red Hat managed').should('be.checked');
      resourceFilters.findFilter('Red Hat managed').uncheck();

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
