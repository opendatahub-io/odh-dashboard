/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  AutoragResultsContext,
  useAutoragResultsContext,
  getAutoragContext,
} from '~/app/context/AutoragResultsContext';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import type { PipelineRun } from '~/app/types';

// ============================================================================
// Mock Data
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
  'pattern-1': createMockPattern('Pattern 1', { faithfulness: 0.95, answer_correctness: 0.92 }),
  'pattern-2': createMockPattern('Pattern 2', { faithfulness: 0.88, answer_correctness: 0.85 }),
};

const createMockPipelineRun = (parameters?: Record<string, unknown>): PipelineRun => ({
  run_id: 'run-123',
  display_name: 'Test Run',
  state: 'SUCCEEDED',
  created_at: '2025-01-17T00:00:00Z',
  runtime_config: parameters ? ({ parameters } as PipelineRun['runtime_config']) : undefined,
});

// ============================================================================
// getAutoragContext Tests
// ============================================================================

describe('getAutoragContext', () => {
  describe('basic functionality', () => {
    it('should create context with all provided values', () => {
      const pipelineRun = createMockPipelineRun({ optimization_metric: 'faithfulness' });
      const patterns = mockPatterns;

      const context = getAutoragContext({
        pipelineRun,
        patterns,
        pipelineRunLoading: true,
        patternsLoading: false,
      });

      expect(context).toEqual({
        pipelineRun,
        pipelineRunLoading: true,
        patterns,
        patternsLoading: false,
        parameters: {
          display_name: '',
          description: '',
          input_data_secret_name: '',
          input_data_bucket_name: '',
          input_data_key: '',
          test_data_secret_name: '',
          test_data_bucket_name: '',
          test_data_key: '',
          llama_stack_secret_name: '',
          llama_stack_vector_database_id: '',
          generation_models: [],
          embeddings_models: [],
          optimization_metric: 'faithfulness',
          optimization_max_rag_patterns: 8,
        },
        ragPatternsBasePath: undefined,
      });
    });

    it('should handle undefined pipelineRun', () => {
      const context = getAutoragContext({
        pipelineRun: undefined,
        patterns: mockPatterns,
      });

      expect(context).toEqual({
        pipelineRun: undefined,
        pipelineRunLoading: undefined,
        patterns: mockPatterns,
        patternsLoading: undefined,
        parameters: {
          display_name: '',
          description: '',
          input_data_secret_name: '',
          input_data_bucket_name: '',
          input_data_key: '',
          test_data_secret_name: '',
          test_data_bucket_name: '',
          test_data_key: '',
          llama_stack_secret_name: '',
          llama_stack_vector_database_id: '',
          generation_models: [],
          embeddings_models: [],
          optimization_metric: 'faithfulness',
          optimization_max_rag_patterns: 8,
        },
        ragPatternsBasePath: undefined,
      });
    });

    it('should handle empty patterns object', () => {
      const pipelineRun = createMockPipelineRun({ optimization_metric: 'answer_correctness' });

      const context = getAutoragContext({
        pipelineRun,
        patterns: {},
      });

      expect(context.patterns).toEqual({});
    });

    it('should default patterns to empty object when not provided', () => {
      const pipelineRun = createMockPipelineRun();

      const context = getAutoragContext({
        pipelineRun,
      });

      expect(context.patterns).toEqual({});
    });
  });

  describe('parameters extraction', () => {
    it('should extract all runtime_config parameters', () => {
      const pipelineRun = createMockPipelineRun({
        display_name: 'My RAG Run',
        description: 'Test description',
        input_data_secret_name: 'my-secret',
        input_data_bucket_name: 'my-bucket',
        input_data_key: 'input.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test.csv',
        llama_stack_secret_name: 'llama-secret',
        generation_models: ['llama-3', 'gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness',
        optimization_max_rag_patterns: 12,
      });

      const context = getAutoragContext({
        pipelineRun,
      });

      expect(context.parameters).toEqual({
        display_name: 'My RAG Run',
        description: 'Test description',
        input_data_secret_name: 'my-secret',
        input_data_bucket_name: 'my-bucket',
        input_data_key: 'input.csv',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test.csv',
        llama_stack_secret_name: 'llama-secret',
        llama_stack_vector_database_id: '',
        generation_models: ['llama-3', 'gpt-4'],
        embeddings_models: ['text-embedding-3'],
        optimization_metric: 'faithfulness',
        optimization_max_rag_patterns: 12,
      });
    });

    it('should handle pipeline run with no runtime_config', () => {
      const pipelineRun: PipelineRun = {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'SUCCEEDED',
        created_at: '2025-01-17T00:00:00Z',
      };

      const context = getAutoragContext({
        pipelineRun,
      });

      expect(context.parameters).toEqual({
        display_name: '',
        description: '',
        input_data_secret_name: '',
        input_data_bucket_name: '',
        input_data_key: '',
        test_data_secret_name: '',
        test_data_bucket_name: '',
        test_data_key: '',
        llama_stack_secret_name: '',
        llama_stack_vector_database_id: '',
        generation_models: [],
        embeddings_models: [],
        optimization_metric: 'faithfulness',
        optimization_max_rag_patterns: 8,
      });
    });

    it('should handle pipeline run with empty parameters', () => {
      const pipelineRun = createMockPipelineRun({});

      const context = getAutoragContext({
        pipelineRun,
      });

      expect(context.parameters).toEqual({
        display_name: '',
        description: '',
        input_data_secret_name: '',
        input_data_bucket_name: '',
        input_data_key: '',
        test_data_secret_name: '',
        test_data_bucket_name: '',
        test_data_key: '',
        llama_stack_secret_name: '',
        llama_stack_vector_database_id: '',
        generation_models: [],
        embeddings_models: [],
        optimization_metric: 'faithfulness',
        optimization_max_rag_patterns: 8,
      });
    });
  });

  describe('optimization_metric handling', () => {
    it('should preserve optimization_metric when provided', () => {
      const metrics = ['faithfulness', 'answer_correctness', 'context_correctness'] as const;

      metrics.forEach((metric) => {
        const pipelineRun = createMockPipelineRun({ optimization_metric: metric });
        const context = getAutoragContext({ pipelineRun });

        expect(context.parameters?.optimization_metric).toBe(metric);
      });
    });

    it('should apply default optimization_metric when not provided', () => {
      const pipelineRun = createMockPipelineRun({
        generation_models: ['llama-3'],
      });
      const context = getAutoragContext({ pipelineRun });

      expect(context.parameters?.optimization_metric).toBe('faithfulness');
    });
  });

  describe('loading states', () => {
    it('should handle both loading states as true', () => {
      const context = getAutoragContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: true,
        patternsLoading: true,
      });

      expect(context.pipelineRunLoading).toBe(true);
      expect(context.patternsLoading).toBe(true);
    });

    it('should handle both loading states as false', () => {
      const context = getAutoragContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: false,
        patternsLoading: false,
      });

      expect(context.pipelineRunLoading).toBe(false);
      expect(context.patternsLoading).toBe(false);
    });

    it('should default loading states to undefined when not provided', () => {
      const context = getAutoragContext({
        pipelineRun: createMockPipelineRun(),
      });

      expect(context.pipelineRunLoading).toBeUndefined();
      expect(context.patternsLoading).toBeUndefined();
    });
  });
});

