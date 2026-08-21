import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';
import { shouldHaveTotalCount } from '../../../utils/featureStoreUtils';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import type { FeatureStoreTestData } from '../../../types';
import {
  applyFeastPermissionViaSdk,
  createFeatureStoreCR,
  createRouteAndGetUrl,
  createSavedDatasetViaSdk,
} from '../../../utils/oc_commands/featureStoreResources';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  getAllFeatureStoreCounts,
  getMetricsResourceCounts,
} from '../../../utils/api/featureStoreRest';
import { featureMetricsOverview } from '../../../pages/featureStore/featureMetrics';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { createRegistryStep, deleteFeastRegistryFiles } from '../../../utils/oc_commands/s3Cleanup';
import { AWS_BUCKETS } from '../../../utils/s3Buckets';

describe('Feature Store Page Validation', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
  let featureCount: number;
  let entityCount: number;
  let datasetCount: number;
  let dataSourceCount: number;
  let featureViewCount: number;
  let featureServiceCount: number;
  let metricsFeatureCount: number;
  let metricsEntityCount: number;
  let metricsDatasetCount: number;
  let metricsDataSourceCount: number;
  let metricsFeatureViewCount: number;
  let metricsFeatureServiceCount: number;
  let skipTest = false;
  const uuid = generateTestUUID();

  const shouldSkip = () => {
    if (skipTest) {
      cy.log('Skipping test - Feature Store is RHOAI-specific and not available on ODH.');
      return true;
    }
    return false;
  };

  retryableBefore(() => {
    // Skip on ODH (test is RHOAI-specific)
    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found, skipping the test (Feature Store is RHOAI-specific).');
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as FeatureStoreTestData;
          projectName = `${testData.projectName}-${uuid}`;
        })
        .then(() => {
          cy.log(`Creating Namespace: ${projectName}`);
          createCleanProject(projectName);

          // Feast NamespaceBasedPolicy only authorizes users with admin RoleBindings
          // in the permitted namespace. Grant both the oc CLI user (REST count calls)
          // and the dashboard login user (UI) admin on this project.
          return cy.exec('oc whoami', { failOnNonZeroExit: false }).then((whoami) => {
            const ocUser = whoami.stdout.trim();
            if (ocUser) {
              return addUserToProject(projectName, ocUser, 'admin').then(() =>
                addUserToProject(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME, 'admin'),
              );
            }
            return addUserToProject(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME, 'admin');
          });
        })
        .then(() => {
          createRegistryStep(projectName);
          createFeatureStoreCR(projectName, testData.feastInstanceName);
        })
        .then(() => {
          return createRouteAndGetUrl(projectName, testData.feastInstanceName).then((routeUrl) => {
            const buckets =
              (Cypress.env('AWS_PIPELINES') as typeof AWS_BUCKETS | undefined) ?? AWS_BUCKETS;
            const { NAME: awsBucketName } = buckets.BUCKET_1;
            if (!awsBucketName) {
              throw new Error(
                'AWS_PIPELINES.BUCKET_1.NAME is empty. Export CY_TEST_CONFIG to packages/cypress/test-variables.yml before running E2E.',
              );
            }

            return applyFeastPermissionViaSdk(projectName, testData.feastInstanceName, {
              name: 'feast-auth',
              namespaces: [projectName],
            }).then(() => {
              return createSavedDatasetViaSdk(projectName, testData.feastInstanceName, {
                name: testData.datasetName,
                project: testData.feastCreditScoringProject,
                storagePath: `s3://${awsBucketName}/feast-test/${projectName}/credit_scoring_local/datasets/${testData.datasetName}.parquet`,
                featureServiceName: testData.featureServiceName,
              }).then(() => {
                return getMetricsResourceCounts(routeUrl, testData.feastCreditScoringProject).then(
                  (metricsCounts) => {
                    metricsFeatureCount = metricsCounts.featureCount;
                    metricsEntityCount = metricsCounts.entityCount;
                    metricsDatasetCount = metricsCounts.datasetCount;
                    metricsDataSourceCount = metricsCounts.dataSourceCount;
                    metricsFeatureViewCount = metricsCounts.featureViewCount;
                    metricsFeatureServiceCount = metricsCounts.featureServiceCount;

                    return getAllFeatureStoreCounts(
                      routeUrl,
                      testData.feastCreditScoringProject,
                    ).then((listCounts) => {
                      featureCount = listCounts.featureCount;
                      entityCount = listCounts.entityCount;
                      datasetCount = listCounts.datasetCount;
                      dataSourceCount = listCounts.dataSourceCount;
                      featureViewCount = listCounts.featureViewCount;
                      featureServiceCount = listCounts.featureServiceCount;

                      cy.log(`Metrics counts: ${JSON.stringify(metricsCounts)}`);
                      cy.log(`List counts: ${JSON.stringify(listCounts)}`);
                      return cy.wrap({ metricsCounts, listCounts });
                    });
                  },
                );
              });
            });
          });
        });
    });
  });

  after(() => {
    if (shouldSkip()) {
      cy.log('Skipping cleanup: Tests were skipped');
      return;
    }

    cy.log(`Removing S3 registry files for: ${projectName}`);
    deleteFeastRegistryFiles(projectName);

    cy.log(`Deleting Namespace: ${projectName}`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Navigates through Feature Store pages and verifies that the data count is displayed correctly',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureStoreCI', '@Sanity', '@SanitySet1'] },
    () => {
      if (shouldSkip()) {
        return;
      }

      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Feature Store Overview page`);
      featureStoreGlobal.navigateToOverview();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify Metrics contents count is displayed correctly`);
      featureMetricsOverview.findEntitiesCard().should('contain.text', metricsEntityCount);
      featureMetricsOverview.findDataSourcesCard().should('contain.text', metricsDataSourceCount);
      featureMetricsOverview.findSavedDatasetsCard().should('contain.text', metricsDatasetCount);
      featureMetricsOverview.findFeaturesCard().should('contain.text', metricsFeatureCount);
      featureMetricsOverview.findFeatureViewsCard().should('contain.text', metricsFeatureViewCount);
      featureMetricsOverview
        .findFeatureServicesCard()
        .should('contain.text', metricsFeatureServiceCount);

      cy.step(`Navigate to the Feature Store Entities page`);
      featureStoreGlobal.navigateToEntities();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify entities count is displayed correctly`);
      shouldHaveTotalCount(entityCount);

      cy.step(`Navigate to the Feature Store Data Sources page`);
      featureStoreGlobal.navigateToDataSources();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify data sources count is displayed correctly`);
      shouldHaveTotalCount(dataSourceCount);

      cy.step(`Navigate to the Feature Store Datasets page`);
      featureStoreGlobal.navigateToDatasets();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.step(`Verify datasets count is displayed correctly`);
      shouldHaveTotalCount(datasetCount);

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
