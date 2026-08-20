import { automlResultsPage } from '~/__tests__/cypress/cypress/pages/automlResults';

// Real seeded binary-classification run served by the BFF's fake pipelines client
// (packages/automl/bff/internal/fake/pipelines.go — binarySeedID). The mocked
// cypress setup runs the actual BFF with --mock-* flags rather than intercepting
// network requests, so these values must match real fake/seed data.
const RUN_ID = '9ec21d90-baa0-4a6b-bb2a-40d9d4b43c54';
// my-project is the only fake namespace with a DSPA (packages/automl/bff/internal/fake/k8s.go)
const NAMESPACE = 'my-project';

// Model names from the seeded run's S3 artifacts, in leaderboard rank order
// (packages/automl/bff/internal/fake/s3-bucket/autogluon-tabular-training-pipeline/<RUN_ID>).
// Ranked by "accuracy" (the run's optimized metric): XGBoost wins outright; the
// LightGBMLarge/WeightedEnsemble tie keeps the alphabetical S3-listing order.
const MODEL_NAMES = [
  'XGBoost_BAG_L1_FULL',
  'LightGBMLarge_BAG_L1_FULL',
  'WeightedEnsemble_L2_FULL',
];

// Top features by importance for this run (shared across all three models) — see
// each model's metrics/feature_importance.json in the seed data above.
const TOP_FEATURES = ['Name', 'Pclass', 'Sex'];

describe('AutoML Results Page', () => {
  describe('Leaderboard', () => {
    it('should display leaderboard with model rows', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findLeaderboardRow(1).should('exist');
      automlResultsPage.findLeaderboardRow(2).should('exist');
      automlResultsPage.findLeaderboardRow(3).should('exist');
    });

    it('should show top rank label on first model', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findTopRankLabel().should('exist');
    });

    it('should open manage columns modal and show a hidden column', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      // Verify f1 metric column is hidden by default (only optimized metric is visible)
      automlResultsPage.findMetricHeader('f1').should('not.exist');

      // Open manage columns modal
      automlResultsPage.findManageColumnsButton().click();
      automlResultsPage.findManageColumnsDescription().should('be.visible');

      // Check f1 column and save
      automlResultsPage.findColumnCheck('metric:f1').click();
      automlResultsPage.findManageColumnsSaveButton().click();

      // f1 column should now be visible
      automlResultsPage.findMetricHeader('f1').should('exist');
    });
  });

  describe('Model Details Modal', () => {
    it('should open modal with all tabs', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();

      automlResultsPage.findModelDetailsModal().should('be.visible');
      cy.testA11y();
      automlResultsPage.findTab('model-information').should('exist');
      automlResultsPage.findTab('model-evaluation').should('exist');
      automlResultsPage.findTab('feature-summary').should('exist');
      automlResultsPage.findTab('confusion-matrix').should('exist');
    });

    it('should close modal', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findModelDetailsModal().should('be.visible');

      automlResultsPage.findModelDetailsModalCloseButton().click();
      automlResultsPage.findModelDetailsModal().should('not.exist');
    });

    it('should switch between models using the model selector dropdown', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findModelDetailsModal().should('be.visible');

      // Open model selector and switch to a different model
      automlResultsPage.findModelSelectorDropdown().click();
      automlResultsPage.findModelSelectorOption(MODEL_NAMES[1]).click();

      // Verify the modal still shows with the new model
      automlResultsPage.findModelDetailsModal().should('be.visible');
      automlResultsPage.findModelSelectorDropdown().should('contain.text', MODEL_NAMES[1]);
    });

    it('should display feature importance bars in feature summary tab', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findModelDetailsModal().should('be.visible');

      automlResultsPage.findTab('feature-summary').click();

      TOP_FEATURES.forEach((feature) => {
        automlResultsPage.findFeatureImportanceBar(feature).should('exist');
      });
    });

    it('should search features in feature summary tab', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findTab('feature-summary').click();

      // Search for a specific feature
      automlResultsPage.findFeatureSearchInput().type('Sex');
      automlResultsPage.findFeatureImportanceBar('Sex').should('exist');
      automlResultsPage.findFeatureImportanceBar('Pclass').should('not.exist');

      // Clear search and verify all features return
      automlResultsPage.findFeatureSearchInput().clear();
      automlResultsPage.findFeatureImportanceBar('Pclass').should('exist');
    });

    it('should display confusion matrix in confusion matrix tab', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findModelDetailsModal().should('be.visible');

      automlResultsPage.findTab('confusion-matrix').click();

      automlResultsPage.findConfusionMatrixTable().should('exist');
      automlResultsPage.findConfusionMatrixLegend().should('exist');
    });
  });

  describe('Run Details Drawer', () => {
    it('should open and close run details drawer', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findRunDetailsButton().click();
      automlResultsPage.findRunDetailsDrawerPanel().should('be.visible');

      automlResultsPage.findRunDetailsDrawerCloseButton().click();
      automlResultsPage.findRunDetailsDrawerPanel().should('not.be.visible');
    });
  });
});
