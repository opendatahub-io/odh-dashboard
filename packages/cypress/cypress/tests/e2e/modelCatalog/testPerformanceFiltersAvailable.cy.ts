import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import { modelDetailsPage } from '../../../pages/modelCatalog/modelDetailsPage';
import {
  checkPerformanceDataAvailable,
  detectModelCatalogNamespace,
  ensureModelCatalogSourceEnabled,
  waitForModelCatalogCards,
  waitForModelCatalogDeployment,
  waitForValidatedModelCards,
} from '../../../utils/oc_commands/modelCatalog';
import { retryableBefore } from '../../../utils/retryableHooks';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import type { ModelCatalogSourceTestData } from '../../../types';

describe('Verify Performance Filters are available on RHOAI', () => {
  let testData: ModelCatalogSourceTestData;
  let skipTest = false;

  retryableBefore(() => {
    // Check if the operator is RHOAI, if it's not (ODH), skip the test
    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log(
          'RHOAI operator not found, skipping the test (Validated models with performance data are RHOAI-specific).',
        );
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });

    // Check if model-catalog deployment exists and detect its namespace
    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.step('Detect model-catalog namespace');
      detectModelCatalogNamespace().then((foundNamespace) => {
        if (!foundNamespace) {
          cy.log('model-catalog deployment not found in any namespace, skipping test.');
          skipTest = true;
        } else {
          // Override the namespace for this test
          Cypress.env('MODEL_REGISTRY_NAMESPACE_OVERRIDE', foundNamespace);
          waitForModelCatalogDeployment();
        }
      });
    });

    // If not skipping, proceed with test setup
    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.fixture('e2e/modelCatalog/testSourceEnableDisable.yaml', 'utf8').then(
        (yamlContent: string) => {
          testData = yaml.load(yamlContent) as ModelCatalogSourceTestData;
          ensureModelCatalogSourceEnabled(testData.redhatAiSourceId);
        },
      );
    });
  });

  after(() => {
    if (skipTest) {
      cy.log('Skipping cleanup: Tests were skipped');
      return;
    }

    cy.step('Navigate back to Model Catalog and disable performance view toggle');
    modelCatalog.visit();
    waitForModelCatalogCards();

    // Check if toggle is ON and disable it
    modelCatalog.findPerformanceViewToggle().then(($toggle) => {
      if ($toggle.attr('aria-checked') === 'true') {
        modelCatalog.togglePerformanceView();
      }
    });
  });

  it(
    'Performance view toggle enables filters and shows benchmark data on validated models',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog'] },
    () => {
      if (skipTest) {
        cy.log(
          'Skipping test - Validated models with performance data are RHOAI-specific and not available on ODH.',
        );
        return;
      }

      cy.step('Login as admin user');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Catalog');
      modelCatalog.visit();

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step('Verify toggle exists and is OFF by default');
      modelCatalog.findFirstModelCatalogCard().should('exist');
      modelCatalog.findPerformanceViewToggle().should('exist');

      cy.step('Turn ON performance view toggle');
      modelCatalog.togglePerformanceView();

      cy.step('Verify performance filters appear');
      modelCatalog.findWorkloadTypeFilter().should('be.visible');
      modelCatalog.findLatencyFilter().should('be.visible');
      modelCatalog.findMaxRpsFilter().should('be.visible');

      cy.step('Check if performance data is available on this cluster');
      checkPerformanceDataAvailable(15000).then((count) => {
        if (count === 0) {
          cy.log(
            'No validated models with performance data found on this cluster. ' +
              'Performance/benchmark data must be present in the model-catalog deployment ' +
              'at /shared-benchmark-data/<source-id>/<model-name>/performance.ndjson',
          );
          cy.log('Skipping remaining test steps - performance data not available on this cluster.');
          skipTest = true;
        }
      });

      cy.then(() => {
        if (skipTest) {
          return;
        }

        cy.step('Wait for validated model cards with performance data to appear');
        waitForValidatedModelCards();
      });

      cy.then(() => {
        if (skipTest) {
          return;
        }

        cy.step('Find a validated model card and verify it shows metrics');
        modelCatalog.findValidatedModelCard().should('have.length.at.least', 1);
        modelCatalog
          .findValidatedModelCard()
          .first()
          .within(() => {
            modelCatalog.findValidatedModelHardware().should('be.visible');
            modelCatalog.findValidatedModelReplicas().should('be.visible');
            modelCatalog.findValidatedModelLatency().should('be.visible');
          });

        cy.step('Click on validated model to go to details page');
        modelCatalog.findValidatedModelCardLink().click();

        cy.step('Verify Performance Insights tab exists and click it');
        modelDetailsPage.findPerformanceInsightsTab().should('be.visible');
        modelDetailsPage.clickPerformanceInsightsTab();

        cy.step('Verify hardware configuration table loads with data');
        modelDetailsPage.findHardwareConfigurationTable().should('be.visible');
        modelDetailsPage.findHardwareConfigurationTableRows().should('have.length.at.least', 1);

        cy.step('Verify workload type filter is visible on details page');
        modelDetailsPage.findWorkloadTypeFilter().should('be.visible');
      });
    },
  );
});
