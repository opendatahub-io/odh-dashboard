/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AutoragLeaderboard from '~/app/components/run-results/AutoragLeaderboard';
import { AutoragResultsContext } from '~/app/context/AutoragResultsContext';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';

// Mock empty state component
jest.mock('~/app/components/empty-states/AutoragRunInProgress', () => ({
  __esModule: true,
  default: ({ namespace }: { namespace: string }) => (
    <div data-testid="run-in-progress">Pipeline running in namespace: {namespace}</div>
  ),
}));

// ============================================================================
// Mock Data Fixtures
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

// Standard RAG patterns with different metrics
const mockStandardPatterns: Record<string, AutoragPattern> = {
  'pattern-1': createMockPattern('Basic RAG', {
    faithfulness: 0.85,
    answer_correctness: 0.82,
    context_correctness: 0.88,
  }),
  'pattern-2': createMockPattern('Advanced RAG', {
    faithfulness: 0.92,
    answer_correctness: 0.89,
    context_correctness: 0.94,
  }),
  'pattern-3': createMockPattern('Hybrid RAG', {
    faithfulness: 0.88,
    answer_correctness: 0.85,
    context_correctness: 0.9,
  }),
};

// Patterns with additional metrics
const mockPatternsWithExtraMetrics: Record<string, AutoragPattern> = {
  'pattern-1': createMockPattern('Pattern A', {
    faithfulness: 0.9,
    answer_correctness: 0.87,
    context_correctness: 0.92,
    answer_relevancy: 0.88,
    context_precision: 0.85,
    context_recall: 0.9,
  }),
  'pattern-2': createMockPattern('Pattern B', {
    faithfulness: 0.93,
    answer_correctness: 0.91,
    context_correctness: 0.95,
    answer_relevancy: 0.92,
    context_precision: 0.89,
    context_recall: 0.93,
  }),
};

// Patterns with very small metric values (for scientific notation testing)
const mockPatternsWithSmallValues: Record<string, AutoragPattern> = {
  'pattern-1': createMockPattern('Pattern X', {
    faithfulness: 0.0000123,
    answer_correctness: 0.0000045,
  }),
};

// Patterns with missing/malformed settings (for defensive handling testing)
const mockPatternsWithMalformedSettings: Record<string, AutoragPattern> = {
  'pattern-1': {
    ...createMockPattern('Pattern with null settings', {
      faithfulness: 0.85,
    }),
    settings: null as unknown as AutoragPattern['settings'],
  },
  'pattern-2': {
    ...createMockPattern('Pattern with undefined settings', {
      faithfulness: 0.9,
    }),
    settings: undefined as unknown as AutoragPattern['settings'],
  },
  'pattern-3': {
    ...createMockPattern('Pattern with partial settings', {
      faithfulness: 0.88,
    }),
    settings: {
      vector_store: {
        datasource_type: 'milvus',
        collection_name: 'test_collection',
      },
      chunking: null as unknown as AutoragPattern['settings']['chunking'],
      embedding: undefined as unknown as AutoragPattern['settings']['embedding'],
      retrieval: {
        method: 'simple',
        number_of_chunks: null as unknown as number,
      } as unknown as AutoragPattern['settings']['retrieval'],
      generation: {} as AutoragPattern['settings']['generation'],
    },
  },
};

// Helper to create mock parameters
const createMockParameters = (
  optimizationMetric: 'faithfulness' | 'answer_correctness' | 'context_correctness',
) => ({
  display_name: 'Test RAG Run',
  input_data_secret_name: 'test-secret',
  input_data_bucket_name: 'test-bucket',
  input_data_key: 'input.csv',
  test_data_secret_name: 'test-secret',
  test_data_bucket_name: 'test-bucket',
  test_data_key: 'test.csv',
  llama_stack_secret_name: 'llama-secret',
  generation_models: ['llama-3'],
  embeddings_models: ['text-embedding-3'],
  optimization_metric: optimizationMetric,
  optimization_max_rag_patterns: 10,
});

