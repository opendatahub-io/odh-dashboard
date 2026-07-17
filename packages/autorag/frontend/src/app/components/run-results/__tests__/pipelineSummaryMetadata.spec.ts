import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { getPipelineSummaryDetails } from '~/app/components/run-results/pipelineSummaryMetadata';

/* eslint-disable camelcase */

const mockPattern = (name: string, finalScore: number): AutoragPattern => ({
  name,
  iteration: 0,
  max_combinations: 1,
  duration_seconds: 12,
  final_score: finalScore,
  settings: {
    vector_store: { datasource_type: 'milvus', collection_name: 'test' },
    chunking: { method: 'fixed', chunk_size: 512, chunk_overlap: 50 },
    embedding: {
      model_id: 'embed-model',
      distance_metric: 'cosine',
      embedding_params: {
        embedding_dimension: 768,
        context_length: 512,
        timeout: null,
        model_type: null,
        provider_id: null,
        provider_resource_id: null,
      },
    },
    retrieval: { method: 'vector', number_of_chunks: 5 },
    generation: {
      model_id: 'gen-model',
      context_template_text: '',
      user_message_text: '',
      system_message_text: '',
    },
  },
  scores: {},
});

const mockStageMap: ComponentStageMap = {
  pipeline_id: 'documents-rag-optimization-pipeline',
  description: 'AutoRAG pipeline',
  kfp_run_id: 'run-123',
  published_at: '2026-06-04T17:47:14.948493Z',
  components: [
    {
      id: 'rag_templates_optimization',
      description: 'RAG templates optimization',
      stages: [
        {
          id: 'optimize_templates',
          description: 'Evaluate candidate RAG pattern configurations',
          status: 'completed',
          selected_patterns: ['Pattern1', 'Pattern2', 'Pattern3'],
        },
      ],
    },
  ],
};

const mockPipelineRun: PipelineRun = {
  run_id: 'run-123',
  display_name: 'Test run',
  created_at: '2026-06-04T17:47:14.948493Z',
  finished_at: '2026-06-04T17:50:10.290690Z',
  state: 'SUCCEEDED',
};

const patterns = {
  Pattern1: mockPattern('Pattern1', 0.9),
  Pattern2: mockPattern('Pattern2', 0.75),
};

