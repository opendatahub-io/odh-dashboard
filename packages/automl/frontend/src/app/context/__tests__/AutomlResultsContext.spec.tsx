/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  AutomlResultsContext,
  useAutomlResultsContext,
  getAutomlContext,
  type AutomlModel,
} from '~/app/context/AutomlResultsContext';
import type { PipelineRun } from '~/app/types';

// ============================================================================
// Mock Data
// ============================================================================

const createMockModel = (modelName: string, metrics: Record<string, number>): AutomlModel => ({
  name: modelName,
  location: {
    model_directory: `/models/${modelName}`,
    predictor: `/models/${modelName}/predictor`,
    notebook: `/models/${modelName}/notebook.ipynb`,
  },
  metrics: {
    test_data: metrics,
  },
});

const mockModels: Record<string, AutomlModel> = {
  'model-1': createMockModel('Model 1', { accuracy: 0.95 }),
  'model-2': createMockModel('Model 2', { accuracy: 0.92 }),
};

const createMockPipelineRun = (parameters?: Record<string, unknown>): PipelineRun => ({
  run_id: 'run-123',
  display_name: 'Test Run',
  state: 'SUCCEEDED',
  created_at: '2025-01-17T00:00:00Z',
  runtime_config: parameters ? ({ parameters } as PipelineRun['runtime_config']) : undefined,
});

// ============================================================================
// getAutomlContext Tests
// ============================================================================