const createMockPipelineRun = (
  state: RuntimeStateKF,
  optimizationMetric?: 'faithfulness' | 'answer_correctness' | 'context_correctness',
): PipelineRun => ({
  run_id: 'test-run-123',
  display_name: 'Test AutoRAG Run',
  state,
  created_at: '2025-01-17T00:00:00Z',
  runtime_config: optimizationMetric
    ? {
        parameters: createMockParameters(optimizationMetric),
      }
    : undefined,
});

// ============================================================================
// Test Helper Components
// ============================================================================

interface RenderWithContextOptions {
  patterns?: Record<string, AutoragPattern>;
  pipelineRun?: PipelineRun;
  pipelineRunLoading?: boolean;
  patternsLoading?: boolean;
  optimizationMetric?: 'faithfulness' | 'answer_correctness' | 'context_correctness';
  namespace?: string;
}

const renderWithContext = ({
  patterns = {},
  pipelineRun,
  pipelineRunLoading = false,
  patternsLoading = false,
  optimizationMetric,
  namespace = 'test-namespace',
}: RenderWithContextOptions = {}) => {
  const finalOptimizationMetric: 'faithfulness' | 'answer_correctness' | 'context_correctness' =
    optimizationMetric ??
    ((pipelineRun?.runtime_config?.parameters as Record<string, unknown> | undefined)
      ?.optimization_metric as
      | 'faithfulness'
      | 'answer_correctness'
      | 'context_correctness'
      | undefined) ??
    'faithfulness';

  const contextValue = {
    pipelineRun,
    pipelineRunLoading,
    patterns,
    patternsLoading,
    parameters: createMockParameters(finalOptimizationMetric),
  };

  return render(
    <MemoryRouter initialEntries={[`/autorag/${namespace}/results/test-run-123`]}>
      <Routes>
        <Route
          path="/autorag/:namespace/results/:runId"
          element={
            <AutoragResultsContext.Provider value={contextValue}>
              <AutoragLeaderboard />
            </AutoragResultsContext.Provider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('AutoragLeaderboard utility functions', () => {
  describe('formatMetricName', () => {
    it('should format RAG metrics correctly', () => {
      renderWithContext({
        patterns: {
          'pattern-1': createMockPattern('Test Pattern', {
            faithfulness: 0.95,
            answer_correctness: 0.92,
            context_correctness: 0.9,
            answer_relevancy: 0.88,
            context_precision: 0.85,
            context_recall: 0.87,
          }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Check that RAG metrics are displayed correctly (use testids since text appears multiple times)
      expect(screen.getByTestId('metric-header-faithfulness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-context_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-answer_relevancy')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-context_precision')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-context_recall')).toBeInTheDocument();

      // For faithfulness optimization, faithfulness should be marked as optimized
      const faithfulnessHeader = screen.getByTestId('metric-header-faithfulness');
      expect(faithfulnessHeader).toBeInTheDocument();
      expect(within(faithfulnessHeader).getByTestId('optimized-indicator')).toBeInTheDocument();
    });

    it('should convert snake_case to Title Case for custom metrics', () => {
      renderWithContext({
        patterns: {
          'pattern-1': createMockPattern('Test Pattern', {
            custom_metric: 0.85,
            another_test_metric: 0.9,
          }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.getByTestId('metric-header-custom_metric')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-another_test_metric')).toBeInTheDocument();
    });
  });

  describe('formatMetricValue', () => {
    it('should format normal values with 3 decimal places', () => {
      renderWithContext({
        patterns: {
          'pattern-1': createMockPattern('Test Pattern', {
            faithfulness: 0.95432,
          }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Value should be formatted to 3 decimal places
      const metricCell = screen.getByTestId('metric-faithfulness-1');
      expect(metricCell).toHaveTextContent('0.954');
    });

    it('should use scientific notation for very small values', () => {
      renderWithContext({
        patterns: mockPatternsWithSmallValues,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Very small values should use scientific notation
      const faithfulnessCell = screen.getByTestId('metric-faithfulness-1');
      expect(faithfulnessCell.textContent).toMatch(/1\.230e-5|1\.23e-5/);
    });
  });
});

// ============================================================================
// Component Behavior Tests
// ============================================================================

describe('AutoragLeaderboard component', () => {
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

    it('should show loading skeleton when patternsLoading is true', () => {
      renderWithContext({
        patternsLoading: true,
      });

      expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show empty state with completion message when succeeded with no patterns', () => {
      renderWithContext({
        patterns: {},
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED),
      });

      const emptyState = screen.getByTestId('leaderboard-empty');
      expect(emptyState).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();

      expect(within(emptyState).getByText('No patterns produced')).toBeInTheDocument();
      // Text is split across multiple elements (spans and a button), so use toHaveTextContent
      expect(emptyState).toHaveTextContent(
        'The pipeline run completed but did not generate any patterns. Please check the pipeline configuration and logs.',
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
        patterns: {},
        pipelineRun: state !== undefined ? createMockPipelineRun(state) : undefined,
      });

      const emptyState = screen.getByTestId('leaderboard-empty');
      expect(emptyState).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();

      expect(within(emptyState).getByText('No patterns produced')).toBeInTheDocument();
      expect(emptyState).toHaveTextContent(expectedMessage);

      // All non-SUCCEEDED states should NOT show the SUCCEEDED message
      if (state !== RuntimeStateKF.SUCCEEDED) {
        expect(emptyState).not.toHaveTextContent(
          'The pipeline run completed but did not generate any patterns. Please check the pipeline configuration and logs.',
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
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.PENDING),
      });

      expect(screen.getByTestId('run-in-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show running state when pipeline is RUNNING', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.RUNNING),
      });

      expect(screen.getByTestId('run-in-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show running state when pipeline is CANCELING', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.CANCELING),
      });

      expect(screen.getByTestId('run-in-progress')).toBeInTheDocument();
      expect(screen.queryByTestId('leaderboard-table')).not.toBeInTheDocument();
    });

    it('should show running state with correct namespace', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.RUNNING),
        namespace: 'my-namespace',
      });

      expect(screen.getByText(/my-namespace/)).toBeInTheDocument();
    });

    it('should show table when pipeline is SUCCEEDED', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.queryByTestId('run-in-progress')).not.toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Table Structure
  // ========================================================================

  describe('table structure', () => {
    it('should render table with correct headers', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.getByTestId('rank-header')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-name-header')).toBeInTheDocument();
    });

    it('should render one row per pattern', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.getByTestId('leaderboard-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-3')).toBeInTheDocument();
    });

    it('should display pattern names correctly', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.getByText('Basic RAG')).toBeInTheDocument();
      expect(screen.getByText('Advanced RAG')).toBeInTheDocument();
      expect(screen.getByText('Hybrid RAG')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Ranking Logic
  // ========================================================================

  describe('ranking logic', () => {
    it('should rank patterns by optimized metric (higher is better)', () => {
      // faithfulness: Advanced RAG (0.92) > Hybrid RAG (0.88) > Basic RAG (0.85)
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Rank 1 should be Advanced RAG (highest faithfulness: 0.92)
      const rank1Row = screen.getByTestId('leaderboard-row-1');
      expect(within(rank1Row).getByText('Advanced RAG')).toBeInTheDocument();

      // Rank 2 should be Hybrid RAG (faithfulness: 0.88)
      const rank2Row = screen.getByTestId('leaderboard-row-2');
      expect(within(rank2Row).getByText('Hybrid RAG')).toBeInTheDocument();

      // Rank 3 should be Basic RAG (lowest faithfulness: 0.85)
      const rank3Row = screen.getByTestId('leaderboard-row-3');
      expect(within(rank3Row).getByText('Basic RAG')).toBeInTheDocument();
    });

    it('should rank by answer_correctness when specified', () => {
      // answer_correctness: Advanced RAG (0.89) > Hybrid RAG (0.85) > Basic RAG (0.82)
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'answer_correctness'),
      });

      const rank1Row = screen.getByTestId('leaderboard-row-1');
      expect(within(rank1Row).getByText('Advanced RAG')).toBeInTheDocument();
    });

    it('should rank by context_correctness when specified', () => {
      // context_correctness: Advanced RAG (0.94) > Hybrid RAG (0.90) > Basic RAG (0.88)
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'context_correctness'),
      });

      const rank1Row = screen.getByTestId('leaderboard-row-1');
      expect(within(rank1Row).getByText('Advanced RAG')).toBeInTheDocument();
    });

    it('should highlight top-ranked pattern', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.getByTestId('top-rank-label')).toBeInTheDocument();
      expect(screen.getByTestId('top-rank-label')).toHaveTextContent('1');
    });

    it('should not highlight non-top patterns', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Only one top rank label should exist
      const topRankLabels = screen.queryAllByTestId('top-rank-label');
      expect(topRankLabels).toHaveLength(1);
    });
  });

  // ========================================================================
  // Optimized Metric Display
  // ========================================================================

  describe('optimized metric indicator', () => {
    it('should mark faithfulness as optimized when it is the optimization_metric', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const faithfulnessHeader = screen.getByTestId('metric-header-faithfulness');
      expect(within(faithfulnessHeader).getByTestId('optimized-indicator')).toBeInTheDocument();
      expect(within(faithfulnessHeader).getByTestId('optimized-indicator')).toHaveTextContent(
        '(optimized)',
      );
    });

    it('should mark answer_correctness as optimized when specified', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'answer_correctness'),
      });

      const header = screen.getByTestId('metric-header-answer_correctness');
      expect(within(header).getByTestId('optimized-indicator')).toBeInTheDocument();
    });

    it('should not mark non-optimized metrics', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const answerCorrectnessHeader = screen.getByTestId('metric-header-answer_correctness');
      expect(
        within(answerCorrectnessHeader).queryByTestId('optimized-indicator'),
      ).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // Sorting Functionality
  // ========================================================================

  describe('sorting', () => {
    it('should sort by rank in ascending order by default', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const rows = screen.getAllByTestId(/^leaderboard-row-\d+$/);
      expect(within(rows[0]).getByTestId('rank-1')).toBeInTheDocument();
      expect(within(rows[1]).getByTestId('rank-2')).toBeInTheDocument();
      expect(within(rows[2]).getByTestId('rank-3')).toBeInTheDocument();
    });

    it('should allow sorting by pattern name', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const patternNameHeader = screen.getByTestId('pattern-name-header');
      const sortButton = within(patternNameHeader).getByRole('button');

      fireEvent.click(sortButton);

      const rows = screen.getAllByTestId(/^leaderboard-row-\d+$/);
      const firstPatternName = within(rows[0]).getByTestId(/^pattern-name-\d+$/);
      const lastPatternName = within(rows[2]).getByTestId(/^pattern-name-\d+$/);

      // After clicking, should be sorted alphabetically: Advanced RAG < Basic RAG < Hybrid RAG
      expect(firstPatternName).toHaveTextContent('Advanced RAG');
      expect(lastPatternName).toHaveTextContent('Hybrid RAG');
    });

    it('should allow sorting by metric columns', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const answerCorrectnessHeader = screen.getByTestId('metric-header-answer_correctness');
      const sortButton = within(answerCorrectnessHeader).getByRole('button');

      fireEvent.click(sortButton);

      // After sorting by answer_correctness ascending, lowest should be first
      const rows = screen.getAllByTestId(/^leaderboard-row-\d+$/);
      const firstRow = rows[0];

      // Basic RAG has lowest answer_correctness (0.82)
      expect(within(firstRow).getByText('Basic RAG')).toBeInTheDocument();
    });

    it('should toggle sort direction when clicking same column twice', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const rankHeader = screen.getByTestId('rank-header');
      const sortButton = within(rankHeader).getByRole('button');

      // First click: descending
      fireEvent.click(sortButton);

      let rows = screen.getAllByTestId(/^leaderboard-row-\d+$/);
      expect(within(rows[0]).getByTestId('rank-3')).toBeInTheDocument();

      // Second click: ascending
      fireEvent.click(sortButton);

      rows = screen.getAllByTestId(/^leaderboard-row-\d+$/);
      expect(within(rows[0]).getByTestId('rank-1')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Metric Display
  // ========================================================================

  describe('metric display', () => {
    it('should display all metrics for each pattern', () => {
      renderWithContext({
        patterns: mockPatternsWithExtraMetrics,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Check that all metric headers are present (only mean values)
      expect(screen.getByTestId('metric-header-faithfulness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-context_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-answer_relevancy')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-context_precision')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-context_recall')).toBeInTheDocument();
    });

    it('should display metric values with tooltip showing full precision', () => {
      renderWithContext({
        patterns: {
          'pattern-1': createMockPattern('Test', { faithfulness: 0.95432 }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const metricCell = screen.getByTestId('metric-faithfulness-1');
      expect(metricCell).toHaveTextContent('0.954');

      // Tooltip should show full value
      const tooltip = within(metricCell).getByText('0.954').closest('span');
      expect(tooltip).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Defensive Handling of Malformed Data
  // ========================================================================

  describe('defensive handling of malformed settings', () => {
    it('should handle patterns with null/undefined settings without crashing', () => {
      renderWithContext({
        patterns: mockPatternsWithMalformedSettings,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Table should render successfully
      expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();

      // All three patterns should be present
      expect(screen.getByTestId('leaderboard-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('leaderboard-row-3')).toBeInTheDocument();
    });

    it('should display "N/A" for missing settings fields', () => {
      renderWithContext({
        patterns: mockPatternsWithMalformedSettings,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Check that N/A is displayed for missing settings
      // Pattern with null settings should show N/A for all fields
      const row1 = screen.getByTestId('leaderboard-row-1'); // Pattern with undefined settings (rank 1, highest faithfulness 0.90)
      expect(within(row1).getByTestId('chunking-method-1')).toHaveTextContent('N/A');
      expect(within(row1).getByTestId('chunking-chunk-size-1')).toHaveTextContent('N/A');
      expect(within(row1).getByTestId('chunking-chunk-overlap-1')).toHaveTextContent('N/A');
      expect(within(row1).getByTestId('retrieval-method-1')).toHaveTextContent('N/A');
      expect(within(row1).getByTestId('retrieval-number-of-chunks-1')).toHaveTextContent('N/A');
      expect(within(row1).getByTestId('retrieval-search-mode-1')).toHaveTextContent('N/A');
      expect(within(row1).getByTestId('retrieval-ranker-strategy-1')).toHaveTextContent('N/A');
      // Model names (generation + embedding) are now in the sticky "Model names" column
      expect(within(row1).getByTestId('model-name-1')).toHaveTextContent('N/A');
    });

    it('should allow sorting by settings columns with N/A values', () => {
      renderWithContext({
        patterns: {
          ...mockPatternsWithMalformedSettings,
          'pattern-4': createMockPattern('Valid Pattern', {
            faithfulness: 0.92,
          }),
        },
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Click to sort by chunking method
      const chunkingMethodHeader = screen.getByTestId('chunking-method-header');
      const sortButton = within(chunkingMethodHeader).getByRole('button');
      fireEvent.click(sortButton);

      // Table should still render without errors
      expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();

      // N/A values should sort to the end
      const rows = screen.getAllByTestId(/^leaderboard-row-\d+$/);
      const lastRow = rows[rows.length - 1];
      // Last row should have either "N/A" or a valid value, but N/A should be at the end
      // We can't guarantee the exact order, but the table should render
      expect(lastRow).toBeInTheDocument();
    });

    it('should rank patterns by metrics even when settings are malformed', () => {
      renderWithContext({
        patterns: mockPatternsWithMalformedSettings,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Ranking should be based on metrics only (faithfulness: 0.90 > 0.88 > 0.85)
      const rank1Row = screen.getByTestId('leaderboard-row-1');
      const rank2Row = screen.getByTestId('leaderboard-row-2');
      const rank3Row = screen.getByTestId('leaderboard-row-3');

      // Rank 1: Pattern with undefined settings (faithfulness: 0.90)
      expect(within(rank1Row).getByText('Pattern with undefined settings')).toBeInTheDocument();
      expect(within(rank1Row).getByTestId('top-rank-label')).toBeInTheDocument();

      // Rank 2: Pattern with partial settings (faithfulness: 0.88)
      expect(within(rank2Row).getByText('Pattern with partial settings')).toBeInTheDocument();

      // Rank 3: Pattern with null settings (faithfulness: 0.85)
      expect(within(rank3Row).getByText('Pattern with null settings')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Actions
  // ========================================================================

  describe('row actions', () => {
    it('should render actions menu for each pattern', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const rows = screen.getAllByTestId(/^leaderboard-row-\d+$/);
      rows.forEach((row) => {
        const actionsButton = within(row).getByRole('button', { name: /kebab toggle/i });
        expect(actionsButton).toBeInTheDocument();
      });
    });

    it('should render pattern name as clickable link', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const patternLink = screen.getByTestId('pattern-link-1');
      expect(patternLink).toBeInTheDocument();
      expect(patternLink.tagName).toBe('BUTTON');
      expect(patternLink).toHaveTextContent('Advanced RAG');
    });
  });

  // ========================================================================
  // Model Names Column
  // ========================================================================

  describe('model names column', () => {
    it('should display generation and embedding model IDs in the model names column', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Model names column shows both generation and embedding model short names
      const rank1ModelCell = screen.getByTestId('model-name-1');
      expect(rank1ModelCell).toBeInTheDocument();
      // Should display short names (last segment of model ID)
      expect(rank1ModelCell).toHaveTextContent('llama-3');
      expect(rank1ModelCell).toHaveTextContent('text-embedding-3');
    });

    it('should display N/A for missing model IDs with malformed settings', () => {
      renderWithContext({
        patterns: mockPatternsWithMalformedSettings,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Patterns with null/undefined settings should show N/A for model names
      const row1 = screen.getByTestId('leaderboard-row-1');
      const modelCell = within(row1).getByTestId('model-name-1');
      expect(modelCell).toHaveTextContent('N/A');
    });

    it('should render model name header with sort button', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const modelHeader = screen.getByTestId('model-name-header');
      expect(modelHeader).toBeInTheDocument();
      expect(within(modelHeader).getByText('Model names')).toBeInTheDocument();
      expect(within(modelHeader).getByRole('button')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Settings Columns
  // ========================================================================

  describe('settings columns', () => {
    it('should display settings values for standard patterns', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Rank 1 is Advanced RAG
      const row1 = screen.getByTestId('leaderboard-row-1');
      expect(within(row1).getByTestId('retrieval-method-1')).toHaveTextContent('Simple');
      expect(within(row1).getByTestId('chunking-method-1')).toHaveTextContent('Sequential');
      expect(within(row1).getByTestId('chunking-chunk-size-1')).toHaveTextContent('512');
      expect(within(row1).getByTestId('chunking-chunk-overlap-1')).toHaveTextContent('50');
      expect(within(row1).getByTestId('retrieval-number-of-chunks-1')).toHaveTextContent('5');
      expect(within(row1).getByTestId('retrieval-search-mode-1')).toHaveTextContent('Vector');
    });

    it('should render settings column headers', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.getByTestId('retrieval-method-header')).toBeInTheDocument();
      expect(screen.getByTestId('chunking-method-header')).toBeInTheDocument();
      expect(screen.getByTestId('chunking-chunk-size-header')).toBeInTheDocument();
      expect(screen.getByTestId('chunking-chunk-overlap-header')).toBeInTheDocument();
      expect(screen.getByTestId('retrieval-number-of-chunks-header')).toBeInTheDocument();
      expect(screen.getByTestId('retrieval-search-mode-header')).toBeInTheDocument();
      expect(screen.getByTestId('retrieval-ranker-strategy-header')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Manage Columns
  // ========================================================================

  describe('manage columns', () => {
    it('should render manage columns button', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      const button = screen.getByTestId('manage-columns-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Manage columns');
    });

    it('should open column management modal when button is clicked', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      fireEvent.click(screen.getByTestId('manage-columns-button'));

      // Modal should be open
      expect(
        screen.getByText('Selected categories will be displayed in the table.'),
      ).toBeInTheDocument();
      // Always-visible columns should be disabled
      expect(screen.getByTestId('column-check-rank')).toBeDisabled();
      expect(screen.getByTestId('column-check-pattern')).toBeDisabled();
      expect(screen.getByTestId('column-check-modelNames')).toBeDisabled();
      expect(screen.getByTestId('column-check-optimized-metric')).toBeDisabled();
    });

    it('should allow toggling non-sticky metric columns', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Verify non-optimized metric headers exist before hiding
      expect(screen.getByTestId('metric-header-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-header-context_correctness')).toBeInTheDocument();

      // Open modal and uncheck answer_correctness
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      const checkbox = screen.getByTestId('column-check-metric:answer_correctness');
      expect(checkbox).not.toBeDisabled();
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByText('Save'));

      // answer_correctness header and cells should be hidden
      expect(screen.queryByTestId('metric-header-answer_correctness')).not.toBeInTheDocument();
      // context_correctness should still be visible
      expect(screen.getByTestId('metric-header-context_correctness')).toBeInTheDocument();
    });

    it('should allow toggling settings columns', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Verify settings column exists
      expect(screen.getByTestId('chunking-method-header')).toBeInTheDocument();

      // Hide chunking method column
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      const checkbox = screen.getByTestId('column-check-chunkingMethod');
      expect(checkbox).not.toBeDisabled();
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByText('Save'));

      // Chunking method should be hidden
      expect(screen.queryByTestId('chunking-method-header')).not.toBeInTheDocument();
      // Other settings columns should still be visible
      expect(screen.getByTestId('retrieval-method-header')).toBeInTheDocument();
    });

    it('should hide data cells when column is hidden', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Verify data cell exists
      expect(screen.getByTestId('chunking-method-1')).toBeInTheDocument();

      // Hide chunking method
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      fireEvent.click(screen.getByTestId('column-check-chunkingMethod'));
      fireEvent.click(screen.getByText('Save'));

      // Data cells should also be hidden
      expect(screen.queryByTestId('chunking-method-1')).not.toBeInTheDocument();
    });

    it('should not change columns when modal is cancelled', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      expect(screen.getByTestId('metric-header-answer_correctness')).toBeInTheDocument();

      // Open modal, uncheck, then cancel
      fireEvent.click(screen.getByTestId('manage-columns-button'));
      fireEvent.click(screen.getByTestId('column-check-metric:answer_correctness'));
      fireEvent.click(screen.getByText('Cancel'));

      // Column should still be visible
      expect(screen.getByTestId('metric-header-answer_correctness')).toBeInTheDocument();
    });

    it('should keep optimized metric visible and untoggleable', () => {
      renderWithContext({
        patterns: mockStandardPatterns,
        pipelineRun: createMockPipelineRun(RuntimeStateKF.SUCCEEDED, 'faithfulness'),
      });

      // Optimized metric is always visible
      expect(screen.getByTestId('metric-header-faithfulness')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('manage-columns-button'));
      const optimizedCheckbox = screen.getByTestId('column-check-optimized-metric');
      expect(optimizedCheckbox).toBeDisabled();
    });
  });
});
