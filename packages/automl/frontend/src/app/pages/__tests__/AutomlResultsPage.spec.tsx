/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

jest.mock('~/app/hooks/mutations', () => ({
  useTerminatePipelineRunMutation: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useRetryPipelineRunMutation: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useDeletePipelineRunMutation: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
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

jest.mock('~/app/components/run-results/StopRunModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    isTerminating,
    onConfirm,
    onClose,
  }: {
    isOpen: boolean;
    isTerminating: boolean;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="stop-run-modal">
        <button data-testid="confirm-stop-run-button" onClick={onConfirm} disabled={isTerminating}>
          Stop
        </button>
        <button data-testid="cancel-stop-run-button" onClick={onClose} disabled={isTerminating}>
          Cancel
        </button>
      </div>
    ) : null,
}));

const mockNotification = { success: jest.fn(), error: jest.fn() };
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => mockNotification,
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    empty,
    loaded,
    emptyStatePage,
    breadcrumb,
    headerAction,
  }: {
    children: React.ReactNode;
    empty: boolean;
    loaded: boolean;
    emptyStatePage: React.ReactNode;
    breadcrumb?: React.ReactNode;
    headerAction?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="applications-page">
      {breadcrumb}
      {headerAction}
      {empty ? emptyStatePage : null}
      {loaded && !empty ? children : null}
    </div>
  ),
}));

jest.mock('~/app/components/common/AutomlHeader/AutomlHeader', () => ({
  __esModule: true,
  default: () => <span>AutoML</span>,
}));

// ============================================================================
// Test Helpers
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AutomlResultsPage />
    </QueryClientProvider>,
  );
};