describe('getAutomlContext', () => {
  describe('basic functionality', () => {
    it('should create context with all provided values', () => {
      const pipelineRun = createMockPipelineRun({ task_type: 'binary' });
      const models = mockModels;

      const context = getAutomlContext({
        pipelineRun,
        models,
        pipelineRunLoading: true,
        modelsLoading: false,
      });

      expect(context).toEqual({
        pipelineRun,
        pipelineRunLoading: true,
        models,
        modelsLoading: false,
        modelsBasePath: undefined,
        parameters: {
          display_name: expect.any(String), // Dynamic timestamp
          description: '',
          task_type: 'binary',
          train_data_secret_name: '',
          train_data_bucket_name: '',
          train_data_file_key: '',
          top_n: 3,
          label_column: '',
          target: '',
          id_column: '',
          timestamp_column: '',
          prediction_length: 1,
          known_covariates_names: [],
        },
      });
    });

    it('should handle undefined pipelineRun', () => {
      const context = getAutomlContext({
        pipelineRun: undefined,
        models: mockModels,
      });

      expect(context).toEqual({
        pipelineRun: undefined,
        pipelineRunLoading: undefined,
        models: mockModels,
        modelsLoading: undefined,
        modelsBasePath: undefined,
        parameters: {
          display_name: expect.any(String), // Dynamic timestamp
          description: '',
          task_type: 'timeseries', // Special default when no task_type provided
          train_data_secret_name: '',
          train_data_bucket_name: '',
          train_data_file_key: '',
          top_n: 3,
          label_column: '',
          target: '',
          id_column: '',
          timestamp_column: '',
          prediction_length: 1,
          known_covariates_names: [],
        },
      });
    });

    it('should handle empty models object', () => {
      const pipelineRun = createMockPipelineRun({ task_type: 'regression' });

      const context = getAutomlContext({
        pipelineRun,
        models: {},
      });

      expect(context.models).toEqual({});
    });

    it('should default models to empty object when not provided', () => {
      const pipelineRun = createMockPipelineRun();

      const context = getAutomlContext({
        pipelineRun,
      });

      expect(context.models).toEqual({});
    });

    it('should pass through modelsBasePath when provided', () => {
      const pipelineRun = createMockPipelineRun({ task_type: 'binary' });

      const context = getAutomlContext({
        pipelineRun,
        modelsBasePath: 's3://bucket/path/to/models',
      });

      expect(context.modelsBasePath).toBe('s3://bucket/path/to/models');
    });

    it('should default modelsBasePath to undefined when not provided', () => {
      const pipelineRun = createMockPipelineRun();

      const context = getAutomlContext({
        pipelineRun,
      });

      expect(context.modelsBasePath).toBeUndefined();
    });
  });

  describe('parameters extraction', () => {
    it('should extract all runtime_config parameters', () => {
      const pipelineRun = createMockPipelineRun({
        task_type: 'binary',
        train_data_secret_name: 'my-secret',
        train_data_bucket_name: 'my-bucket',
        train_data_file_key: 'data.csv',
        label_column: 'target',
        top_n: 5,
      });

      const context = getAutomlContext({
        pipelineRun,
      });

      expect(context.parameters).toEqual({
        display_name: expect.any(String), // Dynamic timestamp
        description: '',
        task_type: 'binary',
        train_data_secret_name: 'my-secret',
        train_data_bucket_name: 'my-bucket',
        train_data_file_key: 'data.csv',
        label_column: 'target',
        top_n: 5,
        target: '',
        id_column: '',
        timestamp_column: '',
        prediction_length: 1,
        known_covariates_names: [],
      });
    });

    it('should extract timeseries-specific parameters', () => {
      const pipelineRun = createMockPipelineRun({
        task_type: 'timeseries',
        target: 'sales',
        id_column: 'store_id',
        timestamp_column: 'date',
        prediction_length: 30,
        known_covariates_names: ['holiday', 'promotion'],
      });

      const context = getAutomlContext({
        pipelineRun,
      });

      expect(context.parameters).toEqual({
        display_name: expect.any(String), // Dynamic timestamp
        description: '',
        task_type: 'timeseries',
        train_data_secret_name: '',
        train_data_bucket_name: '',
        train_data_file_key: '',
        top_n: 3,
        label_column: '',
        target: 'sales',
        id_column: 'store_id',
        timestamp_column: 'date',
        prediction_length: 30,
        known_covariates_names: ['holiday', 'promotion'],
      });
    });

    it('should handle pipeline run with no runtime_config', () => {
      const pipelineRun: PipelineRun = {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'SUCCEEDED',
        created_at: '2025-01-17T00:00:00Z',
      };

      const context = getAutomlContext({
        pipelineRun,
      });

      expect(context.parameters).toEqual({
        display_name: expect.any(String), // Dynamic timestamp
        description: '',
        task_type: 'timeseries', // Special default when no task_type provided
        train_data_secret_name: '',
        train_data_bucket_name: '',
        train_data_file_key: '',
        top_n: 3,
        label_column: '',
        target: '',
        id_column: '',
        timestamp_column: '',
        prediction_length: 1,
        known_covariates_names: [],
      });
    });

    it('should handle pipeline run with empty parameters', () => {
      const pipelineRun = createMockPipelineRun({});

      const context = getAutomlContext({
        pipelineRun,
      });

      expect(context.parameters).toEqual({
        display_name: expect.any(String), // Dynamic timestamp
        description: '',
        task_type: 'timeseries', // Special default when no task_type provided
        train_data_secret_name: '',
        train_data_bucket_name: '',
        train_data_file_key: '',
        top_n: 3,
        label_column: '',
        target: '',
        id_column: '',
        timestamp_column: '',
        prediction_length: 1,
        known_covariates_names: [],
      });
    });
  });

  describe('task_type defaults', () => {
    it('should default task_type to timeseries when not provided', () => {
      const pipelineRun = createMockPipelineRun({
        label_column: 'target',
      });

      const context = getAutomlContext({
        pipelineRun,
      });

      expect(context.parameters?.task_type).toBe('timeseries');
    });

    it('should preserve task_type when provided', () => {
      const taskTypes = ['binary', 'multiclass', 'regression', 'timeseries'] as const;

      taskTypes.forEach((taskType) => {
        const pipelineRun = createMockPipelineRun({ task_type: taskType });
        const context = getAutomlContext({ pipelineRun });

        expect(context.parameters?.task_type).toBe(taskType);
      });
    });
  });

  describe('loading states', () => {
    it('should handle both loading states as true', () => {
      const context = getAutomlContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: true,
        modelsLoading: true,
      });

      expect(context.pipelineRunLoading).toBe(true);
      expect(context.modelsLoading).toBe(true);
    });

    it('should handle both loading states as false', () => {
      const context = getAutomlContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: false,
        modelsLoading: false,
      });

      expect(context.pipelineRunLoading).toBe(false);
      expect(context.modelsLoading).toBe(false);
    });

    it('should default loading states to undefined when not provided', () => {
      const context = getAutomlContext({
        pipelineRun: createMockPipelineRun(),
      });

      expect(context.pipelineRunLoading).toBeUndefined();
      expect(context.modelsLoading).toBeUndefined();
    });
  });
});

// ============================================================================
// Context Provider and Hook Tests
// ============================================================================

