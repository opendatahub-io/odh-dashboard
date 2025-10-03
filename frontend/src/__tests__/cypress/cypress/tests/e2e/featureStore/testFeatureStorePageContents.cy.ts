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
import type { FeatureStoreTestData } from '#~/__tests__/cypress/cypress/types';
import {
  createFeatureStoreCR,
  createRoute,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/featureStoreResources.ts';
import {
  getEntityCount,
  getFeatureCount,
  getFeatureViewCount,
  getFeatureServiceCount,
  getDataSourceCount,
  getSavedDatasetCount,
} from '#~/__tests__/cypress/cypress/utils/api/featureStoreRest.ts';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Feature Store Smoke Tests to verify page contents', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8').then(
      (yamlContent: string) => {
        testData = yaml.load(yamlContent) as FeatureStoreTestData;
        cy.step('Setup test environment with feature store');
        projectName = `${testData.projectName}-${uuid}`;
        createCleanProject(projectName);
        createFeatureStoreCR(projectName, testData.feastInstanceName);

        // Create route and get all counts from API
        createRoute(projectName, testData.feastInstanceName);
        cy.get<string>('@routeUrl').then((routeUrl) => {
          getEntityCount(routeUrl, testData.feastCreditScoringProject);
          getSavedDatasetCount(routeUrl, testData.feastCreditScoringProject);
          getDataSourceCount(routeUrl, testData.feastCreditScoringProject);
          getFeatureCount(routeUrl, testData.feastDriverRankingProject);
          getFeatureViewCount(routeUrl, testData.feastCreditScoringProject);
          getFeatureServiceCount(routeUrl, testData.feastCreditScoringProject);
        });
      },
    );
  });

  after(() => {
    cy.step('Cleanup test environment');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    `Verify Feature Store UI Page Contents with Data`,
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.step('Login to the Application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Overview Page
      cy.step('Navigate to Feature Store and Verify Overview Page');
      featureStoreGlobal.navigate().navigateToOverview();
      featureStoreOverview.findMetricsTab().should('be.visible');
      featureStoreOverview.findLineageTab().should('be.visible');

      // Entities Page
      cy.step('Verify Entities Page');
      featureStoreGlobal.navigateToEntities();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      featureStoreGlobal.shouldHavePageDescription();
      cy.get<number>('@entityCount').then((entityCount) => {
        featureEntitiesTable.shouldHaveEntityCount(entityCount);
      });

      // Datasets Page
      cy.step('Verify Datasets Page');
      featureStoreGlobal.navigateToDatasets();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      featureStoreGlobal.shouldHavePageDescription();
      featureDataSetsTable.findTable().should('be.visible');
      cy.get<number>('@savedDatasetCount').then((count) => {
        featureDataSetsTable.shouldHaveDataSetCount(count);
      });

      // Data Sources Page
      cy.step('Verify Data Sources Page');
      featureStoreGlobal.navigateToDataSources();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      featureStoreGlobal.shouldHavePageDescription();
      cy.get<number>('@dataSourceCount').then((count) => {
        featureDataSourcesTable.shouldHaveDataSourceCount(count);
      });

      // Features Page
      cy.step('Verify Features Page');
      featureStoreGlobal.navigateToFeatures();
      featureStoreGlobal.selectProject(testData.feastDriverRankingProject);
      featureStoreGlobal.shouldHavePageDescription();
      cy.get<number>('@featureCount').then((count) => {
        featuresTable.shouldHaveFeatureCount(count);
      });

      // Feature Views Page
      cy.step('Verify Feature Views Page');
      featureStoreGlobal.navigateToFeatureViews();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      featureStoreGlobal.shouldHavePageDescription();
      cy.get<number>('@featureViewCount').then((count) => {
        featureViewsTable.shouldHaveFeatureViewCount(count);
      });

      // Feature Services Page
      cy.step('Verify Feature Services Page');
      featureStoreGlobal.navigateToFeatureServices();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      featureStoreGlobal.shouldHavePageDescription();
      cy.get<number>('@featureServiceCount').then((count) => {
        featureServicesTable.shouldHaveFeatureServiceCount(count);
      });
    },
  );
});
