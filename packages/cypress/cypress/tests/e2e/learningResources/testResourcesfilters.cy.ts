import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { resources } from '../../../pages/resources';
import { verifyResourcesForFilter } from '../../../utils/resourceUtils';
import {
  getEnabledResourceCount,
  getDisabledResourceCount,
  getRedHatManagedResourceCount,
  loadResourceTypeCount,
  loadRhoaiProviderCount,
} from '../../../utils/oc_commands/learningResources';
import { loadResourcesFiltersFixture } from '../../../utils/dataLoader';
import type { ResourcesFiltersTestData } from '../../../types';

const listView = resources.getListView();
const cardView = resources.getCardView();

const resourcesToolbar = resources.getLearningCenterToolbar();
const resourceFilters = resources.getLearningCenterFilters();

describe('Verify the filters on Resources page', () => {
  let filterData: ResourcesFiltersTestData;

  before(() => {
    loadResourcesFiltersFixture('e2e/learningResources/testResourcesFilters.yaml').then((data) => {
      filterData = data;
    });
  });

  it(
    'Test whether enabled, resource type, provider and provider type filters are working',
    { tags: ['@Tier1', '@Tier1Set1', '@ODS-489', '@Dashboard', '@LearningResourcesCI'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Resources tab');
      resources.navigate();

      cy.step('Check for Enabled and Not Enabled filters');
      getEnabledResourceCount();
      verifyResourcesForFilter(filterData.enabledFilterId);

      getDisabledResourceCount();
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter(filterData.notEnabledFilterId);

      cy.step('Resource type filter for card and list view');
      filterData.resourceTypeFilters.forEach((filterType) => {
        loadResourceTypeCount(filterType);
        resourcesToolbar.findCardToggleButton().click();
        verifyResourcesForFilter(filterType);
      });

      cy.step('Provider and Provider type filters');
      getRedHatManagedResourceCount();
      resourcesToolbar.findCardToggleButton().click();
      verifyResourcesForFilter(filterData.providerTypeFilter);

      cy.step('Use more than one filter');
      resourcesToolbar.findCardToggleButton().click();
      filterData.multiFilterIds.forEach((filterId) => {
        resourceFilters.findFilter(filterId).should('not.be.checked');
        resourceFilters.findFilter(filterId).check();
      });
      resourceFilters
        .findResourceCountById(filterData.multiFilterCountId)
        .then((resourceCount) =>
          cardView.findCardItems().should('have.length.at.least', resourceCount),
        );
      resourcesToolbar.findListToggleButton().click();
      resourceFilters
        .findResourceCountById(filterData.multiFilterCountId)
        .then((resourceCount) =>
          listView.findListItems().should('have.length.at.least', resourceCount),
        );
    },
  );

  it(
    'Test RHOAI-specific filters',
    { tags: ['@Tier1', '@Tier1Set1', '@Dashboard', '@LearningResourcesCI'] },
    () => {
      const applicationsNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
      if (applicationsNamespace === 'opendatahub') {
        cy.log(
          `Skipping RHOAI-specific filter test. Applications namespace: ${applicationsNamespace}`,
        );
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Resources tab');
      resources.navigate();

      cy.step('Test RHOAI-specific provider filters');
      filterData.rhoaiProviderFilters.forEach((provider) => {
        loadRhoaiProviderCount(provider);
        resourcesToolbar.findCardToggleButton().click();
        verifyResourcesForFilter(provider);
      });
    },
  );
});