describe('AutomlResultsContext and useAutomlResultsContext', () => {
  describe('context provider', () => {
    it('should provide context values to children', () => {
      const TestComponent = () => {
        const context = useAutomlResultsContext();
        return (
          <div>
            <div data-testid="pipeline-run-id">{context.pipelineRun?.run_id}</div>
            <div data-testid="models-count">{Object.keys(context.models).length}</div>
            <div data-testid="pipeline-loading">{String(context.pipelineRunLoading)}</div>
            <div data-testid="models-loading">{String(context.modelsLoading)}</div>
            <div data-testid="task-type">{context.parameters?.task_type}</div>
          </div>
        );
      };

      const contextValue = getAutomlContext({
        pipelineRun: createMockPipelineRun({ task_type: 'binary' }),
        models: mockModels,
        pipelineRunLoading: true,
        modelsLoading: false,
      });

      render(
        <AutomlResultsContext.Provider value={contextValue}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('pipeline-run-id')).toHaveTextContent('run-123');
      expect(screen.getByTestId('models-count')).toHaveTextContent('2');
      expect(screen.getByTestId('pipeline-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('models-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('task-type')).toHaveTextContent('binary');
    });

    it('should handle empty context values', () => {
      const TestComponent = () => {
        const context = useAutomlResultsContext();
        return (
          <div>
            <div data-testid="has-pipeline">{context.pipelineRun ? 'yes' : 'no'}</div>
            <div data-testid="models-count">{Object.keys(context.models).length}</div>
          </div>
        );
      };

      const contextValue = getAutomlContext({
        pipelineRun: undefined,
        models: {},
      });

      render(
        <AutomlResultsContext.Provider value={contextValue}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('has-pipeline')).toHaveTextContent('no');
      expect(screen.getByTestId('models-count')).toHaveTextContent('0');
    });
  });

  describe('context updates', () => {
    it('should update when context value changes', () => {
      const TestComponent = () => {
        const context = useAutomlResultsContext();
        return <div data-testid="task-type">{context.parameters?.task_type}</div>;
      };

      const initialContext = getAutomlContext({
        pipelineRun: createMockPipelineRun({ task_type: 'binary' }),
      });

      const { rerender } = render(
        <AutomlResultsContext.Provider value={initialContext}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('task-type')).toHaveTextContent('binary');

      // Update context
      const updatedContext = getAutomlContext({
        pipelineRun: createMockPipelineRun({ task_type: 'regression' }),
      });

      rerender(
        <AutomlResultsContext.Provider value={updatedContext}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('task-type')).toHaveTextContent('regression');
    });

    it('should update when models change', () => {
      const TestComponent = () => {
        const context = useAutomlResultsContext();
        return (
          <div>
            <div data-testid="models-count">{Object.keys(context.models).length}</div>
            <div data-testid="model-names">
              {Object.keys(context.models)
                .map((key) => context.models[key].name)
                .join(', ')}
            </div>
          </div>
        );
      };

      const initialContext = getAutomlContext({
        pipelineRun: createMockPipelineRun(),
        models: {},
      });

      const { rerender } = render(
        <AutomlResultsContext.Provider value={initialContext}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('models-count')).toHaveTextContent('0');
      expect(screen.getByTestId('model-names')).toHaveTextContent('');

      // Update with models
      const updatedContext = getAutomlContext({
        pipelineRun: createMockPipelineRun(),
        models: mockModels,
      });

      rerender(
        <AutomlResultsContext.Provider value={updatedContext}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('models-count')).toHaveTextContent('2');
      expect(screen.getByTestId('model-names')).toHaveTextContent('Model 1, Model 2');
    });

    it('should update loading states', () => {
      const TestComponent = () => {
        const context = useAutomlResultsContext();
        return (
          <div>
            <div data-testid="pipeline-loading">{String(context.pipelineRunLoading)}</div>
            <div data-testid="models-loading">{String(context.modelsLoading)}</div>
          </div>
        );
      };

      const initialContext = getAutomlContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: true,
        modelsLoading: true,
      });

      const { rerender } = render(
        <AutomlResultsContext.Provider value={initialContext}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('pipeline-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('models-loading')).toHaveTextContent('true');

      // Update to loaded state
      const updatedContext = getAutomlContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: false,
        modelsLoading: false,
      });

      rerender(
        <AutomlResultsContext.Provider value={updatedContext}>
          <TestComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('pipeline-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('models-loading')).toHaveTextContent('false');
    });
  });

  describe('nested components', () => {
    it('should provide context to deeply nested components', () => {
      const DeepComponent = () => {
        const context = useAutomlResultsContext();
        return <div data-testid="deep-task-type">{context.parameters?.task_type}</div>;
      };

      const MiddleComponent = () => (
        <div>
          <DeepComponent />
        </div>
      );

      const contextValue = getAutomlContext({
        pipelineRun: createMockPipelineRun({ task_type: 'multiclass' }),
      });

      render(
        <AutomlResultsContext.Provider value={contextValue}>
          <MiddleComponent />
        </AutomlResultsContext.Provider>,
      );

      expect(screen.getByTestId('deep-task-type')).toHaveTextContent('multiclass');
    });
  });
});
