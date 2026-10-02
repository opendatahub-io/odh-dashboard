/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AutoragResultsPage, {
  buildResponsesTemplate,
  normalizeResponsesTemplate,
} from '~/app/pages/AutoragResultsPage';
import type { AutoragPattern, ResponsesTemplate } from '~/app/types/autoragPattern';
import type { AutoragRuntimeParameters, PipelineRun } from '~/app/types';
import { AUTORAG_EVENTS } from '~/app/utilities/tracking';
import { downloadBlob } from '~/app/utilities/utils';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireMiscTrackingEventMock = jest.mocked(fireMiscTrackingEvent);
const downloadBlobMock = jest.mocked(downloadBlob);

// ============================================================================
// Mocks
// ============================================================================

const mockUseParams = jest.fn();
const mockUseLocation = jest.fn<{ state: unknown }, []>(() => ({ state: null }));
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => mockUseParams(),
  useLocation: () => mockUseLocation(),
  Link: ({
    to,
    children,
    state,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    state?: { from?: string };
  } & Record<string, unknown>) => (
    <a href={to} data-from={state?.from} {...rest}>
      {children}
    </a>
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
const mockUseS3ListFilesQuery = jest.fn();
const mockFetchS3File = jest.fn();

const mockUseSecretCredentialsQuery = jest.fn();

jest.mock('~/app/hooks/usePipelineRunQuery', () => ({
  usePipelineRunQuery: (...args: unknown[]) => mockUsePipelineRunQuery(...args),
}));
jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/hooks'),
  useS3ListFilesQuery: (...args: unknown[]) => mockUseS3ListFilesQuery(...args),
  useFetchS3File: () => mockFetchS3File,
  useTerminatePipelineRunMutation: jest.fn(),
  useRetryPipelineRunMutation: jest.fn(),
  useDeletePipelineRunMutation: jest.fn(),
}));
jest.mock('~/app/hooks/useSecretCredentialsQuery', () => ({
  useSecretCredentialsQuery: (...args: unknown[]) => mockUseSecretCredentialsQuery(...args),
}));

jest.mock('~/app/utilities/utils', () => ({
  ...jest.requireActual('~/app/utilities/utils'),
  downloadBlob: jest.fn(),
}));

jest.mock('~/app/hooks/useAutoragResults', () => ({
  ...jest.requireActual('~/app/hooks/useAutoragResults'),
  useAutoragResults: (...args: unknown[]) => mockUseAutoragResults(...args),
}));

jest.mock('~/app/hooks/useComponentStageMap', () => ({
  useComponentStageMap: () => ({
    componentStageMap: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
  }),
}));

jest.mock('~/app/hooks/useComponentStatuses', () => ({
  useComponentStatuses: () => ({
    mergedStageMap: undefined,
    isLoading: false,
  }),
}));

// Mock AutoragResults to capture context
let capturedContext: unknown = null;
let capturedViewCodeTemplate: unknown = null;
jest.mock('~/app/components/run-results/AutoragResults', () => ({
  __esModule: true,
  default: ({ onViewCode }: { onViewCode?: (patternName: string) => void }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useAutoragResultsContext } = jest.requireActual('~/app/context/AutoragResultsContext');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = useAutoragResultsContext();
    capturedContext = context;
    return (
      <div data-testid="autorag-results">
        <button data-testid="view-code-trigger" onClick={() => onViewCode?.('pattern-1')}>
          View code
        </button>
      </div>
    );
  },
}));

jest.mock('~/app/components/run-results/ViewCodeModal', () => ({
  __esModule: true,
  default: ({ responsesTemplate }: { responsesTemplate: unknown }) => {
    capturedViewCodeTemplate = responsesTemplate;
    return <div data-testid="view-code-modal" />;
  },
}));

