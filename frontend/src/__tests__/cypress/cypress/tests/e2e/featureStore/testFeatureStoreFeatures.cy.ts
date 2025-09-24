import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  featureStoreInteractiveHover,
  featureStoreGlobal,
} from '#~/__tests__/cypress/cypress/pages/featureStore/featureStoreGlobal';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { featuresTable } from '#~/__tests__/cypress/cypress/pages/featureStore/features.ts';
import { featureDetails } from '#~/__tests__/cypress/cypress/pages/featureStore/featuresDetails';
import {
  featureViewsTable,
  featureViewsPage,
} from '#~/__tests__/cypress/cypress/pages/featureStore/featureView.ts';
import type { FeatureStoreTestData } from '#~/__tests__/cypress/cypress/types';
import {
  createFeatureStoreCR,
  createRouteAndGetUrl,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/featureStoreResources.ts';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import { getFeatureCount } from '#~/__tests__/cypress/cypress/utils/api/featureStoreRest.ts';

describe('Feature Store Features Page Validation', () => {
  let testData: FeatureStoreTestData;
  let projectName: string;
  let featureCount: number;
  const uuid = generateTestUUID();
  const testFeatureName = 'city';
  const testFeatureValueType = 'String';
  const testFeatureView = 'zipcode_features';
  const testFeatureDescription = 'City name for the ZIP code';

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
        // Create route and fetch feature count
        return createRouteAndGetUrl(projectName, testData.feastInstanceName).then((routeUrl) => {
          return getFeatureCount(routeUrl, testData.feastCreditScoringProject).then((count) => {
            featureCount = count;
            cy.log(`Feature count saved: ${featureCount}`);
            return cy.wrap(count);
          });
        });
      });
  });

  after(() => {
    cy.log(`Deleting Namespace: ${projectName}`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Should display Features and allow searching, navigation, and validate Feature details',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Feature Store page `);
      featureStoreGlobal.navigate().navigateToFeatures();
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);
      featuresTable.findTable().should('be.visible');
      featureStoreGlobal.shouldHaveTotalCount(featureCount);
      featuresTable.shouldHaveExpectedColumns(testData.expectedFeaturesColumns);
      const featureToolbar = featuresTable.findToolbar();
      featureToolbar.findSearchInput().type(testFeatureName);
      featuresTable.shouldHaveFeatureCount(1);
      featuresTable.findRow(testFeatureName).shouldHaveFeatureName(testFeatureName);
      featuresTable.findRow(testFeatureName).shouldHaveValueType(testFeatureValueType);
      featuresTable.findRow(testFeatureName).shouldHaveFeatureView(testFeatureView);
      featuresTable.findRow(testFeatureName).shouldHaveProject(testData.feastCreditScoringProject);
      featuresTable
        .findRow(testFeatureName)
        .findFeatureView()
        .should('contain.text', testFeatureView);
      featuresTable.findRow(testFeatureName).findFeatureLink().click();

      //verify details page
      featureDetails.findBreadcrumbLink().should('be.visible').should('contain.text', 'Features');
      featureDetails
        .findBreadcrumbItem()
        .should('be.visible')
        .should('contain.text', testFeatureName);
      featureDetails
        .shouldHavePageTitle(testFeatureName)
        .shouldHaveApplicationsPageDescription(testFeatureDescription)
        .shouldHaveTabsExist()
        .shouldHaveTabsVisibleAndClickable()
        .shouldHaveFeatureValueType(testFeatureValueType)
        .shouldHaveFeatureTypeLabel('Value type')
        .shouldHaveFeatureInteractiveExample()
        .shouldHaveFeatureTagsTitle()
        .shouldHaveFeatureTagsVisible();
      featureDetails.shouldHaveInteractiveCodeContentVisible(testFeatureName);

      // Verify Features tooltip of copy to clipboard and success message after click
      featureStoreInteractiveHover.shouldHaveInteractiveHoverTooltip(testFeatureName);
      featureStoreInteractiveHover.shouldHaveInteractiveClickSuccessTooltip(testFeatureName);
    },
  );

  it(
    'Should validate Feature Views tab functionality in Features Page and details',
    { tags: ['@Dashboard', '@FeatureStore', '@FeatureFlagged'] },
    () => {
      cy.step(`Navigate to the Feature Store page and access Feature Views`);
      cy.step('Login to the Application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Feature Store page `);
      featureStoreGlobal.navigate().navigateToFeatures();
      featuresTable.findTable().should('be.visible');
      featureStoreGlobal.selectProject(testData.feastCreditScoringProject);

      // Navigate to a feature to access Feature Views tab
      const featureToolbar = featuresTable.findToolbar();
      featureToolbar.findSearchInput().type(testFeatureName);
      featuresTable.shouldHaveFeatureCount(1);
      featuresTable.findRow(testFeatureName).findFeatureLink().click();

      // verify feature views tab
      featureDetails.clickFeatureViewsTab();
      const expectedFeatureViewsColumns = ['Feature View', 'Tags', 'Feature Services', 'Updated'];
      featureViewsTable.shouldHaveExpectedColumns(expectedFeatureViewsColumns);
      featureViewsTable.shouldHaveFeatureViewCount(1);
      const featureviewToolbar = featureViewsTable.findToolbar();
      featureviewToolbar.findSearchInput().type(testFeatureView);

      const row = featureViewsTable.findRow(testFeatureView);
      row.shouldHaveFeatureViewName(testFeatureView);
      row.shouldHaveTagsVisible();
      row.shouldHaveUpdatedDate('2025');
      row.shouldHaveFeatureServicesCount(4);
      row.clickFeatureViewLink();
      featureViewsPage.shouldHaveBreadcrumbLink('Feature views');
      featureViewsPage.shouldHaveBreadcrumbItem(testFeatureView);
      featureViewsPage.shouldHaveFeatureViewsPageTitle(testFeatureView);
    },
  );
});
