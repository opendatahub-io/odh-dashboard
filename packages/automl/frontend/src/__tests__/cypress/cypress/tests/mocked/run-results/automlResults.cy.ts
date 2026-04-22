/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import {
  mockTabularContext,
  mockTabularFeatureImportances,
  mockTabularConfusionMatrices,
} from '~/app/mocks/mockAutomlResultsContext';
import { mockS3ListObjectsResponse } from '~/__mocks__/mockS3ListObjectsResponse';

const RUN_ID = mockTabularContext.pipelineRun.run_id;
const NAMESPACE = 'kubeflow';
const TASK_ID = '22ab3456-7890-cdef-1234-567890abcdef';

const MODEL_NAMES = Object.keys(mockTabularContext.models);

const initResultsIntercepts = () => {
  // Pipeline run endpoint — returns a SUCCEEDED run
  cy.intercept(
    {
      method: 'GET',
      pathname: `/automl/api/v1/pipeline-runs/${RUN_ID}`,
    },
    mockModArchResponse(mockTabularContext.pipelineRun),
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

  it('should display leaderboard with model rows', () => {
    cy.visit(`/results/${NAMESPACE}/${RUN_ID}`);

    cy.findByTestId('leaderboard-table').should('exist');
    cy.findByTestId('leaderboard-row-1').should('exist');
    cy.findByTestId('leaderboard-row-2').should('exist');
    cy.findByTestId('leaderboard-row-3').should('exist');
  });

  it('should open model details modal with all tabs', () => {
    cy.visit(`/results/${NAMESPACE}/${RUN_ID}`);

    cy.findByTestId('leaderboard-table').should('exist');
    cy.findByTestId('model-link-1').click();

    cy.findByTestId('automl-model-details-modal').should('be.visible');
    cy.findByTestId('tab-model-information').should('exist');
    cy.findByTestId('tab-model-evaluation').should('exist');
    cy.findByTestId('tab-feature-summary').should('exist');
    cy.findByTestId('tab-confusion-matrix').should('exist');
  });

  it('should close model details modal', () => {
    cy.visit(`/results/${NAMESPACE}/${RUN_ID}`);

    cy.findByTestId('leaderboard-table').should('exist');
    cy.findByTestId('model-link-1').click();
    cy.findByTestId('automl-model-details-modal').should('be.visible');

    cy.findByTestId('automl-model-details-modal').find('[aria-label="Close"]').click();
    cy.findByTestId('automl-model-details-modal').should('not.exist');
  });

  it('should open and close run details drawer', () => {
    cy.visit(`/results/${NAMESPACE}/${RUN_ID}`);

    cy.findByTestId('leaderboard-table').should('exist');

    cy.findByTestId('run-details-button').click();
    cy.findByTestId('run-details-drawer-panel').should('be.visible');

    cy.findByTestId('run-details-drawer-close').click();
    cy.findByTestId('run-details-drawer-panel').should('not.be.visible');
  });

  it('should show top rank label on first model', () => {
    cy.visit(`/results/${NAMESPACE}/${RUN_ID}`);

    cy.findByTestId('leaderboard-table').should('exist');
    cy.findByTestId('top-rank-label').should('exist');
  });

  it('should display manage columns button', () => {
    cy.visit(`/results/${NAMESPACE}/${RUN_ID}`);

    cy.findByTestId('leaderboard-table').should('exist');
    cy.findByTestId('manage-columns-button').should('exist');
  });
});
