import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { featureStoreGlobal } from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal.ts';
import { featureDataSetsTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureDataSet.ts';
import { featureDataSourcesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureDataSource.ts';
import { featureEntitiesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureEntities';
import { featuresTable } from '#~/__tests__/cypress/cypress/pages/featureStore/features.ts';
import { featureViewsTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureView.ts';
import { featureServicesTable } from '#~/__tests__/cypress/cypress/pages/featureStore/featureService.ts';
import type { FeatureStoreTestData } from '#~/__tests__/cypress/cypress/types';
import { createFeatureStoreCR } from '#~/__tests__/cypress/cypress/utils/oc_commands/featureStoreResources.ts';
import { waitForPodReady } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Feature Store UI default content validation', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
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

        createFeatureStoreCR(projectName);
        waitForPodReady('feast-test-s3', '300s');
      });
  });

  after(() => {
    cy.log(`Deleting Namespace: ${projectName}`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    `Verify Feature Store UI default contents across all pages`,
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      // Overview Page
      cy.step('Verify Overview Page');
      featureStoreGlobal.visitFeatureStore(testData.feastCreditScoringProject);
      cy.contains('Metrics').should('be.visible');
      cy.contains('Lineage').should('be.visible');

      // Entities Page
      cy.step('Verify Entities Page');
      featureStoreGlobal.navigateToEntities();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      cy.contains(
        'Select a feature store repository to view and manage its entities. Entities are collections of related features and can be mapped to your use case (for example, customers, products, transactions).',
      ).should('be.visible');
      featureEntitiesTable.shouldHaveEntityCount(4);

      // Datasets Page
      cy.step('Verify Datasets Page');
      featureStoreGlobal.navigateToDatasets();
      cy.contains(
        'View and manage datasets created from feature services. Datasets are point-in-time-correct snapshots of feature services,data and are used for training, or validation, and analysis.',
      ).should('be.visible');
      featureDataSetsTable.findTable().should('be.visible');
      featureDataSetsTable.shouldHaveDataSetCount(9);

      cy.step('Verify Data Sources Page');
      featureStoreGlobal.navigateToDataSources();
      cy.contains(
        'Select a workspace to view and manage its data sources. Data sources provide the raw data that feeds into your feature store.',
      ).should('be.visible');
      featureDataSourcesTable.shouldHaveDataSourceCount(5);

      // Features Page
      cy.step('Verify Features Page');
      featureStoreGlobal.navigateToFeatures();
      cy.contains(
        'Select a feature store repository to view its features. A feature is a schema containing a name and a type, and is used to represent the data stored in feature views for both training and serving purposes.',
      ).should('be.visible');
      featuresTable.shouldHaveFeatureCount(10);

      // Feature Views Page
      cy.step('Verify Feature Views Page');
      featureStoreGlobal.navigateToFeatureViews();
      cy.contains(
        'Select a feature store repository to view and manage its feature views. A feature view defines how to retrieve a logical group of features from a specific data source. It binds a data source to one or more entities and contains the logic for transforming the raw data into feature values.',
      ).should('be.visible');
      featureViewsTable.shouldHaveFeatureViewCount(8);

      // Feature Services Page
      cy.step('Verify Feature Services Page');
      featureStoreGlobal.navigateToFeatureServices();
      cy.contains(
        "Select a feature store repository to view and manage its feature services. Feature services groups features from across one or more Feature Views to serve a specific model's needs for training, inference, or GenAI applications like RAG. Feature service acts as a managed API for a model, ensuring features are served consistently.",
      ).should('be.visible');
      featureServicesTable.shouldHaveFeatureServiceCount(9);
    },
  );
});
