/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AutoragResultsPage from '~/app/pages/AutoragResultsPage';
import type { AutoragPattern } from '~/app/types/autoragPattern';
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
const mockUseAutoragResults = jest.fn();

jest.mock('~/app/hooks/queries', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));

jest.mock('~/app/hooks/useAutoragResults', () => ({
  useAutoragResults: (...args: unknown[]) => mockUseAutoragResults(...args),
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

// Mock AutoragResults to capture context
let capturedContext: unknown = null;
jest.mock('~/app/components/run-results/AutoragResults', () => ({
  __esModule: true,
  default: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useAutoragResultsContext } = jest.requireActual('~/app/context/AutoragResultsContext');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = useAutoragResultsContext();
    capturedContext = context;
    return <div data-testid="autorag-results">AutoRAG Results Component</div>;
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

// ============================================================================
// Test Helpers
// ============================================================================

const createMockPattern = (name: string, metrics: Record<string, number>): AutoragPattern => ({
  name,
  iteration: 1,
  max_combinations: 10,
  duration_seconds: 120,
  settings: {
    vector_store: {
      datasource_type: 'milvus',
      collection_name: 'test_collection',
    },
    chunking: {
      method: 'sequential',
      chunk_size: 512,
      chunk_overlap: 50,
    },
    embedding: {
      model_id: 'text-embedding-3',
      distance_metric: 'cosine',
      embedding_params: {
        embedding_dimension: 1536,
        context_length: 8192,
        timeout: null,
        model_type: null,
        provider_id: null,
        provider_resource_id: null,
      },
    },
    retrieval: {
      method: 'simple',
      number_of_chunks: 5,
      search_mode: 'vector',
    },
    generation: {
      model_id: 'llama-3',
      context_template_text: 'Context: {context}',
      user_message_text: 'Question: {question}',
      system_message_text: 'You are a helpful assistant.',
    },
  },
  scores: Object.fromEntries(
    Object.entries(metrics).map(([key, value]) => [
      key,
      {
        mean: value,
        ci_high: value + 0.05,
        ci_low: value - 0.05,
      },
    ]),
  ) as AutoragPattern['scores'],
  final_score: Object.values(metrics)[0] ?? 0,
});

const mockPatterns: Record<string, AutoragPattern> = {
  'pattern-1': createMockPattern('Pattern 1', {
    faithfulness: 0.95,
    answer_correctness: 0.92,
  }),
  'pattern-2': createMockPattern('Pattern 2', {
    faithfulness: 0.88,
    answer_correctness: 0.85,
  }),
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
      <AutoragResultsPage />
    </QueryClientProvider>,
  );
};

describe('AutoragResultsPage', () => {
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

    mockUseAutoragResults.mockReturnValue({
      patterns: {},
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

    it('should pass runId, namespace, and pipelineRun to useAutoragResults', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(mockUseAutoragResults).toHaveBeenCalledWith('run-123', 'test-ns', mockPipelineRun);
    });
  });

  describe('context integration', () => {
    it('should provide context with pipelineRun and patterns', () => {
      const mockPipelineRun = createMockPipelineRun(undefined, {
        display_name: 'My RAG Run',
        input_data_secret_name: 'my-secret',
        input_data_bucket_name: 'my-bucket',
        input_data_key: 'input.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test.csv',
        llama_stack_secret_name: 'llama-secret',
        generation_models: ['llama-3'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness',
        optimization_max_rag_patterns: 10,
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutoragResults.mockReturnValue({
        patterns: mockPatterns,
        isLoading: false,
        isError: false,
      });

      renderPage();

      expect(screen.getByTestId('autorag-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        pipelineRun: mockPipelineRun,
        patterns: mockPatterns,
        pipelineRunLoading: false,
        patternsLoading: false,
        parameters: {
          display_name: 'My RAG Run',
          input_data_secret_name: 'my-secret',
          input_data_bucket_name: 'my-bucket',
          input_data_key: 'input.csv',
          test_data_secret_name: 'test-secret',
          test_data_bucket_name: 'test-bucket',
          test_data_key: 'test.csv',
          llama_stack_secret_name: 'llama-secret',
          generation_models: ['llama-3'],
          embeddings_models: ['text-embedding-3'],
          optimization_metric: 'faithfulness',
          optimization_max_rag_patterns: 10,
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
      expect(screen.queryByTestId('autorag-results')).not.toBeInTheDocument();
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

      expect(screen.getByTestId('autorag-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        pipelineRunLoading: true,
      });
    });

    it('should set patternsLoading from useAutoragResults', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutoragResults.mockReturnValue({
        patterns: {},
        isLoading: true,
        isError: false,
      });

      renderPage();

      expect(capturedContext).toMatchObject({
        patternsLoading: true,
      });
    });

    it('should pass patterns from useAutoragResults to context', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutoragResults.mockReturnValue({
        patterns: mockPatterns,
        isLoading: false,
        isError: false,
      });

      renderPage();

      expect(capturedContext).toMatchObject({
        patterns: mockPatterns,
      });
    });

    it('should handle empty patterns', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutoragResults.mockReturnValue({
        patterns: {},
        isLoading: false,
        isError: false,
      });

      renderPage();

      expect(capturedContext).toMatchObject({
        patterns: {},
      });
    });
  });

  describe('empty states', () => {
    it('should render InvalidPipelineRun when pipeline run query errors', () => {
      // Create error with message that parseErrorStatus can recognize
      const error = new Error('Request failed with status code 404');

      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isFetching: false,
        isError: true,
        error,
      });

      renderPage();

      expect(screen.getByTestId('invalid-run')).toBeInTheDocument();
      expect(screen.queryByTestId('autorag-results')).not.toBeInTheDocument();
    });

    it('should render InvalidProject when namespace is invalid', () => {
      const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
      useNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'other-ns' }],
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
      expect(screen.queryByTestId('autorag-results')).not.toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should not render results while pipeline run is loading', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: true,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.queryByTestId('autorag-results')).not.toBeInTheDocument();
    });

    it('should render results when loaded', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId('autorag-results')).toBeInTheDocument();
    });
  });

  describe('breadcrumbs', () => {
    it('should render breadcrumb with namespace and run name', () => {
      const mockPipelineRun = createMockPipelineRun({
        display_name: 'My Test Run',
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      // Breadcrumb should show namespace
      expect(screen.getByText(/test-ns/)).toBeInTheDocument();
      // Breadcrumb should show run display name
      expect(screen.getByText('My Test Run')).toBeInTheDocument();
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
          queryKey: ['autorag', 'pipelineRun', 'run-123', 'test-ns'],
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
