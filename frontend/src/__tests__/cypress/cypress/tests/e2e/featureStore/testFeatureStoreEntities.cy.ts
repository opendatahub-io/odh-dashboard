import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadFeatureStoreEntitiesFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import type { FeatureStoreEntitiesTestData } from '#~/__tests__/cypress/cypress/types';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import { featureEntitiesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntities';
import { featureEntityDetails } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntityDetails';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  createFeatureStoreDeploymentViaYAML,
  deleteFeatureStoreResources,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/featureStore';

describe('FeatureStore Entities E2E Tests', () => {
  let testData: FeatureStoreEntitiesTestData;
  let testNamespace: string;
  let featureStoreNames: string[];
  let projectName: string;

  before(() => {
    cy.step('Load test data from fixture');
    loadFeatureStoreEntitiesFixture('e2e/featureStore/testFeatureStoreEntities.yaml').then(
      (fixtureData) => {
        testData = fixtureData;
        testNamespace = testData.namespace;
        featureStoreNames = testData.featureStoreNames;
        projectName = testData.projectName;
      },
    );
  });

  retryableBefore(() => {
    cy.step('Create FeatureStore deployment and verify readiness');
    createFeatureStoreDeploymentViaYAML().should('be.true');
  });

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Clean up FeatureStore resources');
    deleteFeatureStoreResources(featureStoreNames, testNamespace, {
      wait: false,
      ignoreNotFound: true,
    });
  });

  it(
    'Navigates to FeatureStore Entities and verifies basic functionality',
    {
      tags: ['@FeatureStore', '@Dashboard', '@FeatureFlagged'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to FeatureStore Entities');
      featureStoreGlobal.visitEntities();

      cy.step('Verify project selector is available and select a project');
      featureStoreGlobal.findProjectSelector().should('be.visible');
      featureStoreGlobal.selectProject(projectName);
    },
  );

  it(
    'Displays and interacts with the Entities table',
    {
      tags: ['@FeatureStore', '@Dashboard', '@FeatureFlagged'],
    },
    () => {
      cy.step('Log into the application and navigate to Entities');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      featureStoreGlobal.visitEntities(projectName);

      cy.step('Verify Entities table is present');
      featureEntitiesTable.findTable().should('be.visible');

      cy.step('Verify all expected columns are present');
      featureEntitiesTable
        .findRows()
        .first()
        .within(() => {
          testData.expectedColumns.forEach((columnName) => {
            cy.get(`[data-label="${columnName}"]`).should('exist');
          });
        });

      cy.step('Test entity filtering functionality');
      const toolbar = featureEntitiesTable.findToolbar();
      toolbar.findSearchInput().should('be.visible');

      cy.step('Test search functionality with validation');
      featureEntitiesTable
        .findRows()
        .its('length')
        .then((initialCount) => {
          toolbar.findSearchInput().type(testData.searchTerm);

          featureEntitiesTable.findRows().each(($row) => {
            cy.wrap($row).should('contain.text', testData.searchTerm);
          });

          featureEntitiesTable.findRows().should('have.length.at.most', initialCount);
          featureEntitiesTable.findToolbarClearFiltersButton().click();
          featureEntitiesTable.findRows().should('have.length', initialCount);
        });
    },
  );

  it(
    'Navigates to entity details and verifies functionality',
    {
      tags: ['@FeatureStore', '@Dashboard', '@FeatureFlagged'],
    },
    () => {
      cy.step('Log into the application and navigate to Entities');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      featureStoreGlobal.visitEntities(projectName);

      cy.step('Check if entities are available for detailed testing');
      featureEntitiesTable.findTable().should('be.visible');

      cy.get('body').then(($body) => {
        const entityRows = $body.find('tbody tr');

        if (entityRows.length > 0) {
          cy.step('Click on first entity to view details');
          featureEntitiesTable
            .findRows()
            .first()
            .within(() => {
              cy.get(`[data-label="${testData.expectedColumns[0]}"] a`).first().click();
            });

          cy.step('Verify entity details page loads');
          cy.url().should('include', '/featureStore/entities');
          featureEntityDetails.findPageTitle().should('be.visible');

          cy.step('Verify entity details page has expected sections');
          featureEntityDetails.findValueType().should('be.visible');
          featureEntityDetails.findJoinKey().should('be.visible');

          cy.step('Verify Feature Views tab is accessible and functional');
          featureEntityDetails.findFeatureViewsTab().should('be.visible').click();
          featureEntityDetails.findFeatureViewsTabContent().should('be.visible');
        }
      });
    },
  );
});
