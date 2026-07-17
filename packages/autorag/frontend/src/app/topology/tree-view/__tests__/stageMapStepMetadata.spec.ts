import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import {
  getStageMapDetails,
  getStageDescriptionFromMap,
  parseStageMapNodeId,
} from '~/app/topology/tree-view/stageMapStepMetadata';

/* eslint-disable camelcase */

const mockComponentStageMap: ComponentStageMap = {
  pipeline_id: 'rag-optimization-pipeline',
  description: 'AutoRAG pattern optimization pipeline',
  kfp_run_id: 'run-123',
  published_at: '2026-06-04T17:47:14.948493Z',
  components: [
    {
      id: 'rag_optimization',
      description: 'Optimize RAG pattern configurations',
      started_at: '2026-06-04T17:49:19.000Z',
      completed_at: '2026-06-04T17:50:04.000Z',
      stages: [
        {
          id: 'download_and_sample',
          description: 'Download source documents and sample data',
          status: 'completed',
          // AutoRAG timestamps are completion times, not stage starts.
          timestamp: '2026-06-04T17:49:40.000Z',
          row_count: 213,
        },
        {
          id: 'optimize_templates',
          description: 'Evaluate candidate RAG patterns',
          status: 'completed',
          timestamp: '2026-06-04T17:49:48.000Z',
          selected_patterns: ['PatternGraphRAG', 'PatternHyDE', 'PatternRerank'],
          steps: ['chunking', 'embedding', 'retrieval'],
        },
        {
          id: 'run_optimization',
          description: 'Run each pattern through the RAG pipeline',
          status: 'completed',
          timestamp: '2026-06-04T17:49:56.000Z',
          eval_metric: 'faithfulness',
        },
        {
          id: 'build_leaderboard',
          description: 'Rank patterns by optimized metric',
          status: 'completed',
          timestamp: '2026-06-04T17:50:04.000Z',
        },
      ],
    },
  ],
};

describe('parseStageMapNodeId', () => {
  it('parses stage nodes', () => {
    expect(parseStageMapNodeId('rag_optimization__download_and_sample')).toEqual({
      type: 'stage',
      componentId: 'rag_optimization',
      stageId: 'download_and_sample',
    });
  });

  it('parses branch step nodes', () => {
    expect(parseStageMapNodeId('rag_optimization__step__chunking__branch-1')).toEqual({
      type: 'branch_step',
      componentId: 'rag_optimization',
      stepId: 'chunking',
      branchIndex: 1,
    });
  });

  it('parses branch pattern nodes', () => {
    expect(parseStageMapNodeId('rag_optimization__pattern__branch-0')).toEqual({
      type: 'branch_pattern',
      componentId: 'rag_optimization',
      branchIndex: 0,
    });
  });

  it('parses the maximum valid branch index', () => {
    expect(parseStageMapNodeId('rag_optimization__step__chunking__branch-9')).toEqual({
      type: 'branch_step',
      componentId: 'rag_optimization',
      stepId: 'chunking',
      branchIndex: 9,
    });
    expect(parseStageMapNodeId('rag_optimization__pattern__branch-9')).toEqual({
      type: 'branch_pattern',
      componentId: 'rag_optimization',
      branchIndex: 9,
    });
  });

  it('returns undefined for fallback topology node IDs', () => {
    expect(parseStageMapNodeId('pre-0')).toBeUndefined();
    expect(parseStageMapNodeId('p1-step-2')).toBeUndefined();
  });

  it('returns undefined for malformed branch identifiers', () => {
    expect(parseStageMapNodeId('rag_optimization__step__chunking__branch-')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__step__chunking__branch--1')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__step__chunking__branch-x')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__step__chunking__branch-abc')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__step__foo__branch-0__extra')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__pattern__branch-')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__pattern__branch--1')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__pattern__branch-x')).toBeUndefined();
  });

  it('returns undefined for out-of-bounds branch indices', () => {
    expect(
      parseStageMapNodeId('rag_optimization__step__chunking__branch-999999999999999999999'),
    ).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__step__chunking__branch-999999')).toBeUndefined();
    expect(parseStageMapNodeId('rag_optimization__pattern__branch-999999')).toBeUndefined();
  });

  it('returns undefined when component ID is empty', () => {
    expect(parseStageMapNodeId('__download_and_sample')).toBeUndefined();
    expect(parseStageMapNodeId('__step__chunking__branch-1')).toBeUndefined();
    expect(parseStageMapNodeId('__pattern__branch-0')).toBeUndefined();
  });
});