jest.mock('@odh-dashboard/autox-core/ui/components/feature', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/components/feature'),
  InvalidPipelineRun: () => <div data-testid="invalid-run">Invalid Run</div>,
  StopRunModal: ({
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

jest.mock('~/app/components/empty-states/InvalidProject', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-project">Invalid Project</div>,
}));

const mockNotification = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => mockNotification,
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    empty,
    loaded,
    loadError,
    emptyStatePage,
    breadcrumb,
    headerAction,
  }: {
    children: React.ReactNode;
    empty: boolean;
    loaded: boolean;
    loadError?: Error;
    emptyStatePage: React.ReactNode;
    breadcrumb?: React.ReactNode;
    headerAction?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="applications-page">
      {breadcrumb}
      {headerAction}
      {loadError ? <div data-testid="load-error">{loadError.message}</div> : null}
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
    store_binding: {
      provider_type: 'milvus',
      collection_name: 'vs_collection0',
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
  evaluation: {
    metrics: [
      ...Object.entries(metrics).map(([metricName, value]) => ({
        evaluator: 'unitxt' as const,
        name: metricName,
        scores: { mean: value, ci_high: value + 0.05, ci_low: value - 0.05 },
      })),
      {
        evaluator: 'custom' as const,
        name: 'overall_score',
        scores: {
          mean: Object.values(metrics)[0] ?? 0,
          ci_low: null,
          ci_high: null,
        },
        optimization_metric: true,
      },
    ],
  },
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

describe('buildResponsesTemplate', () => {
  it('should omit ranking options for dense retrieval', () => {
    const template = buildResponsesTemplate(mockPatterns['pattern-1'], 'run-123');

    expect(template.tools[0].ranking_options).toBeUndefined();
  });

  it('should emit the supported RRF ranking shape for hybrid retrieval', () => {
    const pattern = {
      ...mockPatterns['pattern-1'],
      settings: {
        ...mockPatterns['pattern-1'].settings,
        retrieval: { ...mockPatterns['pattern-1'].settings.retrieval, search_mode: 'hybrid' },
      },
    } as AutoragPattern;

    expect(buildResponsesTemplate(pattern, 'run-123').tools[0].ranking_options).toEqual({
      ranker: 'rrf',
      alpha: 0.5,
    });
  });

  it('should preserve an explicitly configured zero alpha', () => {
    const pattern = {
      ...mockPatterns['pattern-1'],
      settings: {
        ...mockPatterns['pattern-1'].settings,
        retrieval: {
          ...mockPatterns['pattern-1'].settings.retrieval,
          search_mode: 'hybrid',
          ranker_alpha: 0,
        },
      },
    } as AutoragPattern;

    expect(buildResponsesTemplate(pattern, 'run-123').tools[0].ranking_options).toEqual({
      ranker: 'rrf',
      alpha: 0,
    });
  });
});

describe('normalizeResponsesTemplate', () => {
  it('should remove legacy ranking fields from a persisted response template', () => {
    const template = buildResponsesTemplate(mockPatterns['pattern-1'], 'run-123');
    const legacyTemplate = {
      ...template,
      tools: [
        {
          ...template.tools[0],
          ranking_options: {
            ranker: 'legacy-ranker',
            alpha: 0.25,
            impact_factor: 0.75,
          },
        },
      ],
    } as unknown as typeof template;

    expect(normalizeResponsesTemplate(legacyTemplate)).toEqual({
      ...template,
      tools: [
        {
          ...template.tools[0],
          ranking_options: { ranker: 'rrf', alpha: 0.25 },
        },
      ],
    });
  });
});

const createMockPipelineRun = (
  overrides?: Partial<PipelineRun>,
  parameters?: AutoragRuntimeParameters,
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AutoragResultsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const expectHeaderActions = (conditionalAction?: 'stop' | 'retry') => {
  const actionIds = [
    conditionalAction === 'stop' ? 'stop-run-button' : undefined,
    conditionalAction === 'retry' ? 'retry-run-button' : undefined,
    'reconfigure-run-button',
    'starter-kit-download-button',
    'run-details-button',
  ].filter((id): id is string => id !== undefined);

  const actions = actionIds.map((id) => screen.getByTestId(id));
  actions.forEach((action) => expect(action).toHaveClass('pf-m-link'));
  actions.slice(0, -1).forEach((action, index) => {
    expect(action.compareDocumentPosition(actions[index + 1])).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
};

describe('AutoragResultsPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    capturedContext = null;
    capturedViewCodeTemplate = null;
    mockUseParams.mockReturnValue({ namespace: 'test-ns', runId: 'run-123' });
    mockUseLocation.mockReturnValue({ state: null });

    // Reset useNamespaceSelector mock to default state
    const { useNamespaceSelector } = jest.requireMock('mod-arch-core');
    useNamespaceSelector.mockReturnValue({
      namespaces: [{ name: 'test-ns' }],
      updatePreferredNamespace: jest.fn(),
      namespacesLoaded: true,
      namespacesLoadError: undefined,
    });

    // Reset mutation mocks to default state
    const {
      useTerminatePipelineRunMutation,
      useRetryPipelineRunMutation,
      useDeletePipelineRunMutation,
    } = jest.requireMock('@odh-dashboard/autox-core/ui/hooks');
    useTerminatePipelineRunMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    useRetryPipelineRunMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
    useDeletePipelineRunMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    mockUseSecretCredentialsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
    mockUseS3ListFilesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    mockFetchS3File.mockReset();

    mockUseAutoragResults.mockReturnValue({
      patterns: {},
      failedPatterns: [],
      isLoading: false,
      isError: false,
      ragPatternsBasePath: undefined,
      error: undefined,
      refetch: jest.fn(),
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
    it('should normalize legacy ranking fields before opening View Code', () => {
      const legacyTemplate = {
        ...buildResponsesTemplate(mockPatterns['pattern-1'], 'run-123'),
        tools: [
          {
            ...buildResponsesTemplate(mockPatterns['pattern-1'], 'run-123').tools[0],
            ranking_options: {
              ranker_strategy: 'weighted',
              impact_factor: 0.75,
            },
          },
        ],
      } as unknown as ResponsesTemplate;
      const pattern = {
        ...mockPatterns['pattern-1'],
        inference: { responses_template: legacyTemplate },
      };
      const mockPipelineRun = createMockPipelineRun(undefined, {
        maas_secret_name: 'maas-secret',
        db_secret_name: 'database-secret',
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });
      mockUseAutoragResults.mockReturnValue({
        patterns: { 'pattern-1': pattern },
        failedPatterns: [],
        isLoading: false,
        isError: false,
        ragPatternsBasePath: undefined,
      });

      renderPage();
      fireEvent.click(screen.getByTestId('view-code-trigger'));

      expect(capturedViewCodeTemplate).toEqual({
        ...legacyTemplate,
        tools: [
          {
            ...legacyTemplate.tools[0],
            ranking_options: { ranker: 'rrf', alpha: 0.5 },
          },
        ],
      });
    });

    it('should provide context with pipelineRun and patterns', () => {
      const mockPipelineRun = createMockPipelineRun(undefined, {
        display_name: 'My RAG Run',
        input_data_secret_name: 'my-secret',
        input_data_bucket_name: 'my-bucket',
        input_data_key: 'input.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test.csv',
        ogx_secret_name: 'ogx-secret',
        generation_models: ['llama-3'],
        embedding_models: ['text-embedding-3'],
        optimization_metric: 'unitxt:faithfulness',
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
        failedPatterns: [],
        isLoading: false,
        isError: false,
        ragPatternsBasePath: 's3://bucket/rag-patterns',
      });

      renderPage();

      expect(screen.getByTestId('autorag-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        pipelineRun: mockPipelineRun,
        patterns: mockPatterns,
        pipelineRunLoading: false,
        patternsLoading: false,
        ragPatternsBasePath: 's3://bucket/rag-patterns',
        parameters: {
          display_name: 'My RAG Run',
          input_data_secret_name: 'my-secret',
          input_data_bucket_name: 'my-bucket',
          input_data_key: 'input.csv',
          test_data_secret_name: 'test-secret',
          test_data_bucket_name: 'test-bucket',
          test_data_key: 'test.csv',
          ogx_secret_name: 'ogx-secret',
          generation_models: ['llama-3'],
          embedding_models: ['text-embedding-3'],
          optimization_metric: 'unitxt:faithfulness',
          optimization_max_rag_patterns: 10,
        },
      });
    });

    it('should render a canonical run without an OGX secret', () => {
      const mockPipelineRun = createMockPipelineRun(undefined, {
        input_data_keys: ['documents/input.pdf'],
        maas_secret_name: 'maas-secret',
        db_secret_name: 'vector-db-secret',
        generation_models: ['llama-3'],
        embedding_models: ['text-embedding-3'],
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
        failedPatterns: [],
        isLoading: false,
        isError: false,
        ragPatternsBasePath: 's3://bucket/rag-patterns',
      });

      renderPage();

      expect(screen.getByTestId('autorag-results')).toBeInTheDocument();
      expect(capturedContext).toMatchObject({
        pipelineRun: mockPipelineRun,
        parameters: mockPipelineRun.runtime_config?.parameters,
      });
      expect(mockUseSecretCredentialsQuery).toHaveBeenCalledWith('test-ns', undefined);
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
        failedPatterns: [],
        isLoading: true,
        isError: false,
        ragPatternsBasePath: undefined,
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
        failedPatterns: [],
        isLoading: false,
        isError: false,
        ragPatternsBasePath: undefined,
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
        failedPatterns: [],
        isLoading: false,
        isError: false,
        ragPatternsBasePath: undefined,
      });

      renderPage();

      expect(capturedContext).toMatchObject({
        patterns: {},
      });
    });

    it('should pass ogxCredentials through context when secret data is available', () => {
      const mockPipelineRun = createMockPipelineRun(undefined, {
        ogx_secret_name: 'my-ogx-secret',
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseSecretCredentialsQuery.mockReturnValue({
        data: {
          OGX_CLIENT_BASE_URL: btoa('https://ogx.example.com'),
          OGX_CLIENT_API_KEY: btoa('sk-test-key'),
        },
        isLoading: false,
        error: undefined,
      });

      renderPage();

      expect(mockUseSecretCredentialsQuery).toHaveBeenCalledWith('test-ns', 'my-ogx-secret');
      expect(capturedContext).toMatchObject({
        ogxCredentials: {
          baseUrl: btoa('https://ogx.example.com'),
          apiKey: btoa('sk-test-key'),
        },
      });
    });

    it('should not pass ogxCredentials when secret data is missing required keys', () => {
      const mockPipelineRun = createMockPipelineRun(undefined, {
        ogx_secret_name: 'my-ogx-secret',
      });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseSecretCredentialsQuery.mockReturnValue({
        data: { SOME_OTHER_KEY: 'value' },
        isLoading: false,
        error: undefined,
      });

      renderPage();

      expect(capturedContext).toMatchObject({
        ogxCredentials: undefined,
      });
    });

    it('should not fetch credentials when ogx_secret_name is absent', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(mockUseSecretCredentialsQuery).toHaveBeenCalledWith('test-ns', undefined);
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

      expectHeaderActions();
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
    it('should render experiment context breadcrumb with Run results', () => {
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

      expect(screen.getByTestId('experiment-breadcrumb-home')).toHaveTextContent(/AutoRAG in/);
      expect(screen.getByTestId('experiment-breadcrumb-home')).toHaveTextContent('test-ns');
      expect(screen.getByTestId('project-navigator-link-in-breadcrumb')).toHaveTextContent(/Go to/);
      const experimentConfigLink = screen.getByTestId(
        'results-breadcrumb-experiment-configurations',
      );
      expect(experimentConfigLink).toHaveTextContent('Run configurations');
      expect(experimentConfigLink.querySelector('a')).toHaveAttribute(
        'href',
        '/gen-ai-studio/autorag/reconfigure/test-ns/run-123',
      );
      expect(experimentConfigLink.querySelector('a')).toHaveAttribute('data-from', 'results');
      expect(screen.getByText('Run results')).toBeInTheDocument();
      expect(
        screen.getByTestId('project-navigator-link-in-breadcrumb').querySelector('a'),
      ).toHaveAttribute('href', '/projects/test-ns');
    });
  });

  describe('stop and retry actions', () => {
    const setupWithRunState = (state: PipelineRun['state']) => {
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

    it.each([
      ['SUCCEEDED', undefined],
      ['RUNNING', 'stop'],
      ['PAUSED', 'stop'],
      ['FAILED', 'retry'],
      ['CANCELED', 'retry'],
    ] as const)('should render header actions in order for %s runs', (state, conditionalAction) => {
      setupWithRunState(state);
      renderPage();

      expectHeaderActions(conditionalAction);
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
      const { useTerminatePipelineRunMutation } = jest.requireMock(
        '@odh-dashboard/autox-core/ui/hooks',
      );
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
      const { useTerminatePipelineRunMutation } = jest.requireMock(
        '@odh-dashboard/autox-core/ui/hooks',
      );
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
      const { useTerminatePipelineRunMutation } = jest.requireMock(
        '@odh-dashboard/autox-core/ui/hooks',
      );
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
      const { useTerminatePipelineRunMutation } = jest.requireMock(
        '@odh-dashboard/autox-core/ui/hooks',
      );
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
      const { useTerminatePipelineRunMutation } = jest.requireMock(
        '@odh-dashboard/autox-core/ui/hooks',
      );
      // Start with isPending: false so the Stop button is clickable
      useTerminatePipelineRunMutation.mockReturnValue({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        mutateAsync: jest.fn().mockReturnValue(new Promise(() => {})),
        isPending: false,
      });

      const { rerender } = render(
        <MemoryRouter>
          <QueryClientProvider client={createTestQueryClient()}>
            <AutoragResultsPage />
          </QueryClientProvider>
        </MemoryRouter>,
      );

      // Open the modal
      await userEvent.click(screen.getByTestId('stop-run-button'));
      expect(screen.getByTestId('stop-run-modal')).toBeInTheDocument();

      // Now set isPending: true to simulate in-progress termination
      useTerminatePipelineRunMutation.mockReturnValue({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        mutateAsync: jest.fn().mockReturnValue(new Promise(() => {})),
        isPending: true,
      });

      rerender(
        <MemoryRouter>
          <QueryClientProvider client={createTestQueryClient()}>
            <AutoragResultsPage />
          </QueryClientProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('confirm-stop-run-button')).toBeDisabled();
      expect(screen.getByTestId('cancel-stop-run-button')).toBeDisabled();
    });

    it('should show success notification and invalidate queries when retry succeeds', async () => {
      setupWithRunState('FAILED');
      const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
      const { useRetryPipelineRunMutation } = jest.requireMock(
        '@odh-dashboard/autox-core/ui/hooks',
      );
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
      const { useRetryPipelineRunMutation } = jest.requireMock(
        '@odh-dashboard/autox-core/ui/hooks',
      );
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

  describe('error handling', () => {
    it('should not show loadError when pipeline run query fails but has previous data', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: true,
        error: new Error('Network timeout'),
      });

      renderPage();

      expect(screen.queryByTestId('load-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('autorag-results')).toBeInTheDocument();
    });

    it('should show loadError when pipeline run query fails on initial load', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: false,
        isFetching: false,
        isError: true,
        error: new Error('Server unavailable'),
      });

      renderPage();

      expect(screen.getByTestId('load-error')).toBeInTheDocument();
      expect(screen.getByTestId('load-error')).toHaveTextContent('Server unavailable');
    });

    it('should trigger warning notification when polling error occurs with previous data', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: true,
        error: new Error('Network timeout'),
      });

      renderPage();

      expect(mockNotification.warning).toHaveBeenCalledWith(
        'Pipeline run status update failed',
        'The status update has failed consistently for multiple attempts. The displayed results may not reflect the current state of the pipeline run.',
      );
    });

    it('should trigger warning notification when some patterns fail to load', () => {
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
        failedPatterns: ['BrokenPattern1', 'BrokenPattern2'],
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });

      renderPage();

      expect(mockNotification.warning).toHaveBeenCalledTimes(1);
      expect(mockNotification.warning).toHaveBeenCalledWith(
        '2 of 4 patterns could not be loaded',
        'The following patterns failed to load: BrokenPattern1, BrokenPattern2',
      );
    });

    it('should only trigger failed patterns notification once across re-renders', () => {
      const mockPipelineRun = createMockPipelineRun();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutoragResults.mockReturnValueOnce({
        patterns: mockPatterns,
        failedPatterns: ['BrokenPattern1'],
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });

      mockUseAutoragResults.mockReturnValueOnce({
        patterns: { ...mockPatterns },
        failedPatterns: ['BrokenPattern1'],
        isLoading: false,
        isError: false,
        error: undefined,
        refetch: jest.fn(),
      });

      const testQueryClient = createTestQueryClient();

      const { rerender } = render(
        <MemoryRouter>
          <QueryClientProvider client={testQueryClient}>
            <AutoragResultsPage />
          </QueryClientProvider>
        </MemoryRouter>,
      );

      expect(mockNotification.warning).toHaveBeenCalledTimes(1);

      rerender(
        <MemoryRouter>
          <QueryClientProvider client={testQueryClient}>
            <AutoragResultsPage />
          </QueryClientProvider>
        </MemoryRouter>,
      );

      expect(mockNotification.warning).toHaveBeenCalledTimes(1);
    });

    it('should pass patternsError, patternsLoadError, and onRetryPatterns through context', () => {
      const mockPipelineRun = createMockPipelineRun();
      const mockRefetch = jest.fn();

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      mockUseAutoragResults.mockReturnValue({
        patterns: {},
        failedPatterns: [],
        isLoading: false,
        isError: true,
        error: new Error('Failed to list RAG patterns directory'),
        refetch: mockRefetch,
      });

      renderPage();

      expect(capturedContext).toMatchObject({
        patternsError: true,
        patternsLoadError: expect.objectContaining({
          message: 'Failed to list RAG patterns directory',
        }),
        onRetryPatterns: mockRefetch,
      });
    });
  });

  describe('starter kit download', () => {
    const renderWithRun = (run: PipelineRun) => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: run,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });
      return renderPage();
    };

    const mockNestedArtifactLists = (
      options: {
        discoveryPrefixes?: { prefix: string }[];
        starterKitContents?: { key: string; size: number }[];
        starterKitDirectoryMissing?: boolean;
        errorPath?: string;
        loadingPath?: string;
      } = {},
      runId = 'run-123',
    ): string => {
      const discoveryPath = `documents-rag-optimization-pipeline/${runId}/rag-templates-optimization`;
      const artifactPath = `${discoveryPath}/11111111-1111-1111-1111-111111111111`;
      const starterKitPath = `${artifactPath}/starter_kit`;
      const key = `${starterKitPath}/starter_kit.zip`;

      mockUseS3ListFilesQuery.mockImplementation((_namespace: string, path?: string) => {
        if (path === discoveryPath) {
          return {
            data: {
              contents: [],
              common_prefixes: options.discoveryPrefixes ?? [{ prefix: `${artifactPath}/` }],
            },
            isLoading: options.loadingPath === path,
            isError: options.errorPath === path,
          };
        }
        if (path === starterKitPath) {
          if (options.starterKitDirectoryMissing) {
            return { data: undefined, isLoading: false, isError: false };
          }
          return {
            data: {
              contents: options.starterKitContents ?? [{ key, size: 1 }],
              common_prefixes: [],
            },
            isLoading: options.loadingPath === path,
            isError: options.errorPath === path,
          };
        }
        return { data: undefined, isLoading: false, isError: false };
      });

      return key;
    };

    it.each(['PENDING', 'RUNNING', 'CANCELING', 'PAUSED', undefined])(
      'should disable the action before successful completion for state %s',
      (state) => {
        renderWithRun(createMockPipelineRun({ state: state as PipelineRun['state'] }));

        expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
          'aria-disabled',
          'true',
        );
      },
    );

    it.each(['FAILED', 'CANCELED', 'SKIPPED', 'CACHED'])(
      'should disable the action after unsuccessful completion for state %s',
      (state) => {
        renderWithRun(createMockPipelineRun({ state: state as PipelineRun['state'] }));

        expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
          'aria-disabled',
          'true',
        );
      },
    );

    it('should show the artifact-checking tooltip while successful-run discovery is pending', async () => {
      const user = userEvent.setup();
      mockUseS3ListFilesQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
      renderWithRun(createMockPipelineRun());

      expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.hover(screen.getByTestId('starter-kit-download-button'));
      expect(await screen.findByText('Checking artifact availability...')).toBeInTheDocument();
    });

    it.each([
      ['missing UUID', []],
      [
        'ambiguous UUIDs',
        [
          {
            prefix:
              'documents-rag-optimization-pipeline/run-123/rag-templates-optimization/11111111-1111-1111-1111-111111111111/',
          },
          {
            prefix:
              'documents-rag-optimization-pipeline/run-123/rag-templates-optimization/22222222-2222-2222-2222-222222222222/',
          },
        ],
      ],
    ])('should disable the action for %s', (_caseName, discoveryPrefixes) => {
      mockNestedArtifactLists({ discoveryPrefixes });
      renderWithRun(createMockPipelineRun());

      expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('should show the approved tooltip for an incomplete run', async () => {
      const user = userEvent.setup();
      renderWithRun(createMockPipelineRun({ state: 'RUNNING' }));

      await user.hover(screen.getByTestId('starter-kit-download-button'));

      expect(
        await screen.findByText('Available after the run completes successfully'),
      ).toBeInTheDocument();
    });

    it('should show the approved tooltip for an unsuccessful run', async () => {
      const user = userEvent.setup();
      renderWithRun(createMockPipelineRun({ state: 'FAILED' }));

      await user.hover(screen.getByTestId('starter-kit-download-button'));

      expect(
        await screen.findByText('Unavailable because the run did not complete successfully'),
      ).toBeInTheDocument();
    });

    it('should remain disabled when the exact artifact is absent', () => {
      mockNestedArtifactLists({ starterKitContents: [] });
      renderWithRun(createMockPipelineRun());

      expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('should remain disabled when the starter kit directory is absent', () => {
      mockNestedArtifactLists({ starterKitDirectoryMissing: true });
      renderWithRun(createMockPipelineRun());

      expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('should remain disabled when a nested artifact listing fails', () => {
      mockNestedArtifactLists({
        errorPath:
          'documents-rag-optimization-pipeline/run-123/rag-templates-optimization/11111111-1111-1111-1111-111111111111/starter_kit',
      });
      renderWithRun(createMockPipelineRun());

      expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('should show Artifact unavailable when a successful run has no exact artifact', async () => {
      const user = userEvent.setup();
      mockNestedArtifactLists({ starterKitContents: [] });
      renderWithRun(createMockPipelineRun());

      expectHeaderActions();
      await user.hover(screen.getByTestId('starter-kit-download-button'));

      expect(await screen.findByText('Artifact unavailable')).toBeInTheDocument();
    });

    it('should not show a tooltip when the action is enabled', async () => {
      const user = userEvent.setup();
      mockNestedArtifactLists();
      renderWithRun(createMockPipelineRun());

      await user.hover(screen.getByTestId('starter-kit-download-button'));

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should hide the artifact behind the unavailable state when listing fails', () => {
      mockNestedArtifactLists({
        errorPath: 'documents-rag-optimization-pipeline/run-123/rag-templates-optimization',
      });
      renderWithRun(createMockPipelineRun());

      expect(screen.getByTestId('starter-kit-download-button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('should download the exact starter kit and track only after success', async () => {
      const blob = new Blob(['zip']);
      const key =
        'documents-rag-optimization-pipeline/run-123/rag-templates-optimization/11111111-1111-1111-1111-111111111111/starter_kit/starter_kit.zip';
      mockNestedArtifactLists({ starterKitContents: [{ key, size: blob.size }] });
      mockFetchS3File.mockResolvedValue(blob);
      renderWithRun(createMockPipelineRun());

      await userEvent.click(screen.getByTestId('starter-kit-download-button'));

      await waitFor(() => {
        expect(mockFetchS3File).toHaveBeenCalledWith(
          'test-ns',
          key,
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(downloadBlobMock).toHaveBeenCalledWith(blob, 'starter_kit.zip');
        expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(
          AUTORAG_EVENTS.STARTER_KIT_DOWNLOADED,
          { downloadType: 'starterKit' },
        );
      });
    });

    it('should show the existing danger alert and not track a failed download', async () => {
      mockNestedArtifactLists();
      mockFetchS3File.mockRejectedValue(new Error('S3 connection failed'));
      renderWithRun(createMockPipelineRun());

      await userEvent.click(screen.getByTestId('starter-kit-download-button'));

      expect(await screen.findByText('Starter kit download failed')).toBeInTheDocument();
      expect(fireMiscTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.STARTER_KIT_DOWNLOADED,
        expect.anything(),
      );
    });

    it('should ignore a stale download completion while a new route download is active', async () => {
      let rejectFirstDownload: (reason?: unknown) => void = () => undefined;
      let resolveSecondDownload: (value: Blob) => void = () => undefined;
      const firstDownload = new Promise<Blob>((_, reject) => {
        rejectFirstDownload = reject;
      });
      const secondBlob = new Blob(['second download']);
      const secondDownload = new Promise<Blob>((resolve) => {
        resolveSecondDownload = resolve;
      });
      mockFetchS3File.mockReturnValueOnce(firstDownload).mockReturnValueOnce(secondDownload);
      mockNestedArtifactLists();
      const renderResult = renderWithRun(createMockPipelineRun());

      await userEvent.click(screen.getByTestId('starter-kit-download-button'));
      expect(mockFetchS3File).toHaveBeenCalledTimes(1);
      const firstController = mockFetchS3File.mock.calls[0][2].signal as AbortSignal;

      mockUseParams.mockReturnValue({ namespace: 'test-ns', runId: 'run-456' });
      mockUsePipelineRunQuery.mockImplementation((nextRunId: string) => ({
        data: createMockPipelineRun({ run_id: nextRunId }),
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      }));
      mockNestedArtifactLists({}, 'run-456');
      renderResult.rerender(
        <MemoryRouter>
          <QueryClientProvider client={createTestQueryClient()}>
            <AutoragResultsPage />
          </QueryClientProvider>
        </MemoryRouter>,
      );

      await userEvent.click(screen.getByTestId('starter-kit-download-button'));
      expect(mockFetchS3File).toHaveBeenCalledTimes(2);
      expect(firstController.aborted).toBe(true);
      expect(screen.getByTestId('starter-kit-download-button')).not.toHaveAttribute(
        'aria-disabled',
        'true',
      );

      await act(async () => {
        rejectFirstDownload(new Error('stale download failed'));
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.queryByText('Starter kit download failed')).not.toBeInTheDocument();
      });

      resolveSecondDownload(secondBlob);
      await waitFor(() => {
        expect(downloadBlobMock).toHaveBeenCalledWith(secondBlob, 'starter_kit.zip');
        expect(screen.getByTestId('starter-kit-download-button')).not.toHaveAttribute(
          'aria-disabled',
          'true',
        );
      });
    });

    it('should abort and ignore a pending starter kit download after unmount', async () => {
      let rejectDownload: (reason?: unknown) => void = () => undefined;
      const pendingDownload = new Promise<Blob>((_, reject) => {
        rejectDownload = reject;
      });
      mockNestedArtifactLists();
      mockFetchS3File.mockReturnValue(pendingDownload);
      const { unmount } = renderWithRun(createMockPipelineRun());

      await userEvent.click(screen.getByTestId('starter-kit-download-button'));
      const controller = mockFetchS3File.mock.calls[0][2].signal as AbortSignal;
      unmount();

      expect(controller.aborted).toBe(true);
      rejectDownload(new Error('stale starter kit failure'));
      await pendingDownload.catch(() => undefined);

      expect(downloadBlobMock).not.toHaveBeenCalled();
      expect(fireMiscTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.STARTER_KIT_DOWNLOADED,
        expect.anything(),
      );
    });
  });

  describe('reconfigure action', () => {
    it('should always show Reconfigure button when pipeline run is loaded', () => {
      const mockPipelineRun = createMockPipelineRun({ state: 'SUCCEEDED' });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId('reconfigure-run-button')).toBeInTheDocument();
    });

    it('should link to the reconfigure route with namespace and runId', () => {
      const mockPipelineRun = createMockPipelineRun({ state: 'SUCCEEDED' });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      const reconfigureButton = screen.getByTestId('reconfigure-run-button');
      const link = reconfigureButton.closest('a');
      expect(link).toHaveAttribute('href', '/gen-ai-studio/autorag/reconfigure/test-ns/run-123');
      expect(link).toHaveAttribute('data-from', 'results');
    });

    it('should show Reconfigure button alongside Stop button for active runs', () => {
      const mockPipelineRun = createMockPipelineRun({ state: 'RUNNING' });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId('stop-run-button')).toBeInTheDocument();
      expect(screen.getByTestId('reconfigure-run-button')).toBeInTheDocument();
    });

    it('should show Reconfigure button alongside Retry button for failed runs', () => {
      const mockPipelineRun = createMockPipelineRun({ state: 'FAILED' });

      mockUsePipelineRunQuery.mockReturnValue({
        data: mockPipelineRun,
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId('retry-run-button')).toBeInTheDocument();
      expect(screen.getByTestId('reconfigure-run-button')).toBeInTheDocument();
    });
  });

  describe('AutoRAG Results Viewed tracking', () => {
    it('should fire with entrySource from location state when navigated from the experiments list', () => {
      mockUseLocation.mockReturnValue({ state: { entrySource: 'experimentsList' } });
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(),
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RESULTS_VIEWED, {
        entrySource: 'experimentsList',
      });
    });

    it('should fall back to entrySource: other when location state is missing/invalid', () => {
      mockUseLocation.mockReturnValue({ state: null });
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(),
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RESULTS_VIEWED, {
        entrySource: 'other',
      });
    });

    it('should not fire again on re-renders for the same run', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: createMockPipelineRun(),
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
      });

      const { rerender } = renderPage();
      rerender(
        <MemoryRouter>
          <QueryClientProvider client={createTestQueryClient()}>
            <AutoragResultsPage />
          </QueryClientProvider>
        </MemoryRouter>,
      );

      expect(fireMiscTrackingEventMock).toHaveBeenCalledTimes(1);
    });

    it('should not fire while the pipeline run has not yet loaded', () => {
      mockUsePipelineRunQuery.mockReturnValue({
        data: undefined,
        isPending: true,
        isFetching: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(fireMiscTrackingEventMock).not.toHaveBeenCalled();
    });
  });
});
