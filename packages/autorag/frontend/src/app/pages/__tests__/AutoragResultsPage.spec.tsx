/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
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

describe('AutoragResultsPage', () => {
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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

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

      render(<AutoragResultsPage />);

      // Breadcrumb should show namespace
      expect(screen.getByText(/test-ns/)).toBeInTheDocument();
      // Breadcrumb should show run display name
      expect(screen.getByText('My Test Run')).toBeInTheDocument();
    });
  });
});
