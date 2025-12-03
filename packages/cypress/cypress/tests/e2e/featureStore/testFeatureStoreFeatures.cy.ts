import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';
import { shouldHaveTotalCount } from '../../../utils/featureStoreUtils';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import type { FeatureStoreTestData } from '../../../types';
import {
  createFeatureStoreCR,
  createRouteAndGetUrl,
} from '../../../utils/oc_commands/featureStoreResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { getAllFeatureStoreCounts } from '../../../utils/api/featureStoreRest';
import { featureMetricsOverview } from '../../../pages/featureStore/featureMetrics';

describe('Feature Store Page Validation', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
  let featureCount: number;
  let entityCount: number;
  let datasetCount: number;
  let dataSourceCount: number;
  let featureViewCount: number;
  let featureServiceCount: number;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as FeatureStoreTestData;
        projectName = `${testData.projectName}-${uuid}`;
      })
      .then(() => {
        cy.log(`Creating Namespace: ${projectName}`);
        createCleanProject(projectName);
        createFeatureStoreCR(projectName, testData.feastInstanceName);
      })
      .then(() => {
        // Create route and fetch counts for the Feast instance
        return createRouteAndGetUrl(projectName, testData.feastInstanceName).then((routeUrl) => {
          return getAllFeatureStoreCounts(routeUrl, testData.feastCreditScoringProject).then(
            (feastInstanceCounts) => {
              // Assign all counts from the returned object
              featureCount = feastInstanceCounts.featureCount;
              entityCount = feastInstanceCounts.entityCount;
              datasetCount = feastInstanceCounts.datasetCount;
              dataSourceCount = feastInstanceCounts.dataSourceCount;
              featureViewCount = feastInstanceCounts.featureViewCount;
              featureServiceCount = feastInstanceCounts.featureServiceCount;

              cy.log('Counts assigned successfully:', feastInstanceCounts);
              return cy.wrap(feastInstanceCounts);
            },
          );
        });
      });
  });

  after(() => {
    cy.log(`Deleting Namespace: ${projectName}`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Navigates through Feature Store pages and verifies that the data count is displayed correctly',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Feature Store Overview page`);
      featureStoreGlobal.navigateToOverview();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify Metrics contents count is displayed correctly`);
      featureMetricsOverview.findEntitiesCard().should('contain.text', entityCount);
      featureMetricsOverview.findDataSourcesCard().should('contain.text', dataSourceCount);
      featureMetricsOverview.findSavedDatasetsCard().should('contain.text', datasetCount);
      featureMetricsOverview.findFeaturesCard().should('contain.text', featureCount);
      featureMetricsOverview.findFeatureServicesCard().should('contain.text', featureServiceCount);

      cy.step(`Navigate to the Feature Store Entities page`);
      featureStoreGlobal.navigateToEntities();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify entities count is displayed correctly`);
      shouldHaveTotalCount(entityCount);

      cy.step(`Navigate to the Feature Store Datasets page`);
      featureStoreGlobal.navigateToDatasets();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify datasets count is displayed correctly`);
      shouldHaveTotalCount(datasetCount);

      cy.step(`Navigate to the Feature Store Data Sources page`);
      featureStoreGlobal.navigateToDataSources();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify data sources count is displayed correctly`);
      shouldHaveTotalCount(dataSourceCount);

      cy.step(`Navigate to the Feature Store Features page`);
      featureStoreGlobal.navigateToFeatures();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify features count is displayed correctly`);
      shouldHaveTotalCount(featureCount);

      cy.step(`Navigate to the Feature Store Feature Views page`);
      featureStoreGlobal.navigateToFeatureViews();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify feature views count is displayed correctly`);
      shouldHaveTotalCount(featureViewCount);

      cy.step(`Navigate to the Feature Store Feature Services page`);
      featureStoreGlobal.navigateToFeatureServices();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify feature services count is displayed correctly`);
      shouldHaveTotalCount(featureServiceCount);
    },
  );
});
