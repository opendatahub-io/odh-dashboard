import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal.ts';
import { featureDataSetsTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureDataSet.ts';
import { featureDataSourcesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureDataSource.ts';
import { featureEntitiesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntities';
import { featuresTable } from '#~/__tests__/cypress/cypress/pages/featureStore/features.ts';
import { featureViewsTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureView.ts';
import { featureServicesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureService.ts';
import { featureStoreOverview } from '#~/__tests__/cypress/cypress/pages/featureStore/overview.ts';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import type { FeatureStoreTestData } from '#~/__tests__/cypress/cypress/types';
import { createFeatureStoreCR } from '#~/__tests__/cypress/cypress/utils/oc_commands/featureStoreResources.ts';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Feature Store Smoke Tests', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as FeatureStoreTestData;
      },
    );
  });

  it(
    'Verify Feature Store Default Empty State Contents',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.step('Login to the Application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Feature Store page `);
      featureStoreGlobal.navigateToOverview();

      testData.feastNavItems.forEach((item: string) => {
        cy.step(`Navigate to ${item}`);
        appChrome.findNavItem(item).click();
        featureStoreGlobal.shouldHaveEmptyStateDescription();
      });
    },
  );

  it(
    `Verify Feature Store UI Page Contents with Data`,
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.step('Setup test environment with feature store');
      projectName = `${testData.projectName}-${uuid}`;
      createCleanProject(projectName);
      createFeatureStoreCR(projectName, testData.feastInstanceName);

      try {
        cy.step('Login to the Application');
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step(`Navigate to the Feature Store page `);
        featureStoreGlobal.navigateToOverview();
        // Overview Page
        cy.step('Verify Overview Page');
        featureStoreOverview.findMetricsTab().should('be.visible');
        featureStoreOverview.findLineageTab().should('be.visible');

        // Entities Page
        cy.step('Verify Entities Page');
        featureStoreGlobal.navigateToEntities();
        featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
        featureStoreGlobal.shouldHavePageDescription();
        featureEntitiesTable.shouldHaveEntityCount(4);

        // Datasets Page
        cy.step('Verify Datasets Page');
        featureStoreGlobal.navigateToDatasets();
        featureStoreGlobal.shouldHavePageDescription();
        featureDataSetsTable.findTable().should('be.visible');
        featureDataSetsTable.shouldHaveDataSetCount(9);

        // Data Sources Page
        cy.step('Verify Data Sources Page');
        featureStoreGlobal.navigateToDataSources();
        featureStoreGlobal.shouldHavePageDescription();
        featureDataSourcesTable.shouldHaveDataSourceCount(5);

        // Features Page
        cy.step('Verify Features Page');
        featureStoreGlobal.navigateToFeatures();
        featureStoreGlobal.shouldHavePageDescription();
        featuresTable.shouldHaveFeatureCount(10);

        // Feature Views Page
        cy.step('Verify Feature Views Page');
        featureStoreGlobal.navigateToFeatureViews();
        featureStoreGlobal.shouldHavePageDescription();
        featureViewsTable.shouldHaveFeatureViewCount(8);

        // Feature Services Page
        cy.step('Verify Feature Services Page');
        featureStoreGlobal.navigateToFeatureServices();
        featureStoreGlobal.shouldHavePageDescription();
        featureServicesTable.shouldHaveFeatureServiceCount(9);
      } finally {
        cy.step('Cleanup test environment');
        deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
      }
    },
  );
});
