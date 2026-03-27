/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AutomlResultsPage from '~/app/pages/AutomlResultsPage';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { PipelineRun } from '~/app/types';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

// ============================================================================
// Mocks
// ============================================================================

const mockUseParams = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => mockUseParams(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual('mod-arch-core'),
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-ns' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
    namespacesLoadError: undefined,
  }),
}));

const mockUsePipelineRunQuery = jest.fn();
const mockUseAutomlResults = jest.fn();

jest.mock('~/app/hooks/queries', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

jest.mock('~/app/hooks/useAutomlResults', () => ({
  useAutomlResults: (...args: unknown[]) => mockUseAutomlResults(...args),
}));

// Mock AutomlResults to capture context
let capturedContext: unknown = null;
jest.mock('~/app/components/run-results/AutomlResults', () => ({
  __esModule: true,
  default: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useAutomlResultsContext } = jest.requireActual('~/app/context/AutomlResultsContext');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = useAutomlResultsContext();
    capturedContext = context;
    return <div data-testid="automl-results">AutoML Results Component</div>;
  },
}));

jest.mock('~/app/components/empty-states/InvalidPipelineRun', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-run">Invalid Run</div>,
}));

jest.mock('~/app/components/empty-states/InvalidProject', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-project">Invalid Project</div>,
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    empty,
    loaded,
    emptyStatePage,
    breadcrumb,
  }: {
    children: React.ReactNode;
    empty: boolean;
    loaded: boolean;
    emptyStatePage: React.ReactNode;
    breadcrumb?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="applications-page">
      {breadcrumb}
      {empty ? emptyStatePage : null}
      {loaded && !empty ? children : null}
    </div>
  ),
  TitleWithIcon: ({ title }: { title: string }) => <span>{title}</span>,
  ProjectObjectType: { pipelineExperiment: 'pipelineExperiment' },
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createMockModel = (name: string, metrics: Record<string, number>): AutomlModel => ({
  display_name: name,
  model_config: {
    eval_metric: 'accuracy',
  },
  location: {
    model_directory: `/models/${name}`,
    predictor: `/models/${name}/predictor.pkl`,
    notebook: `/models/${name}/notebook.ipynb`,
  },
  metrics: {
    test_data: metrics,
  },
});

const mockModels: Record<string, AutomlModel> = {
  'model-1': createMockModel('Model 1', { accuracy: 0.95 }),
  'model-2': createMockModel('Model 2', { accuracy: 0.92 }),
};

