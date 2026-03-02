/* eslint-disable camelcase -- API uses snake_case */
import type { PipelineDefinition, PipelineRun } from '~/app/types';

const MOCK_PIPELINES: PipelineDefinition[] = [
  {
    id: 'p1',
    name: 'RAG Evaluation Pipeline',
    created_at: '2025-01-15T10:00:00Z',
    description: 'Evaluates RAG performance',
  },
  {
    id: 'p2',
    name: 'Document Indexing Pipeline',
    created_at: '2025-01-14T15:30:00Z',
    description: 'Indexes documents for retrieval',
  },
  {
    id: 'p3',
    name: 'Embedding Generation Pipeline',
    created_at: '2025-01-13T09:00:00Z',
    description: 'Generates embeddings for documents',
  },
];

const MOCK_RUNS: PipelineRun[] = [
  {
    run_id: 'r1',
    display_name: 'Run 2025-01-17',
    description: 'Full evaluation run',
    state: 'SUCCEEDED',
    created_at: '2025-01-17T14:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r2',
    display_name: 'Run 2025-01-16',
    description: 'Quick index test',
    state: 'SUCCEEDED',
    created_at: '2025-01-16T11:30:00Z',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r3',
    display_name: 'Run 2025-01-16',
    description: 'Embedding batch',
    state: 'RUNNING',
    created_at: '2025-01-16T09:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p3', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r4',
    display_name: 'Run 2025-01-15',
    description: 'Failed run',
    state: 'FAILED',
    created_at: '2025-01-15T16:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r5',
    display_name: 'Run 2025-01-14',
    description: 'Initial indexing',
    state: 'SUCCEEDED',
    created_at: '2025-01-14T15:30:00Z',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r6',
    display_name: 'Run 2025-01-13',
    description: 'Evaluation batch A',
    state: 'SUCCEEDED',
    created_at: '2025-01-13T16:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r7',
    display_name: 'Run 2025-01-13',
    description: 'Document chunking test',
    state: 'SUCCEEDED',
    created_at: '2025-01-13T11:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r8',
    display_name: 'Run 2025-01-12',
    description: 'Embedding model v2',
    state: 'SUCCEEDED',
    created_at: '2025-01-12T14:30:00Z',
    pipeline_version_reference: { pipeline_id: 'p3', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r9',
    display_name: 'Run 2025-01-12',
    description: 'RAG regression test',
    state: 'SUCCEEDED',
    created_at: '2025-01-12T09:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r10',
    display_name: 'Run 2025-01-11',
    description: 'Full corpus index',
    state: 'SUCCEEDED',
    created_at: '2025-01-11T08:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r11',
    display_name: 'Run 2025-01-11',
    description: 'Embedding warmup',
    state: 'SUCCEEDED',
    created_at: '2025-01-11T07:30:00Z',
    pipeline_version_reference: { pipeline_id: 'p3', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r12',
    display_name: 'Run 2025-01-10',
    description: 'Eval with new metrics',
    state: 'FAILED',
    created_at: '2025-01-10T17:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r13',
    display_name: 'Run 2025-01-10',
    description: 'Incremental index update',
    state: 'SUCCEEDED',
    created_at: '2025-01-10T12:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r14',
    display_name: 'Run 2025-01-09',
    description: 'Large batch embeddings',
    state: 'SUCCEEDED',
    created_at: '2025-01-09T10:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p3', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r15',
    display_name: 'Run 2025-01-09',
    description: 'Quick eval smoke test',
    state: 'SUCCEEDED',
    created_at: '2025-01-09T08:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r16',
    display_name: 'Run 2025-01-08',
    description: 'Re-index after schema change',
    state: 'SUCCEEDED',
    created_at: '2025-01-08T15:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r17',
    display_name: 'Run 2025-01-08',
    description: 'Embedding QA run',
    state: 'RUNNING',
    created_at: '2025-01-08T11:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p3', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r18',
    display_name: 'Run 2025-01-07',
    description: 'Production evaluation',
    state: 'SUCCEEDED',
    created_at: '2025-01-07T16:30:00Z',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r19',
    display_name: 'Run 2025-01-07',
    description: 'Backfill documents',
    state: 'SUCCEEDED',
    created_at: '2025-01-07T09:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r20',
    display_name: 'Run 2025-01-06',
    description: 'Final embedding batch',
    state: 'SUCCEEDED',
    created_at: '2025-01-06T14:00:00Z',
    pipeline_version_reference: { pipeline_id: 'p3', pipeline_version_id: 'v1' },
  },
];

const runsByNamespace = new Map<string, PipelineRun[]>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- namespace reserved for future filtering
export function getMockPipelineDefinitions(_namespace: string): Promise<PipelineDefinition[]> {
  return Promise.resolve([...MOCK_PIPELINES]);
}

export function getMockPipelineRuns(
  namespace: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future filtering
  _pipelineIds: string[],
): Promise<PipelineRun[]> {
  if (!runsByNamespace.has(namespace)) {
    runsByNamespace.set(namespace, [...MOCK_RUNS]);
  }
  return Promise.resolve(runsByNamespace.get(namespace)!);
}
