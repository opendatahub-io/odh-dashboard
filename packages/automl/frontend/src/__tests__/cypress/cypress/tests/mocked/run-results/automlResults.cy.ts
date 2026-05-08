/* eslint-disable camelcase -- BFF API uses snake_case field names (run_id, pipeline_run, etc.) */
import { mockModArchResponse } from 'mod-arch-core';
import {
  mockTabularContext,
  mockTabularFeatureImportances,
  mockTabularConfusionMatrices,
} from '~/app/mocks/mockAutomlResultsContext';
import { mockS3ListObjectsResponse } from '~/__mocks__/mockS3ListObjectsResponse';
import { automlResultsPage } from '~/__tests__/cypress/cypress/pages/automlResults';

const RUN_ID = mockTabularContext.pipelineRun.run_id;
const NAMESPACE = 'kubeflow';
const TASK_ID = '22ab3456-7890-cdef-1234-567890abcdef';

const MODEL_NAMES = Object.keys(mockTabularContext.models);

// Mock pipeline spec for topology visualization
const mockPipelineSpec = {
  root: {
    dag: {
      tasks: {
        'automl-data-loader': {
          taskInfo: { name: 'automl-data-loader' },
          componentRef: { name: 'comp-automl-data-loader' },
        },
        'autogluon-models-training': {
          taskInfo: { name: 'autogluon-models-training' },
          componentRef: { name: 'comp-autogluon-models-training' },
        },
        'leaderboard-evaluation': {
          taskInfo: { name: 'leaderboard-evaluation' },
          componentRef: { name: 'comp-leaderboard-evaluation' },
          dependentTasks: ['autogluon-models-training'],
        },
      },
    },
  },
};

const mockPipelineRunWithSpec = {
  ...mockTabularContext.pipelineRun,
  pipeline_spec: mockPipelineSpec,
};

const initResultsIntercepts = () => {
  // Pipeline run endpoint — returns a SUCCEEDED run with pipeline spec
  cy.intercept(
    {
      method: 'GET',
      pathname: `/automl/api/v1/pipeline-runs/${RUN_ID}`,
    },
    mockModArchResponse(mockPipelineRunWithSpec),
  );

  // S3 files listing — Stage 1: list task directories
  cy.intercept(
    {
      method: 'GET',
      pathname: '/automl/api/v1/s3/files',
      query: {
        path: `autogluon-tabular-training-pipeline/${RUN_ID}/autogluon-models-training`,
      },
    },
    mockModArchResponse(
      mockS3ListObjectsResponse({
        common_prefixes: [
          {
            prefix: `autogluon-tabular-training-pipeline/${RUN_ID}/autogluon-models-training/${TASK_ID}/`,
          },
        ],
        contents: [],
        key_count: 1,
      }),
    ),
  );

  // S3 files listing — Stage 2: list model artifact directories
  cy.intercept(
    {
      method: 'GET',
      pathname: '/automl/api/v1/s3/files',
      query: {
        path: `autogluon-tabular-training-pipeline/${RUN_ID}/autogluon-models-training/${TASK_ID}/models_artifact`,
      },
    },
    mockModArchResponse(
      mockS3ListObjectsResponse({
        common_prefixes: MODEL_NAMES.map((name) => ({
          prefix: `autogluon-tabular-training-pipeline/${RUN_ID}/autogluon-models-training/${TASK_ID}/models_artifact/${name}/`,
        })),
        contents: [],
        key_count: MODEL_NAMES.length,
      }),
    ),
  );

  // S3 file download — Stage 3: model.json for each model
  MODEL_NAMES.forEach((modelName) => {
    const model = mockTabularContext.models[modelName];
    const baseDir = `autogluon-tabular-training-pipeline/${RUN_ID}/autogluon-models-training/${TASK_ID}/models_artifact/${modelName}`;

    cy.intercept(
      {
        method: 'GET',
        pathname: '/automl/api/v1/s3/file',
        query: {
          key: `${baseDir}/model.json`,
        },
      },
      {
        body: model,
        headers: { 'content-type': 'application/json' },
      },
    );

    // Feature importance
    cy.intercept(
      {
        method: 'GET',
        pathname: '/automl/api/v1/s3/file',
        query: {
          key: `${baseDir}/metrics/feature_importance.json`,
        },
      },
      {
        body: mockTabularFeatureImportances[modelName],
        headers: { 'content-type': 'application/json' },
      },
    );

    // Confusion matrix
    cy.intercept(
      {
        method: 'GET',
        pathname: '/automl/api/v1/s3/file',
        query: {
          key: `${baseDir}/metrics/confusion_matrix.json`,
        },
      },
      {
        body: mockTabularConfusionMatrices[modelName],
        headers: { 'content-type': 'application/json' },
      },
    );
  });

  // Pipeline runs list (for experiments page navigation)
  cy.intercept(
    {
      method: 'GET',
      pathname: '/automl/api/v1/pipeline-runs',
    },
    mockModArchResponse({
      runs: [mockTabularContext.pipelineRun],
      total_size: 1,
      next_page_token: '',
    }),
  );
};

describe('AutoML Results Page', () => {
  beforeEach(() => {
    initResultsIntercepts();
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

    it('should open manage columns modal and hide a column', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      // Verify F1 metric column exists before hiding
      automlResultsPage.findMetricHeader('f1').should('exist');

      // Open manage columns modal
      automlResultsPage.findManageColumnsButton().click();
      automlResultsPage.findManageColumnsDescription().should('be.visible');

      // Uncheck F1 column and save
      automlResultsPage.findColumnCheck('metric:f1').click();
      automlResultsPage.findManageColumnsSaveButton().click();

      // F1 column should be hidden
      automlResultsPage.findMetricHeader('f1').should('not.exist');
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

      automlResultsPage.findFeatureImportanceBar('color').should('exist');
      automlResultsPage.findFeatureImportanceBar('hair_length').should('exist');
      automlResultsPage.findFeatureImportanceBar('has_soul').should('exist');
    });

    it('should search features in feature summary tab', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findTab('feature-summary').click();

      // Search for a specific feature
      automlResultsPage.findFeatureSearchInput().type('color');
      automlResultsPage.findFeatureImportanceBar('color').should('exist');
      automlResultsPage.findFeatureImportanceBar('hair_length').should('not.exist');

      // Clear search and verify all features return
      automlResultsPage.findFeatureSearchInput().clear();
      automlResultsPage.findFeatureImportanceBar('hair_length').should('exist');
    });

    it('should display confusion matrix in confusion matrix tab', () => {
      automlResultsPage.visit(NAMESPACE, RUN_ID);

      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findModelDetailsModal().should('be.visible');

      automlResultsPage.findTab('confusion-matrix').click();

      automlResultsPage.findConfusionMatrixTable().should('exist');
      automlResultsPage.findConfusionMatrixGradient().should('exist');
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