const createMockPipelineRun = (
  overrides?: Partial<PipelineRun>,
  parameters?: Partial<ConfigureSchema>,
): PipelineRun => ({
  run_id: 'run-123',
  display_name: 'Test Run',
  state: 'SUCCEEDED',
  created_at: '2025-01-17T00:00:00Z',
  runtime_config: parameters ? ({ parameters } as PipelineRun['runtime_config']) : undefined,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('AutomlResultsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedContext = null;
    mockUseParams.mockReturnValue({ namespace: 'test-ns', runId: 'run-123' });
    mockUseAutomlResults.mockReturnValue({
      models: {},
      isLoading: false,
      isError: false,
    });
  });

  describe('hook integration', () => {
    it('should pass namespace and runId from URL params to usePipelineRunQuery', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: true,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(mockUsePipelineRunQuery).toHaveBeenCalledWith('run-123', 'test-ns');
    });

    it('should pass runId, namespace, and pipelineRun to useAutomlResults', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(mockUseAutomlResults).toHaveBeenCalledWith('run-123', 'test-ns', mockPipelineRun);
    });
  });

  describe('context integration', () => {
    it('should provide context with pipelineRun and models', () => {
      const mockPipelineRun = createMockPipelineRun(undefined, {
        task_type: 'binary',
        train_data_secret_name: 'my-secret',
        train_data_bucket_name: 'my-bucket',
        train_data_file_key: 'data.csv',
        label_column: 'target',
        top_n: 3,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutomlResults.mockReturnValue({
        models: mockModels,
        isLoading: false,
        isError: false,
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('automl-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        pipelineRun: mockPipelineRun,
        models: mockModels,
        pipelineRunLoading: false,
        modelsLoading: false,
        parameters: {
          task_type: 'binary',
          train_data_secret_name: 'my-secret',
          train_data_bucket_name: 'my-bucket',
          train_data_file_key: 'data.csv',
          label_column: 'target',
          top_n: 3,
        },
      });
    });

    it('should set pipelineRunLoading when isPending is true', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: true,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      // Page should still be loading
      expect(screen.queryByTestId('automl-results')).not.toBeInTheDocument();
    });

    it('should set pipelineRunLoading when isFetching is true', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: true,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('automl-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        pipelineRunLoading: true,
      });
    });

    it('should set modelsLoading when useAutomlResults is loading', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutomlResults.mockReturnValue({
        models: {},
        isLoading: true,
        isError: false,
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('automl-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        modelsLoading: true,
      });
    });

    it('should default task_type to timeseries when not in parameters', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(capturedContext).toMatchObject({
        parameters: {
          task_type: 'timeseries',
        },
      });
    });

    it('should handle all task types', () => {
      const taskTypes = ['binary', 'multiclass', 'regression', 'timeseries'] as const;

      taskTypes.forEach((taskType) => {
        jest.clearAllMocks();
        capturedContext = null;

        const mockPipelineRun = createMockPipelineRun(undefined, {
          task_type: taskType,
          train_data_secret_name: 'secret',
          train_data_bucket_name: 'bucket',
          train_data_file_key: 'file.csv',
          top_n: 3,
        });

        mockUsePipelineRunQuery.mockReturnValue({
          data: mockPipelineRun,
          isPending: false,
          isFetching: false,
          isError: false,
          error: null,
        });

        render(<AutomlResultsPage />);

        expect(capturedContext).toMatchObject({
          parameters: expect.objectContaining({
            task_type: taskType,
          }),
        });
      });
    });

    it('should handle empty models', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutomlResults.mockReturnValue({
        models: {},
        isLoading: false,
        isError: false,
      });

      render(<AutomlResultsPage />);

      expect(capturedContext).toMatchObject({
        models: {},
      });
    });
  });

  describe('empty states', () => {
    it('should render InvalidPipelineRun when query errors', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isFetching: false,
        isError: true,
        error: new Error('Pipeline run not found: status code 404'),
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('invalid-run')).toBeInTheDocument();
      expect(screen.queryByTestId('automl-results')).not.toBeInTheDocument();
    });

    it('should render InvalidProject for invalid namespace', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'other-ns' }],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('invalid-project')).toBeInTheDocument();
      expect(screen.queryByTestId('automl-results')).not.toBeInTheDocument();
    });

    it('should render InvalidProject for no namespaces', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('invalid-project')).toBeInTheDocument();
      expect(screen.queryByTestId('automl-results')).not.toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should not render AutomlResults when namespaces not loaded', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: false,
        namespacesLoadError: undefined,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(screen.queryByTestId('automl-results')).not.toBeInTheDocument();
    });

    it('should not render AutomlResults when pipelineRun is pending', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: true,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(screen.queryByTestId('automl-results')).not.toBeInTheDocument();
    });
  });

  describe('parameters with different configurations', () => {
    it('should handle tabular parameters (binary)', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'test-ns' }],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      const mockPipelineRun = createMockPipelineRun(undefined, {
        task_type: 'binary',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'train.csv',
        label_column: 'label',
        top_n: 5,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('automl-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        parameters: {
          task_type: 'binary',
          label_column: 'label',
          top_n: 5,
        },
      });
    });

    it('should handle timeseries parameters', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'test-ns' }],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      const mockPipelineRun = createMockPipelineRun(undefined, {
        task_type: 'timeseries',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'timeseries.csv',
        target: 'sales',
        id_column: 'store_id',
        timestamp_column: 'date',
        prediction_length: 30,
        known_covariates_names: ['holiday', 'promotion'],
        top_n: 3,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      render(<AutomlResultsPage />);

      expect(screen.getByTestId('automl-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        parameters: {
          task_type: 'timeseries',
          target: 'sales',
          id_column: 'store_id',
          timestamp_column: 'date',
          prediction_length: 30,
          known_covariates_names: ['holiday', 'promotion'],
          top_n: 3,
        },
      });
    });
  });

  describe('breadcrumb', () => {
    it('should display pipeline run display_name in breadcrumb', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'test-ns' }],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      const mockPipelineRun = createMockPipelineRun({
        display_name: 'My Custom Run Name',
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      const { container } = render(<AutomlResultsPage />);

      // The breadcrumb should show the display name
      // It's rendered as part of ApplicationsPage which we mocked, so check the raw render
      expect(container.textContent).toContain('My Custom Run Name');
    });
  });
});
