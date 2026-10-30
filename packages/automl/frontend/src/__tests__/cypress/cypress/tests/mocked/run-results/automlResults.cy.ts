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
  describe('Header', () => {
    it('should show the run name as the final breadcrumb item without a page header', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      // Final breadcrumb reflects the run name; no separate page header/subtext.
      // The separator renders as &nbsp; (U+00A0), which contain.text does not
      // normalize — normalize the actual text before comparing.
      automlResultsPage.findResultsBreadcrumbRunName().should(($el) => {
        expect($el.text().replace(/\u00a0/g, ' ')).to.contain('binary results');
      });
      cy.findByTestId('app-page-title').should('not.exist');
    });

    it('should place run actions beside the breadcrumb', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      // The actions share the breadcrumb row — aligned with the run-name
      // breadcrumb and to its right — rather than stacking in a page header.
      automlResultsPage.findResultsBreadcrumbRunName().then(($crumb) => {
        automlResultsPage.findRunDetailsButton().then(($actions) => {
          const crumb = $crumb[0].getBoundingClientRect();
          const actions = $actions[0].getBoundingClientRect();
          expect(actions.top, 'actions row top').to.be.lessThan(crumb.bottom);
          expect(actions.bottom, 'actions row bottom').to.be.greaterThan(crumb.top);
          expect(actions.left, 'actions right of breadcrumb').to.be.greaterThan(crumb.right);
        });
      });

      automlResultsPage.findReconfigureButton().should('have.class', 'pf-m-link');
      automlResultsPage.findRunNotebookDownloadButton().should('have.class', 'pf-m-link');
      automlResultsPage.findRunDetailsButton().should('have.class', 'pf-m-link');

      // At a narrower viewport the actions stay reachable without page-level
      // horizontal overflow.
      cy.viewport(900, 660);
      automlResultsPage.findRunDetailsButton().should('be.visible');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth, 'no horizontal overflow').to.be.at.most(
          doc.documentElement.clientWidth,
        );
      });
    });

    it('should toggle the step details panel with the Show/Hide details control', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      cy.findByTestId('hide-details').should('contain.text', 'Hide details');
      cy.findByTestId('close-step-details').click();
      // PF keeps the panel wrapper mounted when collapsed (hidden via transform) — assert the hidden attribute
      cy.findByTestId('step-details-drawer-panel').should('have.attr', 'hidden');
      cy.findByTestId('show-details').should('contain.text', 'Show details');

      cy.findByTestId('show-details').click();
      cy.findByTestId('step-details-drawer-panel').should('be.visible');
      cy.findByTestId('hide-details').should('contain.text', 'Hide details');
    });
  });

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

      // Verify roc_auc metric column is hidden by default
      automlResultsPage.findMetricHeader('roc_auc').should('not.exist');

      // Open manage columns modal
      automlResultsPage.findManageColumnsButton().click();
      automlResultsPage.findManageColumnsDescription().should('be.visible');

      // Check roc_auc column and save
      automlResultsPage.findColumnCheck('metric:roc_auc').click();
      automlResultsPage.findManageColumnsSaveButton().click();

      // roc_auc column should now be visible
      automlResultsPage.findMetricHeader('roc_auc').should('exist');
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
      // PF keeps the panel wrapper mounted when collapsed (hidden via transform) — assert the hidden attribute
      automlResultsPage.findRunDetailsDrawerPanel().should('have.attr', 'hidden');
    });
  });
});