describe('getStageMapDetails', () => {
  it('builds stage details from merged status fields', () => {
    const parsed = parseStageMapNodeId('rag_optimization__download_and_sample');
    expect(parsed).toBeDefined();

    const details = getStageMapDetails(parsed!, mockComponentStageMap);
    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '21 s' },
        { label: 'Row count', value: '213' },
      ]),
    );
    expect(details?.some((detail) => detail.label === 'Status')).toBe(false);
    expect(details?.some((detail) => detail.label === 'Display name')).toBe(false);
  });

  it('omits internal stage fields from details', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'write_output',
              description: 'Write output',
              status: 'completed',
              timestamp: '2026-06-04T17:49:19.232065Z',
              display_name: 'Write output',
              row_count: 1000,
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__write_output');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details).toEqual(expect.arrayContaining([{ label: 'Row count', value: '1000' }]));
    expect(details?.some((detail) => detail.label === 'Status')).toBe(false);
    expect(details?.some((detail) => detail.label === 'Display name')).toBe(false);
  });

  it('flattens nested stage metadata fields', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'download_and_sample',
              description: 'Download source documents and sample data',
              status: 'completed',
              timestamp: '2026-06-04T17:49:19.232065Z',
              metadata: {
                row_count: 500,
                document_count: 120,
              },
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__download_and_sample');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Row count', value: '500' },
        { label: 'Document count', value: '120' },
      ]),
    );
  });

  it('formats evaluation metric labels for stage nodes', () => {
    const parsed = parseStageMapNodeId('rag_optimization__run_optimization');
    const details = getStageMapDetails(parsed!, mockComponentStageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '8 s' },
        { label: 'Evaluation metric', value: 'Answer faithfulness' },
      ]),
    );
  });

  it('includes selected patterns on the optimize_templates stage node', () => {
    const parsed = parseStageMapNodeId('rag_optimization__optimize_templates');
    const details = getStageMapDetails(parsed!, mockComponentStageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        {
          label: 'Selected patterns',
          value: 'PatternGraphRAG, PatternHyDE, PatternRerank',
        },
      ]),
    );
  });

  it('includes selected patterns nested under stage metadata', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'optimize_templates',
              description: 'Evaluate candidate RAG patterns',
              status: 'completed',
              timestamp: '2026-06-04T17:49:53.951525Z',
              metadata: {
                selected_patterns: ['PatternA', 'PatternB'],
              },
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__optimize_templates');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details).toEqual(
      expect.arrayContaining([{ label: 'Selected patterns', value: 'PatternA, PatternB' }]),
    );
  });

  it('includes sampling method for prepare_data from nested metadata', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare and sample input data',
              status: 'completed',
              timestamp: '2026-06-04T17:49:19.232065Z',
              metadata: {
                sampling_method: 'stratified',
              },
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__prepare_data');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details).toEqual(
      expect.arrayContaining([{ label: 'Sampling method', value: 'stratified' }]),
    );
  });

  it('shows sampling method placeholder for pending prepare_data', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare and sample input data',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__prepare_data');
    const details = getStageMapDetails(parsed!, stageMap, undefined, undefined, 'pending');

    expect(details).toEqual(expect.arrayContaining([{ label: 'Sampling method', value: '—' }]));
  });

  it('includes selected pattern and pattern selection duration for branch steps', () => {
    const parsed = parseStageMapNodeId('rag_optimization__step__chunking__branch-1');
    const details = getStageMapDetails(parsed!, mockComponentStageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '8 s' },
        { label: 'Selected pattern', value: 'PatternHyDE' },
      ]),
    );
  });

  it('includes branch selected pattern from nested stage metadata', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: mockComponentStageMap.components[0].stages.map((stage) =>
            stage.id === 'optimize_templates'
              ? {
                  ...stage,
                  selected_patterns: undefined,
                  metadata: {
                    selected_patterns: ['PatternA', 'PatternB'],
                  },
                }
              : stage,
          ),
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__step__chunking__branch-1');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '8 s' },
        { label: 'Selected pattern', value: 'PatternB' },
      ]),
    );
  });

  it('includes pattern name for branch pattern nodes', () => {
    const parsed = parseStageMapNodeId('rag_optimization__pattern__branch-0');
    const details = getStageMapDetails(
      parsed!,
      mockComponentStageMap,
      undefined,
      'PatternGraphRAG',
    );

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Pattern', value: 'PatternGraphRAG' },
        { label: 'Duration', value: '8 s' },
      ]),
    );
  });

  it('includes topology pattern label when selected_patterns is absent', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: mockComponentStageMap.components[0].stages.map((stage) =>
            stage.id === 'optimize_templates' ? { ...stage, selected_patterns: undefined } : stage,
          ),
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__pattern__branch-0');
    const details = getStageMapDetails(parsed!, stageMap, undefined, 'Pattern 1', 'completed');

    expect(details).toEqual(
      expect.arrayContaining([
        { label: 'Pattern', value: 'Pattern 1' },
        { label: 'Duration', value: '8 s' },
      ]),
    );
    expect(details?.some((detail) => detail.label === 'Selected pattern')).toBe(false);
  });

  it('falls back when selected_patterns entries are blank or non-strings', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: mockComponentStageMap.components[0].stages.map((stage) =>
            stage.id === 'optimize_templates'
              ? { ...stage, selected_patterns: ['', '   ', 42, { name: 'bad' }] }
              : stage,
          ),
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__pattern__branch-0');
    const details = getStageMapDetails(parsed!, stageMap, undefined, undefined, 'failed');

    expect(details?.find((detail) => detail.label === 'Selected pattern')).toEqual({
      label: 'Selected pattern',
      value: '—',
    });
  });

  it('falls back for stage array fields that contain non-primitive values', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: mockComponentStageMap.components[0].stages.map((stage) =>
            stage.id === 'download_and_sample'
              ? { ...stage, tags: ['ok', { nested: true }], status: 'completed' }
              : stage,
          ),
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__download_and_sample');
    const details = getStageMapDetails(parsed!, stageMap);

    expect(details?.find((detail) => detail.label === 'Tags')).toEqual({
      label: 'Tags',
      value: '—',
    });
  });

  it('does not infer duration for stages that never executed', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'rag_data_loader',
          description: 'Load and sample documents',
          stages: [
            {
              id: 'validate_inputs',
              description: 'Validate inputs',
              status: 'failed',
              timestamp: '2026-06-04T17:49:19.232065Z',
            },
            {
              id: 'download_and_sample',
              description: 'Download and sample',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_data_loader__download_and_sample');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'FAILED',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'rag-data-loader',
              display_name: 'rag-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              start_time: '2026-06-04T17:49:19.232065Z',
              end_time: '2026-06-04T17:49:40.232065Z',
              state: 'FAILED',
            },
          ],
        },
      } as never,
      undefined,
      'pending',
    );

    expect(details).toEqual([
      { label: 'Duration', value: '—' },
      { label: 'Document count', value: '—' },
      { label: 'Row count', value: '—' },
    ]);
  });

  it('does not infer duration from component timestamps for unreached stages', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'rag_data_loader',
          description: 'Load and sample documents',
          started_at: '2026-06-04T17:49:19.223056Z',
          completed_at: '2026-06-04T17:49:40.232065Z',
          stages: [
            {
              id: 'validate_inputs',
              description: 'Validate inputs',
              status: 'failed',
              timestamp: '2026-06-04T17:49:19.232065Z',
            },
            {
              id: 'download_and_sample',
              description: 'Download and sample',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_data_loader__download_and_sample');
    const details = getStageMapDetails(parsed!, stageMap, undefined, undefined, 'pending');

    expect(details).toEqual([
      { label: 'Duration', value: '—' },
      { label: 'Document count', value: '—' },
      { label: 'Row count', value: '—' },
    ]);
  });

  it('shows duration for a failed stage using task start and stage completion timestamp', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'rag_data_loader',
          description: 'Load and sample documents',
          stages: [
            {
              id: 'validate_inputs',
              description: 'Validate inputs',
              status: 'failed',
              // Completion time when the stage failed
              timestamp: '2026-06-04T17:49:40.232065Z',
            },
            {
              id: 'download_and_sample',
              description: 'Download and sample',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_data_loader__validate_inputs');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'FAILED',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'rag-data-loader',
              display_name: 'rag-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              start_time: '2026-06-04T17:49:19.232065Z',
              end_time: '2026-06-04T17:49:40.232065Z',
              state: 'FAILED',
            },
          ],
        },
      } as never,
      undefined,
      'failed',
    );

    expect(details).toEqual([{ label: 'Duration', value: '21 s' }]);
  });

  it('prefers component started_at over task create_time when task start_time is missing', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'rag_data_loader',
          description: 'Load and sample documents',
          started_at: '2026-06-04T17:49:19.232065Z',
          stages: [
            {
              id: 'validate_inputs',
              description: 'Validate inputs',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_data_loader__validate_inputs');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'FAILED',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'rag-data-loader',
              display_name: 'rag-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              end_time: '2026-06-04T17:49:40.232065Z',
              state: 'FAILED',
            },
          ],
        },
      } as never,
      undefined,
      'failed',
    );

    expect(details).toEqual([{ label: 'Duration', value: '21 s' }]);
  });

  it('uses previous stage completion as start for started stages without timestamp', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'rag_data_loader',
          description: 'Load and sample documents',
          started_at: '2026-06-04T17:49:19.000000Z',
          stages: [
            {
              id: 'validate_inputs',
              description: 'Validate inputs',
              status: 'completed',
              timestamp: '2026-06-04T17:49:19.232065Z',
            },
            {
              id: 'download_and_sample',
              description: 'Download and sample',
              status: 'started',
            },
            {
              id: 'write_output',
              description: 'Write output',
              status: 'completed',
              timestamp: '2026-06-04T17:49:40.232065Z',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_data_loader__download_and_sample');
    const details = getStageMapDetails(
      parsed!,
      stageMap,
      {
        run_id: 'run-123',
        display_name: 'Test Run',
        state: 'RUNNING',
        created_at: '2025-01-17T00:00:00Z',
        run_details: {
          task_details: [
            {
              run_id: 'run-123',
              task_id: 'rag-data-loader',
              display_name: 'rag-data-loader',
              create_time: '2025-01-17T00:00:00Z',
              start_time: '2026-06-04T17:49:35.232065Z',
              state: 'RUNNING',
            },
          ],
        },
      } as never,
      undefined,
      'active',
    );

    // Previous stage completed at :19.232; next stage timestamp used as provisional end → 21 s
    expect(details).toEqual(expect.arrayContaining([{ label: 'Duration', value: '21 s' }]));
  });

  it('shows duration for a failed stage inferred from run details when stage status is missing', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          id: 'rag_data_loader',
          description: 'Load and sample documents',
          stages: [
            {
              id: 'validate_inputs',
              description: 'Validate inputs',
            },
            {
              id: 'download_and_sample',
              description: 'Download and sample',
            },
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_data_loader__validate_inputs');
    const pipelineRun = {
      run_id: 'run-123',
      display_name: 'Test Run',
      state: 'FAILED',
      created_at: '2025-01-17T00:00:00Z',
      finished_at: '2026-06-04T17:49:40.232065Z',
      run_details: {
        task_details: [
          {
            run_id: 'run-123',
            task_id: 'rag-data-loader',
            display_name: 'rag-data-loader',
            create_time: '2025-01-17T00:00:00Z',
            start_time: '2026-06-04T17:49:19.232065Z',
            end_time: '2026-06-04T17:49:40.232065Z',
            state: 'FAILED',
          },
        ],
      },
    } as never;
    const details = getStageMapDetails(parsed!, stageMap, pipelineRun, undefined, 'failed');

    expect(details).toEqual([{ label: 'Duration', value: '21 s' }]);
  });

  it('shows placeholder fields for a failed stage with merged metric data', () => {
    const stageMap: ComponentStageMap = {
      ...mockComponentStageMap,
      components: [
        {
          ...mockComponentStageMap.components[0],
          stages: [
            {
              id: 'download_and_sample',
              description: 'Download source documents and sample data',
              status: 'failed',
              timestamp: '2026-06-04T17:49:40.000Z',
              row_count: 213,
            },
            mockComponentStageMap.components[0].stages[1],
          ],
        },
      ],
    };
    const parsed = parseStageMapNodeId('rag_optimization__download_and_sample');
    const details = getStageMapDetails(parsed!, stageMap, undefined, undefined, 'failed');

    expect(details).toEqual([
      { label: 'Duration', value: '21 s' },
      { label: 'Document count', value: '—' },
      { label: 'Row count', value: '213' },
    ]);
  });

  it('treats stage timestamp as completion (previous stage → this timestamp)', () => {
    const parsed = parseStageMapNodeId('rag_optimization__optimize_templates');
    const details = getStageMapDetails(parsed!, mockComponentStageMap);

    // download completed at :40, optimize completed at :48 → 8 s
    expect(details).toEqual(expect.arrayContaining([{ label: 'Duration', value: '8 s' }]));
  });
});

describe('getStageDescriptionFromMap', () => {
  it('returns stage description from the stage map', () => {
    const parsed = parseStageMapNodeId('rag_optimization__download_and_sample');
    expect(getStageDescriptionFromMap(parsed!, mockComponentStageMap)).toBe(
      'Download source documents and sample data',
    );
  });

  it('returns undefined when the component is missing', () => {
    const parsed = parseStageMapNodeId('missing_component__download_and_sample');
    expect(getStageDescriptionFromMap(parsed!, mockComponentStageMap)).toBeUndefined();
  });
});

/* eslint-enable camelcase */
