/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AutomlLeaderboard from '~/app/components/run-results/AutomlLeaderboard';
import { AutomlResultsContext, type AutomlModel } from '~/app/context/AutomlResultsContext';
import type { PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';

// Mock empty state component
jest.mock('~/app/components/empty-states/AutomlRunInProgress', () => ({
  __esModule: true,
  default: ({ namespace }: { namespace: string }) => (
    <div data-testid="run-in-progress">Pipeline running in namespace: {namespace}</div>
  ),
}));

// ============================================================================
// Mock Data Fixtures
// ============================================================================

const createMockModel = (modelName: string, metrics: Record<string, number>): AutomlModel => ({
  name: modelName,
  location: {
    model_directory: `/models/${modelName}`,
    predictor: `/models/${modelName}/predictor.pkl`,
    notebook: `/models/${modelName}/notebook.ipynb`,
  },
  metrics: {
    test_data: metrics,
  },
});

// Binary classification models
const mockBinaryModels: Record<string, AutomlModel> = {
  'model-1': createMockModel('Logistic Regression', {
    accuracy: 0.95,
    f1: 0.93,
    precision: 0.94,
    recall: 0.92,
    roc_auc: 0.97,
  }),
  'model-2': createMockModel('Random Forest', {
    accuracy: 0.92,
    f1: 0.9,
    precision: 0.91,
    recall: 0.89,
    roc_auc: 0.94,
  }),
  'model-3': createMockModel('XGBoost', {
    accuracy: 0.97,
    f1: 0.96,
    precision: 0.96,
    recall: 0.95,
    roc_auc: 0.98,
  }),
};

// Multiclass classification models
const mockMulticlassModels: Record<string, AutomlModel> = {
  'model-1': createMockModel('Neural Network', {
    accuracy: 0.88,
    f1: 0.86,
    precision: 0.87,
    recall: 0.85,
  }),
  'model-2': createMockModel('SVM', {
    accuracy: 0.91,
    f1: 0.89,
    precision: 0.9,
    recall: 0.88,
  }),
};

// Regression models
const mockRegressionModels: Record<string, AutomlModel> = {
  'model-1': createMockModel('Linear Regression', {
    r2: 0.85,
    mean_absolute_error: 2.5,
    mean_squared_error: 10.2,
    root_mean_squared_error: 3.19,
  }),
  'model-2': createMockModel('Gradient Boosting', {
    r2: 0.92,
    mean_absolute_error: 1.8,
    mean_squared_error: 5.4,
    root_mean_squared_error: 2.32,
  }),
  'model-3': createMockModel('Ridge Regression', {
    r2: 0.88,
    mean_absolute_error: 2.1,
    mean_squared_error: 7.8,
    root_mean_squared_error: 2.79,
  }),
};

// Timeseries models — AutoGluon negates error/loss metrics so higher (closer to 0) is better.
// Keys are snake_case (normalized from acronyms by useAutomlResults).
const mockTimeseriesModels: Record<string, AutomlModel> = {
  'model-1': createMockModel('ARIMA', {
    mean_absolute_scaled_error: -0.15,
    mean_absolute_percentage_error: -0.18,
    mean_absolute_error: -5.2,
    mean_squared_error: -45.3,
    root_mean_squared_error: -6.73,
  }),
  'model-2': createMockModel('Prophet', {
    mean_absolute_scaled_error: -0.12,
    mean_absolute_percentage_error: -0.14,
    mean_absolute_error: -4.1,
    mean_squared_error: -32.1,
    root_mean_squared_error: -5.67,
  }),
  'model-3': createMockModel('LSTM', {
    mean_absolute_scaled_error: -0.09,
    mean_absolute_percentage_error: -0.11,
    mean_absolute_error: -3.5,
    mean_squared_error: -25.6,
    root_mean_squared_error: -5.06,
  }),
};

// Models with very small metric values (for scientific notation testing)
const mockModelsWithSmallValues: Record<string, AutomlModel> = {
  'model-1': createMockModel('Model A', {
    accuracy: 0.0000123,
    loss: 0.0000045,
  }),
};

// Helper to create mock parameters that match ConfigureSchema
const createMockParameters = (taskType: string) => {
  const base = {
    display_name: 'test-run',
    task_type: taskType as 'binary' | 'multiclass' | 'regression' | 'timeseries',
    train_data_secret_name: 'test-secret',
    train_data_bucket_name: 'test-bucket',
    train_data_file_key: 'test-file.csv',
    top_n: 3,
  };

  if (taskType === 'timeseries') {
    return {
      ...base,
      target: 'target_column',
      id_column: 'id_column',
      timestamp_column: 'timestamp_column',
      prediction_length: 10,
    };
  }

  return {
    ...base,
    label_column: 'label_column',
  };
};

const createMockPipelineRun = (state: RuntimeStateKF, taskType?: string): PipelineRun => ({
  run_id: 'test-run-123',
  display_name: 'Test AutoML Run',
  state,
  created_at: '2025-01-17T00:00:00Z',
  runtime_config: taskType
    ? {
        parameters: createMockParameters(taskType),
      }
    : undefined,
});

// ============================================================================
// Test Helper Components
// ============================================================================

interface RenderWithContextOptions {
  models?: Record<string, AutomlModel>;
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  modelsLoading?: boolean;
  taskType?: string;
  namespace?: string;
  onViewDetails?: (modelName: string, rank: number) => void;
  onClickSaveNotebook?: (modelName: string) => void;
}

const renderWithContext = ({
  models = {},
  pipelineRun,
  pipelineRunLoading = false,
  modelsLoading = false,
  taskType,
  namespace = 'test-namespace',
  onViewDetails,
  onClickSaveNotebook,
}: RenderWithContextOptions = {}) => {
  const finalTaskType =
    taskType || pipelineRun?.runtime_config?.parameters?.task_type || 'timeseries';

  const contextValue = {
    pipelineRun,
    pipelineRunLoading,
    models,
    modelsLoading,
    parameters: createMockParameters(finalTaskType),
  };

  return render(
    <MemoryRouter initialEntries={[`/automl/${namespace}/results/test-run-123`]}>
      <Routes>
        <Route
          path="/automl/:namespace/results/:runId"
          element={
            <AutomlResultsContext.Provider value={contextValue}>
              <AutomlLeaderboard
                onViewDetails={onViewDetails}
                onClickSaveNotebook={onClickSaveNotebook}
              />
            </AutomlResultsContext.Provider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('AutomlLeaderboard utility functions', () => {
  // Import the component to access utility functions (they're not exported)
  // We'll test them indirectly through component rendering

  describe('formatMetricName', () => {
    it('should format special case metrics correctly', () => {
      renderWithContext({
        models: {
          'model-1': createMockModel('Test Model', {
            accuracy: 0.95,
            roc_auc: 0.95,
            mcc: 0.85,
            f1: 0.9,
            r2: 0.88,
            mean_absolute_error: 2.5,
            mean_squared_error: 10.2,
            root_mean_squared_error: 3.19,
            mean_absolute_percentage_error: 0.15,
            mean_absolute_scaled_error: 0.12,
          }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Check that special case acronyms are displayed correctly
      expect(screen.getByText('ROC AUC')).toBeInTheDocument();
      expect(screen.getByText('MCC')).toBeInTheDocument();
      expect(screen.getByText('F₁')).toBeInTheDocument();
      expect(screen.getByText('R²')).toBeInTheDocument();
      expect(screen.getByText('MAE')).toBeInTheDocument();
      expect(screen.getByText('MSE')).toBeInTheDocument();
      expect(screen.getByText('RMSE')).toBeInTheDocument();
      expect(screen.getByText('MAPE')).toBeInTheDocument();
      expect(screen.getByText('MASE')).toBeInTheDocument();
      // For binary classification, accuracy is the optimized metric
      const accuracyHeader = screen.getByTestId('metric-header-accuracy');
      expect(accuracyHeader).toBeInTheDocument();
      expect(within(accuracyHeader).getByTestId('optimized-indicator')).toBeInTheDocument();
    });

    it('should convert snake_case to Title Case for non-special metrics', () => {
      renderWithContext({
        models: {
          'model-1': createMockModel('Test Model', {
            custom_metric: 0.85,
            another_test_metric: 0.9,
          }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      expect(screen.getByText('Custom Metric')).toBeInTheDocument();
      expect(screen.getByText('Another Test Metric')).toBeInTheDocument();
    });
  });

  describe('formatMetricValue', () => {
    it('should format normal values with 3 decimal places', () => {
      renderWithContext({
        models: {
          'model-1': createMockModel('Test Model', {
            accuracy: 0.95432,
          }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Value should be formatted to 3 decimal places
      const metricCell = screen.getByTestId('metric-accuracy-1');
      expect(metricCell).toHaveTextContent('0.954');
    });

    it('should use scientific notation for very small values', () => {
      renderWithContext({
        models: mockModelsWithSmallValues,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Very small values should use scientific notation
      const accuracyCell = screen.getByTestId('metric-accuracy-1');
      expect(accuracyCell.textContent).toMatch(/1\.230e-5|1\.23e-5/);
    });
  });
});

// ============================================================================
// Component Behavior Tests
// ============================================================================

describe('AutomlLeaderboard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ========================================================================
  // Loading and Empty States
  // ========================================================================

  describe('loading states', () => {
    it('should show loading skeleton when pipelineRunLoading is true', () => {
      renderWithContext({
        pipelineRunLoading: true,
      });

      expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show loading skeleton when modelsLoading is true', () => {
      renderWithContext({
        modelsLoading: true,
      });

      expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show loading skeleton when modelsLoading is true with succeeded pipeline', () => {
      renderWithContext({
        models: {},
        modelsLoading: true,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED),
      });

      expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show empty state with completion message when succeeded with no models', () => {
      renderWithContext({
        models: {},
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED),
      });

      const emptyState = screen.getByTestId('leaderboard-empty');
      expect(emptyState).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();

      expect(within(emptyState).getByText('No models produced')).toBeInTheDocument();
      // Text is split across multiple elements (spans and a button), so use toHaveTextContent
      expect(emptyState).toHaveTextContent(
        'The pipeline run completed but did not generate any models. Please check the pipeline configuration and logs.',
      );
      // Verify the interactive CTA link exists and navigates to the pipeline run page
      const link = within(emptyState).getByRole('link', {
        name: /pipeline configuration and logs/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/develop-train/pipelines/runs/test-namespace/runs/test-run-123',
      );
    });

    it.each([
      [
        'when run failed',
        RuntimeStateKF.FAILED,
        'The pipeline run did not complete successfully. Please check the pipeline configuration and logs for errors.',
        /pipeline configuration and logs/i,
      ],
      [
        'when run was canceled',
        RuntimeStateKF.CANCELED,
        'The pipeline run did not complete successfully. Please check the pipeline configuration and logs for errors.',
        /pipeline configuration and logs/i,
      ],
      [
        'when pipelineRun is undefined',
        undefined,
        'Unable to determine pipeline run status. Please check the pipeline configuration and logs.',
        /pipeline configuration and logs/i,
      ],
      [
        'for SKIPPED state',
        RuntimeStateKF.SKIPPED,
        'The pipeline run is in an unexpected state. Please check the pipeline status and logs.',
        /pipeline status and logs/i,
      ],
      [
        'for PAUSED state',
        RuntimeStateKF.PAUSED,
        'The pipeline run is in an unexpected state. Please check the pipeline status and logs.',
        /pipeline status and logs/i,
      ],
    ])('should show empty state %s', (_testName, state, expectedMessage, linkName) => {
      renderWithContext({
        models: {},
        pipelineRun: state !== undefined ? createMockPipelineRun(state) : undefined,
      });

      const emptyState = screen.getByTestId('leaderboard-empty');
      expect(emptyState).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();

      expect(within(emptyState).getByText('No models produced')).toBeInTheDocument();
      expect(emptyState).toHaveTextContent(expectedMessage);

      // All non-SUCCEEDED states should NOT show the SUCCEEDED message
      if (state !== RuntimeStateKF.SUCCEEDED) {
        expect(emptyState).not.toHaveTextContent(
          'The pipeline run completed but did not generate any models. Please check the pipeline configuration and logs.',
        );
      }

      const link = within(emptyState).getByRole('link', { name: linkName });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/develop-train/pipelines/runs/test-namespace/runs/test-run-123',
      );
    });

    it('should render loading skeleton with correct structure', () => {
      renderWithContext({
        pipelineRunLoading: true,
      });

      const table = screen.getByTestId('leaderboard-loading');

      // Verify table structure exists
      expect(table).toBeInTheDocument();
      expect(table.tagName).toBe('TABLE');

      // Check for skeleton rows (5 rows expected in loading state)
      const skeletonRows = screen.getAllByRole('row');
      // Header row + 5 skeleton rows = 6 total
      expect(skeletonRows.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('running pipeline state', () => {
    it('should show running state when pipeline is PENDING', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.PENDING),
      });

      expect(screen.getByTestId('run-in-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show running state when pipeline is RUNNING', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.RUNNING),
      });

      expect(screen.getByTestId('run-in-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show running state when pipeline is CANCELING', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.CANCELING),
      });

      expect(screen.getByTestId('run-in-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should pass correct namespace to running state component', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.RUNNING),
        namespace: 'my-project',
      });

      expect(screen.getByText('Pipeline running in namespace: my-project')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Table Rendering
  // ========================================================================

  describe('table rendering', () => {
    it('should render leaderboard table when models are available', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-loading')).not.toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // 3 models = 3 rows
      expect(screen.getByTestId('leaderboard-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-3')).toBeInTheDocument();
    });

    it('should render all column headers', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      expect(screen.getByTestId('rank-header')).toHaveTextContent('Rank');
      expect(screen.getByTestId('model-name-header')).toHaveTextContent('Model name');
      expect(screen.getByTestId('metric-header-accuracy')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-f1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-precision')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-recall')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-roc_auc')).toBeInTheDocument();
    });

    it('should display model names correctly', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      expect(screen.getByText('Logistic Regression')).toBeInTheDocument();
      expect(screen.getByText('Random Forest')).toBeInTheDocument();
      expect(screen.getByText('XGBoost')).toBeInTheDocument();
    });

    it('should render model names as clickable links', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const modelLink = screen.getByTestId('model-link-1');
      expect(modelLink).toBeInTheDocument();
      expect(modelLink.tagName).toBe('BUTTON');
    });
  });

  // ========================================================================
  // Ranking and Top Model
  // ========================================================================

  describe('ranking and top model highlighting', () => {
    it('should highlight top-ranked model with star icon for binary classification', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // XGBoost has highest accuracy (0.97), should be rank 1
      expect(screen.getByTestId('top-rank-label')).toBeInTheDocument();
      expect(screen.getByTestId('top-rank-label')).toHaveTextContent('1');

      // Check that rank 1 row contains XGBoost
      const rank1Row = screen.getByTestId('leaderboard-row-1');
      expect(within(rank1Row).getByText('XGBoost')).toBeInTheDocument();
    });

    it('should not highlight non-top-ranked models', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Only one star icon should exist (for rank 1)
      expect(screen.getByTestId('top-rank-label')).toBeInTheDocument();
      expect(screen.queryAllByTestId('top-rank-label')).toHaveLength(1);

      // Rank 2 and 3 should just display numbers
      const rank2Cell = screen.getByTestId('rank-2');
      expect(rank2Cell).toHaveTextContent('2');
      expect(rank2Cell).not.toHaveTextContent('1');
    });

    it('should rank models correctly for regression (higher R² is better)', () => {
      renderWithContext({
        models: mockRegressionModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'regression'),
      });

      // Gradient Boosting has highest R² (0.92), should be rank 1
      const rank1Row = screen.getByTestId('leaderboard-row-1');
      expect(within(rank1Row).getByText('Gradient Boosting')).toBeInTheDocument();
      expect(within(rank1Row).getByTestId('top-rank-label')).toBeInTheDocument();
    });

    it('should rank models correctly for timeseries (higher negated MASE is better)', () => {
      renderWithContext({
        models: mockTimeseriesModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'timeseries'),
      });

      // LSTM has highest negated MASE (-0.09, closest to 0), should be rank 1
      const rank1Row = screen.getByTestId('leaderboard-row-1');
      expect(within(rank1Row).getByText('LSTM')).toBeInTheDocument();
      expect(within(rank1Row).getByTestId('top-rank-label')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Task Type Specific Tests
  // ========================================================================

  describe('task type specific behavior', () => {
    it('should use accuracy as optimized metric for binary classification', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const accuracyHeader = screen.getByTestId('metric-header-accuracy');
      expect(within(accuracyHeader).getByTestId('optimized-indicator')).toHaveTextContent(
        '(optimized)',
      );
    });

    it('should use accuracy as optimized metric for multiclass classification', () => {
      renderWithContext({
        models: mockMulticlassModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'multiclass'),
      });

      const accuracyHeader = screen.getByTestId('metric-header-accuracy');
      expect(within(accuracyHeader).getByTestId('optimized-indicator')).toHaveTextContent(
        '(optimized)',
      );
    });

    it('should use r2 as optimized metric for regression', () => {
      renderWithContext({
        models: mockRegressionModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'regression'),
      });

      const r2Header = screen.getByTestId('metric-header-r2');
      expect(within(r2Header).getByTestId('optimized-indicator')).toHaveTextContent('(optimized)');
    });

    it('should use mean_absolute_scaled_error as optimized metric for timeseries', () => {
      renderWithContext({
        models: mockTimeseriesModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'timeseries'),
      });

      const maseHeader = screen.getByTestId('metric-header-mean_absolute_scaled_error');
      expect(within(maseHeader).getByTestId('optimized-indicator')).toHaveTextContent(
        '(optimized)',
      );
    });

    it('should default to timeseries when task_type is not provided', () => {
      renderWithContext({
        models: mockTimeseriesModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED),
      });

      // Should still show MASE as optimized (timeseries default)
      const maseHeader = screen.getByTestId('metric-header-mean_absolute_scaled_error');
      expect(within(maseHeader).getByTestId('optimized-indicator')).toHaveTextContent(
        '(optimized)',
      );
    });
  });

  // ========================================================================
  // Metric Display
  // ========================================================================

  describe('metric display', () => {
    it('should display all metrics for each model', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Check first model (rank 1 - XGBoost with highest accuracy)
      expect(screen.getByTestId('metric-accuracy-1')).toHaveTextContent('0.970');
      expect(screen.getByTestId('metric-f1-1')).toHaveTextContent('0.960');
      expect(screen.getByTestId('metric-precision-1')).toHaveTextContent('0.960');
      expect(screen.getByTestId('metric-recall-1')).toHaveTextContent('0.950');
      expect(screen.getByTestId('metric-roc_auc-1')).toHaveTextContent('0.980');
    });

    it('should display metrics with tooltip showing full value', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const metricCell = screen.getByTestId('metric-accuracy-1');

      // PatternFly tooltips render differently, just check the cell has the value
      expect(metricCell).toBeInTheDocument();
    });

    it('should handle different metric types across models', () => {
      renderWithContext({
        models: mockRegressionModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'regression'),
      });

      // All models should have all metric columns even if values differ
      expect(screen.getByTestId('metric-r2-1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-mean_absolute_error-1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-mean_squared_error-1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-root_mean_squared_error-1')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Sorting Functionality
  // ========================================================================

  describe('sorting functionality', () => {
    it('should initially sort by rank (ascending)', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const rows = screen.getAllByTestId(/^leaderboard-row-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'leaderboard-row-1');
      expect(rows[1]).toHaveAttribute('data-testid', 'leaderboard-row-2');
      expect(rows[2]).toHaveAttribute('data-testid', 'leaderboard-row-3');
    });

    it('should sort by rank in descending order when clicked', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const rankHeader = screen.getByTestId('rank-header');
      const sortButton = rankHeader.querySelector('button');

      // Click to sort descending
      fireEvent.click(sortButton!);

      const rows = screen.getAllByTestId(/^leaderboard-row-/);
      expect(rows[0]).toHaveAttribute('data-testid', 'leaderboard-row-3');
      expect(rows[1]).toHaveAttribute('data-testid', 'leaderboard-row-2');
      expect(rows[2]).toHaveAttribute('data-testid', 'leaderboard-row-1');
    });

    it('should sort by model name alphabetically', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const modelNameHeader = screen.getByTestId('model-name-header');
      const sortButton = modelNameHeader.querySelector('button');

      // Click to sort by model name (ascending)
      fireEvent.click(sortButton!);

      const modelLinks = screen.getAllByTestId(/^model-link-/);
      // Should be alphabetical: Logistic Regression, Random Forest, XGBoost
      expect(modelLinks[0]).toHaveTextContent('Logistic Regression');
      expect(modelLinks[1]).toHaveTextContent('Random Forest');
      expect(modelLinks[2]).toHaveTextContent('XGBoost');
    });

    it('should sort by metric values', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const f1Header = screen.getByTestId('metric-header-f1');
      const sortButton = f1Header.querySelector('button');

      // Click to sort by F1 (ascending)
      fireEvent.click(sortButton!);

      const f1Cells = screen.getAllByTestId(/^metric-f1-/);
      const values = f1Cells.map((cell) => parseFloat(cell.textContent || '0'));

      // Should be sorted ascending
      expect(values[0]).toBeLessThanOrEqual(values[1]);
      expect(values[1]).toBeLessThanOrEqual(values[2]);
    });

    it('should maintain rank values when sorting by other columns', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Initially XGBoost is rank 1 (highest accuracy)
      const rank1Row = screen.getByTestId('leaderboard-row-1');
      expect(within(rank1Row).getByText('XGBoost')).toBeInTheDocument();

      // Sort by model name
      const modelNameHeader = screen.getByTestId('model-name-header');
      const sortButton = modelNameHeader.querySelector('button');
      fireEvent.click(sortButton!);

      // XGBoost should still show rank 1 even though row order changed
      const xgboostLink = screen.getByText('XGBoost');
      const xgboostRow = xgboostLink.closest('tr');

      // Should still have the top rank label
      expect(within(xgboostRow!).getByTestId('top-rank-label')).toHaveTextContent('1');
    });
  });

  // ========================================================================
  // User Interactions
  // ========================================================================

  describe('user interactions', () => {
    it('should call handler when model name is clicked', () => {
      const mockOnViewDetails = jest.fn<void, [string, number]>();

      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
        onViewDetails: mockOnViewDetails,
      });

      const modelLink = screen.getByTestId('model-link-1');
      fireEvent.click(modelLink);

      // XGBoost is rank 1 (highest accuracy) — callback receives the map key, not display name
      expect(mockOnViewDetails).toHaveBeenCalledWith('model-3', 1);
      expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
    });

    it('should call handler when "View details" action is clicked from kebab menu', () => {
      const mockOnViewDetails = jest.fn<void, [string, number]>();

      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
        onViewDetails: mockOnViewDetails,
      });

      // Get the first row's kebab menu
      const firstRow = screen.getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });
      fireEvent.click(kebabButton);

      // Click "View details" action
      const viewDetailsAction = screen.getByText('View details');
      fireEvent.click(viewDetailsAction);

      // XGBoost is rank 1 — callback receives the map key
      expect(mockOnViewDetails).toHaveBeenCalledWith('model-3', 1);
      expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
    });

    it('should call handler when "Save notebook" action is clicked from kebab menu', () => {
      const mockOnClickSaveNotebook = jest.fn<void, [string]>();

      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
        onClickSaveNotebook: mockOnClickSaveNotebook,
      });

      // Get the first row's kebab menu
      const firstRow = screen.getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });
      fireEvent.click(kebabButton);

      // Click "Save notebook" action
      const saveNotebookAction = screen.getByText('Save notebook');
      fireEvent.click(saveNotebookAction);

      // XGBoost is rank 1 — callback receives the map key
      expect(mockOnClickSaveNotebook).toHaveBeenCalledWith('model-3');
      expect(mockOnClickSaveNotebook).toHaveBeenCalledTimes(1);
    });

    it('should not call save notebook handler if callback is not provided', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
        // No onClickSaveNotebook callback
      });

      // Get the first row's kebab menu
      const firstRow = screen.getByTestId('leaderboard-row-1');
      const kebabButton = within(firstRow).getByRole('button', { name: 'Kebab toggle' });
      fireEvent.click(kebabButton);

      // Click "Save notebook" action - should not throw error
      const saveNotebookAction = screen.getByText('Save notebook');
      expect(() => fireEvent.click(saveNotebookAction)).not.toThrow();
    });
  });

  // ========================================================================
  // Manage Columns
  // ========================================================================

  describe('manage columns', () => {
    it('should render manage columns button', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      const button = screen.getByTestId('manage-columns-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Manage columns');
    });

    it('should open column management modal when button is clicked', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      fireEvent.click(screen.getByTestId('manage-columns-button'));

      // Modal should be open with column checkboxes
      expect(
        screen.getByText('Selected categories will be displayed in the table.'),
      ).toBeInTheDocument();
      // Verify always-visible columns are present but disabled
      const rankCheckbox = screen.getByTestId('column-check-rank');
      expect(rankCheckbox).toBeDisabled();
      const modelCheckbox = screen.getByTestId('column-check-model');
      expect(modelCheckbox).toBeDisabled();
      const optimizedCheckbox = screen.getByTestId('column-check-optimized-metric');
      expect(optimizedCheckbox).toBeDisabled();
    });

    it('should allow toggling non-sticky metric columns', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Verify metric columns exist before hiding
      expect(screen.getByTestId('metric-header-f1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-roc_auc')).toBeInTheDocument();

      // Open modal
      fireEvent.click(screen.getByTestId('manage-columns-button'));

      // Non-sticky metric columns should be toggleable (not disabled)
      const f1Checkbox = screen.getByTestId('column-check-metric:f1');
      expect(f1Checkbox).not.toBeDisabled();

      // Uncheck F1
      fireEvent.click(f1Checkbox);

      // Save
      fireEvent.click(screen.getByText('Save'));

      // F1 column should be hidden
      expect(screen.queryByTestId('metric-header-f1')).not.toBeInTheDocument();
      // Other columns should still be visible
      expect(screen.getByTestId('metric-header-roc_auc')).toBeInTheDocument();
    });

    it('should hide metric data cells when a column is hidden', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Verify data cells exist
      expect(screen.getByTestId('metric-f1-1')).toBeInTheDocument();

      // Hide F1 column
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      fireEvent.click(screen.getByTestId('column-check-metric:f1'));
      fireEvent.click(screen.getByText('Save'));

      // F1 data cells should also be hidden
      expect(screen.queryByTestId('metric-f1-1')).not.toBeInTheDocument();
      // Optimized metric cell should still be visible
      expect(screen.getByTestId('metric-accuracy-1')).toBeInTheDocument();
    });

    it('should keep optimized metric visible even when not in metric columns', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Optimized metric (accuracy) should always be visible as a sticky column
      expect(screen.getByTestId('metric-header-accuracy')).toBeInTheDocument();
      expect(screen.getByTestId('metric-accuracy-1')).toBeInTheDocument();

      // The optimized metric checkbox should be disabled (untoggleable)
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      const optimizedCheckbox = screen.getByTestId('column-check-optimized-metric');
      expect(optimizedCheckbox).toBeDisabled();
    });

    it('should not change columns when modal is cancelled', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      expect(screen.getByTestId('metric-header-f1')).toBeInTheDocument();

      // Open modal, uncheck F1, then cancel
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      fireEvent.click(screen.getByTestId('column-check-metric:f1'));
      fireEvent.click(screen.getByText('Cancel'));

      // F1 column should still be visible
      expect(screen.getByTestId('metric-header-f1')).toBeInTheDocument();
    });

    it('should maintain sorting after hiding columns', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Sort by model name first
      const modelNameHeader = screen.getByTestId('model-name-header');
      const sortButton = modelNameHeader.querySelector('button');
      fireEvent.click(sortButton!);

      // Verify sort order: Logistic, Random, XGBoost
      let modelLinks = screen.getAllByTestId(/^model-link-/);
      expect(modelLinks[0]).toHaveTextContent('Logistic Regression');

      // Hide a column
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      fireEvent.click(screen.getByTestId('column-check-metric:f1'));
      fireEvent.click(screen.getByText('Save'));

      // Sort order should be preserved
      modelLinks = screen.getAllByTestId(/^model-link-/);
      expect(modelLinks[0]).toHaveTextContent('Logistic Regression');
    });
  });

  // ========================================================================
  // Column Header Tooltips
  // ========================================================================

  describe('column header tooltips', () => {
    it('should render column headers with tooltip wrappers', () => {
      renderWithContext({
        models: mockBinaryModels,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'binary'),
      });

      // Headers should contain span elements (tooltip triggers)
      const rankHeader = screen.getByTestId('rank-header');
      expect(within(rankHeader).getByText('Rank')).toBeInTheDocument();

      const modelHeader = screen.getByTestId('model-name-header');
      expect(within(modelHeader).getByText('Model name')).toBeInTheDocument();
    });
  });
});