// ============================================================================
// Context Provider and Hook Tests
// ============================================================================

describe('AutoragResultsContext and useAutoragResultsContext', () => {
  describe('context provider', () => {
    it('should provide context values to children', () => {
      const TestComponent = () => {
        const context = useAutoragResultsContext();
        return (
          <div>
            <div data-testid="pipeline-run-id">{context.pipelineRun?.run_id}</div>
            <div data-testid="patterns-count">{Object.keys(context.patterns).length}</div>
            <div data-testid="pipeline-loading">{String(context.pipelineRunLoading)}</div>
            <div data-testid="patterns-loading">{String(context.patternsLoading)}</div>
            <div data-testid="optimization-metric">{context.parameters?.optimization_metric}</div>
          </div>
        );
      };

      const contextValue = getAutoragContext({
        pipelineRun: createMockPipelineRun({ optimization_metric: 'faithfulness' }),
        patterns: mockPatterns,
        pipelineRunLoading: true,
        patternsLoading: false,
      });

      render(
        <AutoragResultsContext.Provider value={contextValue}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('pipeline-run-id')).toHaveTextContent('run-123');
      expect(screen.getByTestId('patterns-count')).toHaveTextContent('2');
      expect(screen.getByTestId('pipeline-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('patterns-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('optimization-metric')).toHaveTextContent('faithfulness');
    });

    it('should handle empty context values', () => {
      const TestComponent = () => {
        const context = useAutoragResultsContext();
        return (
          <div>
            <div data-testid="has-pipeline">{context.pipelineRun ? 'yes' : 'no'}</div>
            <div data-testid="patterns-count">{Object.keys(context.patterns).length}</div>
          </div>
        );
      };

      const contextValue = getAutoragContext({
        pipelineRun: undefined,
        patterns: {},
      });

      render(
        <AutoragResultsContext.Provider value={contextValue}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('has-pipeline')).toHaveTextContent('no');
      expect(screen.getByTestId('patterns-count')).toHaveTextContent('0');
    });
  });

  describe('context updates', () => {
    it('should update when context value changes', () => {
      const TestComponent = () => {
        const context = useAutoragResultsContext();
        return (
          <div data-testid="optimization-metric">{context.parameters?.optimization_metric}</div>
        );
      };

      const initialContext = getAutoragContext({
        pipelineRun: createMockPipelineRun({ optimization_metric: 'faithfulness' }),
      });

      const { rerender } = render(
        <AutoragResultsContext.Provider value={initialContext}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('optimization-metric')).toHaveTextContent('faithfulness');

      // Update context
      const updatedContext = getAutoragContext({
        pipelineRun: createMockPipelineRun({ optimization_metric: 'answer_correctness' }),
      });

      rerender(
        <AutoragResultsContext.Provider value={updatedContext}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('optimization-metric')).toHaveTextContent('answer_correctness');
    });

    it('should update when patterns change', () => {
      const TestComponent = () => {
        const context = useAutoragResultsContext();
        return (
          <div>
            <div data-testid="patterns-count">{Object.keys(context.patterns).length}</div>
            <div data-testid="pattern-names">
              {Object.keys(context.patterns)
                .map((key) => context.patterns[key].name)
                .join(', ')}
            </div>
          </div>
        );
      };

      const initialContext = getAutoragContext({
        pipelineRun: createMockPipelineRun(),
        patterns: {},
      });

      const { rerender } = render(
        <AutoragResultsContext.Provider value={initialContext}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('patterns-count')).toHaveTextContent('0');
      expect(screen.getByTestId('pattern-names')).toHaveTextContent('');

      // Update with patterns
      const updatedContext = getAutoragContext({
        pipelineRun: createMockPipelineRun(),
        patterns: mockPatterns,
      });

      rerender(
        <AutoragResultsContext.Provider value={updatedContext}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('patterns-count')).toHaveTextContent('2');
      expect(screen.getByTestId('pattern-names')).toHaveTextContent('Pattern 1, Pattern 2');
    });

    it('should update loading states', () => {
      const TestComponent = () => {
        const context = useAutoragResultsContext();
        return (
          <div>
            <div data-testid="pipeline-loading">{String(context.pipelineRunLoading)}</div>
            <div data-testid="patterns-loading">{String(context.patternsLoading)}</div>
          </div>
        );
      };

      const initialContext = getAutoragContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: true,
        patternsLoading: true,
      });

      const { rerender } = render(
        <AutoragResultsContext.Provider value={initialContext}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('pipeline-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('patterns-loading')).toHaveTextContent('true');

      // Update to loaded state
      const updatedContext = getAutoragContext({
        pipelineRun: createMockPipelineRun(),
        pipelineRunLoading: false,
        patternsLoading: false,
      });

      rerender(
        <AutoragResultsContext.Provider value={updatedContext}>
          <TestComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('pipeline-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('patterns-loading')).toHaveTextContent('false');
    });
  });

  describe('nested components', () => {
    it('should provide context to deeply nested components', () => {
      const DeepComponent = () => {
        const context = useAutoragResultsContext();
        return (
          <div data-testid="deep-optimization-metric">
            {context.parameters?.optimization_metric}
          </div>
        );
      };

      const MiddleComponent = () => (
        <div>
          <DeepComponent />
        </div>
      );

      const contextValue = getAutoragContext({
        pipelineRun: createMockPipelineRun({ optimization_metric: 'context_correctness' }),
      });

      render(
        <AutoragResultsContext.Provider value={contextValue}>
          <MiddleComponent />
        </AutoragResultsContext.Provider>,
      );

      expect(screen.getByTestId('deep-optimization-metric')).toHaveTextContent(
        'context_correctness',
      );
    });
  });
});