describe('getPipelineSummaryDetails', () => {
  it('returns pipeline summary fields for a successful run', () => {
    const details = getPipelineSummaryDetails(mockPipelineRun, mockStageMap, patterns, 'Pattern1');

    expect(details).toEqual([
      { label: 'Total run time', value: '2 m 55 s' },
      { label: 'Patterns evaluated', value: '2' },
      { label: 'Winning pattern', value: 'Pattern1' },
      { label: 'Evaluation metric', value: 'Answer faithfulness' },
    ]);
  });

  it('falls back to loaded pattern count when stage map has no selected_patterns', () => {
    const stageMap: ComponentStageMap = {
      ...mockStageMap,
      components: [
        {
          ...mockStageMap.components[0],
          stages: [],
        },
      ],
    };

    const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, patterns, 'Pattern1');

    expect(details.find((detail) => detail.label === 'Patterns evaluated')?.value).toBe('2');
  });

  it('counts only unique non-empty selected_patterns that exist in patterns and falls back when none remain', () => {
    const stageMapWithJunk = {
      ...mockStageMap,
      components: [
        {
          ...mockStageMap.components[0],
          stages: [
            {
              ...mockStageMap.components[0].stages[0],
              selected_patterns: [
                'Pattern1',
                '',
                'Pattern1',
                42,
                null,
                'Pattern2',
                'MissingPattern',
              ],
            },
          ],
        },
      ],
    } as unknown as ComponentStageMap;

    const detailsWithJunk = getPipelineSummaryDetails(mockPipelineRun, stageMapWithJunk, patterns);
    expect(detailsWithJunk.find((detail) => detail.label === 'Patterns evaluated')?.value).toBe(
      '2',
    );

    const detailsWithNoMatchingKeys = getPipelineSummaryDetails(
      mockPipelineRun,
      stageMapWithJunk,
      {},
    );
    expect(
      detailsWithNoMatchingKeys.find((detail) => detail.label === 'Patterns evaluated')?.value,
    ).toBe('—');

    const stageMapWithoutValid = {
      ...mockStageMap,
      components: [
        {
          ...mockStageMap.components[0],
          stages: [
            {
              ...mockStageMap.components[0].stages[0],
              selected_patterns: ['', 42, null, '', 'MissingPattern'],
            },
          ],
        },
      ],
    } as unknown as ComponentStageMap;

    const detailsWithoutValid = getPipelineSummaryDetails(
      mockPipelineRun,
      stageMapWithoutValid,
      patterns,
    );
    expect(detailsWithoutValid.find((detail) => detail.label === 'Patterns evaluated')?.value).toBe(
      '2',
    );
  });

  it('uses em dashes when data is unavailable', () => {
    const details = getPipelineSummaryDetails(undefined, undefined, {});

    expect(details).toEqual([
      { label: 'Total run time', value: '—' },
      { label: 'Patterns evaluated', value: '—' },
      { label: 'Winning pattern', value: '—' },
      { label: 'Evaluation metric', value: 'Answer faithfulness' },
    ]);
  });

  it('should skip malformed components and stages without throwing', () => {
    const stageMap = {
      ...mockStageMap,
      components: [
        null,
        undefined,
        'not-a-component',
        {
          id: 'rag_templates_optimization',
          description: '',
          stages: null,
        },
        {
          id: 'rag_templates_optimization',
          description: '',
          stages: [
            null,
            { id: 'optimize_templates', selected_patterns: ['Pattern1'] },
            {
              id: 'optimize_templates',
              description: 'Evaluate candidate RAG pattern configurations',
              selected_patterns: ['Pattern1'],
            },
          ],
        },
      ],
    } as unknown as ComponentStageMap;

    const details = getPipelineSummaryDetails(mockPipelineRun, stageMap, patterns, 'Pattern1');

    expect(details.find((detail) => detail.label === 'Patterns evaluated')?.value).toBe('1');
  });

  it('does not use pattern count as evaluated when no observed data exists and no patterns loaded', () => {
    const details = getPipelineSummaryDetails(mockPipelineRun, undefined, {});

    expect(details.find((detail) => detail.label === 'Patterns evaluated')?.value).toBe('—');
  });

  it('resolves the winning pattern display name from bestPatternKey', () => {
    const details = getPipelineSummaryDetails(mockPipelineRun, mockStageMap, patterns, 'Pattern2');

    expect(details.find((detail) => detail.label === 'Winning pattern')?.value).toBe('Pattern2');
  });

  it('shows em dash when bestPatternKey is missing from patterns', () => {
    const details = getPipelineSummaryDetails(
      mockPipelineRun,
      mockStageMap,
      patterns,
      'NotAPattern',
    );

    expect(details.find((detail) => detail.label === 'Winning pattern')?.value).toBe('—');
  });

  it('shows em dash when bestPatternKey is undefined', () => {
    const details = getPipelineSummaryDetails(mockPipelineRun, mockStageMap, patterns, undefined);

    expect(details.find((detail) => detail.label === 'Winning pattern')?.value).toBe('—');
  });

  it('formats the evaluation metric from pipeline run parameters', () => {
    const pipelineRunWithMetric: PipelineRun = {
      ...mockPipelineRun,
      runtime_config: { parameters: { optimization_metric: 'answer_correctness' } },
    };

    const details = getPipelineSummaryDetails(pipelineRunWithMetric, mockStageMap, patterns);

    expect(details.find((detail) => detail.label === 'Evaluation metric')?.value).toBe(
      'Answer correctness',
    );
  });
});
