import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { resources } from '#~/__tests__/cypress/cypress/pages/resources';
import { verifyResourcesForFilter } from '#~/__tests__/cypress/cypress/utils/resourceUtils';
import {
  getEnabledResourceCount,
  getDisabledResourceCount,
  getDocumentationResourceCount,
  getHowToResourceCount,
  getQuickstartResourceCount,
  getTutorialResourceCount,
  getRedHatManagedResourceCount,
  getElasticResourceCount,
  getIBMResourceCount,
  getIntelResourceCount,
  getNVIDIAResourceCount,
  getPachydermResourceCount,
  getRedHatResourceCount,
  getStarburstResourceCount,
  getSelfManagedResourceCount,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/learningResources';

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

      // Verify backend state for enabled resources (documents + quickstarts + dynamic docs)
      getEnabledResourceCount();

      // Enabled filter
      verifyResourcesForFilter('enabled-filter-checkbox');

      // Verify backend state for disabled applications
      getDisabledResourceCount();

      // Not enabled filter
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('not-enabled-filter-checkbox');

      // Verify Resource type filter
      cy.step('Resource type filter for card and list view');

      // Verify backend state for documentation resources
      getDocumentationResourceCount();

      // Documentation
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('documentation');

      // Verify backend state for how-to resources
      getHowToResourceCount();

      // HowTo
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('how-to');

      // Verify backend state for quickstart resources
      getQuickstartResourceCount();

      // QuickStart
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('quickstart');

      // Verify backend state for tutorial resources
      getTutorialResourceCount();

      // Tutorial
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('tutorial');

      // Provider and Provider type filters
      cy.step('Provider and Provider type filters');

      // Verify backend state for Red Hat managed resources
      getRedHatManagedResourceCount();

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

  it(
    'Test RHOAI-specific filters',
    { tags: ['@Sanity', '@SanitySet1', '@Dashboard', '@Maintain'] },
    () => {
      // Skips this test if not running on RHOAI
      const applicationsNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
      if (applicationsNamespace === 'opendatahub') {
        cy.log(
          `Skipping RHOAI-specific filter test. Applications namespace: ${applicationsNamespace}`,
        );
        return;
      }

      // Navigate to Resources
      cy.step('Navigate to Resources tab');
      resources.visit();

      // RHOAI-specific provider filters
      cy.step('Test RHOAI-specific provider filters');

      // Verify backend state for Elastic resources
      getElasticResourceCount();

      // Elastic
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Elastic');

      // Verify backend state for IBM resources
      getIBMResourceCount();

      // IBM
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('IBM');

      // Verify backend state for Intel® resources
      getIntelResourceCount();

      // Intel®
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Intel®');

      // Verify backend state for NVIDIA resources
      getNVIDIAResourceCount();

      // NVIDIA
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('NVIDIA');

      // Verify backend state for Pachyderm resources
      getPachydermResourceCount();

      // Pachyderm
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Pachyderm');

      // Verify backend state for Red Hat resources
      getRedHatResourceCount();

      // Red Hat
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Red Hat');

      // Verify backend state for Starburst resources
      getStarburstResourceCount();

      // Starburst
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Starburst');

      // Verify backend state for Self-managed resources
      getSelfManagedResourceCount();

      // Self-managed
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter('Self-managed');
    },
  );
});