describe('AutomlResultsPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    capturedContext = null;
    mockUseParams.mockReturnValue({ namespace: 'test-ns', runId: 'run-123' });

    // Reset useNamespaceSelector mock to default state
    const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
    useNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'test-ns' }],
      updatePreferredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    // Reset mutation mocks to default state
    const { useTerminatePipelineRunMutation, useRetryPipelineRunMutation } =
      jest.requireMock('~/app/hooks/mutations');
    useTerminatePipelineRunMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    useRetryPipelineRunMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

        renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      renderPage();

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

      const { container } = renderPage();

      // The breadcrumb should show the display name
      // It's rendered as part of ApplicationsPage which we mocked, so check the raw render
      expect(container.textContent).toContain('My Custom Run Name');
    });
  });

  describe('stop and retry actions', () => {
    const setupWithRunState = (state: string) => {
      const mockPipelineRun = createMockPipelineRun({ state });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });
    };

    it('should show Stop button when run is RUNNING', () => {
      setupWithRunState('RUNNING');
      renderPage();

      expect(screen.getByTestId('stop-run-button')).toBeInTheDocument();
      expect(screen.queryByTestId('retry-run-button')).not.toBeInTheDocument();
    });

    it('should show Stop button when run is PENDING', () => {
      setupWithRunState('PENDING');
      renderPage();

      expect(screen.getByTestId('stop-run-button')).toBeInTheDocument();
    });

    it('should not show Stop button when run is CANCELING', () => {
      setupWithRunState('CANCELING');
      renderPage();

      expect(screen.queryByTestId('stop-run-button')).not.toBeInTheDocument();
    });

    it('should show Stop button when run is PAUSED', () => {
      setupWithRunState('PAUSED');
      renderPage();

      expect(screen.getByTestId('stop-run-button')).toBeInTheDocument();
    });

    it('should show Retry button when run is FAILED', () => {
      setupWithRunState('FAILED');
      renderPage();

      expect(screen.getByTestId('retry-run-button')).toBeInTheDocument();
      expect(screen.queryByTestId('stop-run-button')).not.toBeInTheDocument();
    });

    it('should show Retry button when run is CANCELED', () => {
      setupWithRunState('CANCELED');
      renderPage();

      expect(screen.getByTestId('retry-run-button')).toBeInTheDocument();
      expect(screen.queryByTestId('stop-run-button')).not.toBeInTheDocument();
    });

    it('should not show Stop or Retry buttons when run is SUCCEEDED', () => {
      setupWithRunState('SUCCEEDED');
      renderPage();

      expect(screen.queryByTestId('stop-run-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('retry-run-button')).not.toBeInTheDocument();
    });

    it('should open StopRunModal when Stop button is clicked', async () => {
      setupWithRunState('RUNNING');
      renderPage();

      expect(screen.queryByTestId('stop-run-modal')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('stop-run-button'));

      expect(screen.getByTestId('stop-run-modal')).toBeInTheDocument();
    });

    it('should call terminate mutation when stop is confirmed', async () => {
      setupWithRunState('RUNNING');
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderPage();

      await userEvent.click(screen.getByTestId('stop-run-button'));
      await userEvent.click(screen.getByTestId('confirm-stop-run-button'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('should show success notification after successful stop', async () => {
      setupWithRunState('RUNNING');
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderPage();

      await userEvent.click(screen.getByTestId('stop-run-button'));
      await userEvent.click(screen.getByTestId('confirm-stop-run-button'));

      await waitFor(() => {
        expect(mockNotification.success).toHaveBeenCalledWith(
          'Stop submitted successfully',
          'The process is asynchronous and may take some time to take effect',
        );
      });
    });

    it('should show error notification when stop fails', async () => {
      setupWithRunState('RUNNING');
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('Network error'));
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderPage();

      await userEvent.click(screen.getByTestId('stop-run-button'));
      await userEvent.click(screen.getByTestId('confirm-stop-run-button'));

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith('Failed to stop run', 'Network error');
      });
    });

    it('should close StopRunModal after stop completes', async () => {
      setupWithRunState('RUNNING');
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderPage();

      await userEvent.click(screen.getByTestId('stop-run-button'));
      expect(screen.getByTestId('stop-run-modal')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('confirm-stop-run-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('stop-run-modal')).not.toBeInTheDocument();
      });
    });

    it('should disable modal buttons while termination is pending', async () => {
      setupWithRunState('RUNNING');
      const { useTerminatePipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useTerminatePipelineRunMutation.mockReturnValue({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        mutateAsync: jest.fn().mockReturnValue(new Promise(() => {})),
        isPending: true,
      });

      renderPage();

      await userEvent.click(screen.getByTestId('stop-run-button'));

      expect(screen.getByTestId('confirm-stop-run-button')).toBeDisabled();
      expect(screen.getByTestId('cancel-stop-run-button')).toBeDisabled();
    });

    it('should show success notification and invalidate queries when retry succeeds', async () => {
      setupWithRunState('FAILED');
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      const { useRetryPipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useRetryPipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const invalidateQueriesSpy = jest.spyOn(QueryClient.prototype, 'invalidateQueries');

      renderPage();

      await userEvent.click(screen.getByTestId('retry-run-button'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['pipelineRun', 'run-123', 'test-ns'],
        });
        expect(mockNotification.success).toHaveBeenCalledWith(
          'Retry submitted successfully',
          'The process is asynchronous and may take some time to take effect',
        );
      });

      // Verify call order: mutateAsync -> invalidateQueries -> success notification
      const mutateOrder = mockMutateAsync.mock.invocationCallOrder[0];
      const invalidateOrder = invalidateQueriesSpy.mock.invocationCallOrder[0];
      const notifyOrder = mockNotification.success.mock.invocationCallOrder[0];
      expect(mutateOrder).toBeLessThan(invalidateOrder);
      expect(invalidateOrder).toBeLessThan(notifyOrder);
    });

    it('should show error notification when retry fails', async () => {
      setupWithRunState('FAILED');
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('Retry failed'));
      const { useRetryPipelineRunMutation } = jest.requireMock('~/app/hooks/mutations');
      useRetryPipelineRunMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderPage();

      await userEvent.click(screen.getByTestId('retry-run-button'));

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith('Failed to retry run', 'Retry failed');
      });
    });
  });
});
