import yaml from 'js-yaml';

import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal.ts';
import { featureEntitiesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntities';
import { featuresTable } from '#~/__tests__/cypress/cypress/pages/featureStore/features.ts';
import { featureViewsTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureView.ts';
import { featureServicesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureService.ts';
import type { FeatureStoreTestData, AWSS3BucketDetails } from '#~/__tests__/cypress/cypress/types';
import { createFeatureStoreCR } from '#~/__tests__/cypress/cypress/utils/oc_commands/featureStoreResources.ts';
import { waitForPodReady } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Verify Feature Store Default Page Contents', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
  let s3Config: AWSS3BucketDetails;
  let s3AccessKey: string;
  let s3SecretKey: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    const bucketConfig = AWS_BUCKETS.BUCKET_1;
    s3Config = bucketConfig;
    s3AccessKey = AWS_BUCKETS.AWS_ACCESS_KEY_ID;
    s3SecretKey = AWS_BUCKETS.AWS_SECRET_ACCESS_KEY;

    cy.fixture('e2e/featureStoreResources/testFeatureStoreResources.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as FeatureStoreTestData;
        projectName = `${testData.projectName}-${uuid}`;
      })
      .then(() => {
        cy.log(`Creating Namespace: ${projectName}`);
        createCleanProject(projectName);

        createFeatureStoreCR(s3AccessKey, s3SecretKey, s3Config.NAME, s3Config.REGION, projectName);
        waitForPodReady('feast-test-s3', '300s');
      });
  });

  after(() => {
    cy.log(`Deleting Namespace: ${projectName}`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify Feature Store UI default contents across all pages',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      // Overview Page
      cy.step('Verify Overview Page');
      featureStoreGlobal.visitOverview(testData.feastCreditScoringProject);
      // cy.contains(
      //   'A catalog of features, entities, feature views and datasets created by your team',
      // ).should('be.visible');
      cy.contains('Metrics').should('be.visible');
      cy.contains('Lineage').should('be.visible');

      // Entities Page
      cy.step('Verify Entities Page');
      featureStoreGlobal.navigateToEntities();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.contains('Select a workspace to view and manage its entities.').should('be.visible');
      featureEntitiesTable.shouldHaveEntityCount(4);

      // Features Page
      cy.step('Verify Features Page');
      featureStoreGlobal.navigateToFeatures();
      cy.contains('Select a feature store to view its features.').should('be.visible');
      featuresTable.shouldHaveFeatureCount(10);

      // Feature Views Page
      cy.step('Verify Feature Views Page');
      featureStoreGlobal.navigateToFeatureViews();
      cy.contains('Select a feature store workspace to view and manage its feature views.').should(
        'be.visible',
      );
      featureViewsTable.shouldHaveFeatureViewCount(8);

      // Feature Services Page
      cy.step('Verify Feature Services Page');
      featureStoreGlobal.navigateToFeatureServices();
      cy.contains('Select a workspace to view and manage its feature services.').should(
        'be.visible',
      );
      featureServicesTable.shouldHaveFeatureServiceCount(9);
    },
  );
});
