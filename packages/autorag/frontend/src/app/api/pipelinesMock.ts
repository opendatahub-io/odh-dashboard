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
    id: 'r1',
    name: 'Run 2025-01-17',
    description: 'Full evaluation run',
    tags: ['production', 'v1'],
    stats: '2h 15m',
    pipeline_id: 'p1',
    pipeline_name: 'RAG Evaluation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-17T14:00:00Z',
  },
  {
    id: 'r2',
    name: 'Run 2025-01-16',
    description: 'Quick index test',
    tags: ['test'],
    stats: '45m',
    pipeline_id: 'p2',
    pipeline_name: 'Document Indexing Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-16T11:30:00Z',
  },
  {
    id: 'r3',
    name: 'Run 2025-01-16',
    description: 'Embedding batch',
    tags: ['batch', 'embeddings'],
    stats: '1h 30m',
    pipeline_id: 'p3',
    pipeline_name: 'Embedding Generation Pipeline',
    status: 'Running',
    created_at: '2025-01-16T09:00:00Z',
  },
  {
    id: 'r4',
    name: 'Run 2025-01-15',
    description: 'Failed run',
    tags: ['debug'],
    stats: '5m',
    pipeline_id: 'p1',
    pipeline_name: 'RAG Evaluation Pipeline',
    status: 'Failed',
    created_at: '2025-01-15T16:00:00Z',
  },
  {
    id: 'r5',
    name: 'Run 2025-01-14',
    description: 'Initial indexing',
    tags: ['production'],
    stats: '3h',
    pipeline_id: 'p2',
    pipeline_name: 'Document Indexing Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-14T15:30:00Z',
  },
  {
    id: 'r6',
    name: 'Run 2025-01-13',
    description: 'Evaluation batch A',
    tags: ['batch', 'eval'],
    stats: '1h 45m',
    pipeline_id: 'p1',
    pipeline_name: 'RAG Evaluation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-13T16:00:00Z',
  },
  {
    id: 'r7',
    name: 'Run 2025-01-13',
    description: 'Document chunking test',
    tags: ['test', 'chunks'],
    stats: '30m',
    pipeline_id: 'p2',
    pipeline_name: 'Document Indexing Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-13T11:00:00Z',
  },
  {
    id: 'r8',
    name: 'Run 2025-01-12',
    description: 'Embedding model v2',
    tags: ['embeddings', 'upgrade'],
    stats: '2h',
    pipeline_id: 'p3',
    pipeline_name: 'Embedding Generation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-12T14:30:00Z',
  },
  {
    id: 'r9',
    name: 'Run 2025-01-12',
    description: 'RAG regression test',
    tags: ['regression', 'test'],
    stats: '55m',
    pipeline_id: 'p1',
    pipeline_name: 'RAG Evaluation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-12T09:00:00Z',
  },
  {
    id: 'r10',
    name: 'Run 2025-01-11',
    description: 'Full corpus index',
    tags: ['production', 'full'],
    stats: '4h 20m',
    pipeline_id: 'p2',
    pipeline_name: 'Document Indexing Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-11T08:00:00Z',
  },
  {
    id: 'r11',
    name: 'Run 2025-01-11',
    description: 'Embedding warmup',
    tags: ['warmup'],
    stats: '15m',
    pipeline_id: 'p3',
    pipeline_name: 'Embedding Generation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-11T07:30:00Z',
  },
  {
    id: 'r12',
    name: 'Run 2025-01-10',
    description: 'Eval with new metrics',
    tags: ['metrics', 'v2'],
    stats: '1h 10m',
    pipeline_id: 'p1',
    pipeline_name: 'RAG Evaluation Pipeline',
    status: 'Failed',
    created_at: '2025-01-10T17:00:00Z',
  },
  {
    id: 'r13',
    name: 'Run 2025-01-10',
    description: 'Incremental index update',
    tags: ['incremental'],
    stats: '45m',
    pipeline_id: 'p2',
    pipeline_name: 'Document Indexing Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-10T12:00:00Z',
  },
  {
    id: 'r14',
    name: 'Run 2025-01-09',
    description: 'Large batch embeddings',
    tags: ['batch', 'large'],
    stats: '3h 30m',
    pipeline_id: 'p3',
    pipeline_name: 'Embedding Generation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-09T10:00:00Z',
  },
  {
    id: 'r15',
    name: 'Run 2025-01-09',
    description: 'Quick eval smoke test',
    tags: ['smoke', 'test'],
    stats: '8m',
    pipeline_id: 'p1',
    pipeline_name: 'RAG Evaluation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-09T08:00:00Z',
  },
  {
    id: 'r16',
    name: 'Run 2025-01-08',
    description: 'Re-index after schema change',
    tags: ['schema', 'migration'],
    stats: '2h 45m',
    pipeline_id: 'p2',
    pipeline_name: 'Document Indexing Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-08T15:00:00Z',
  },
  {
    id: 'r17',
    name: 'Run 2025-01-08',
    description: 'Embedding QA run',
    tags: ['qa'],
    stats: '1h',
    pipeline_id: 'p3',
    pipeline_name: 'Embedding Generation Pipeline',
    status: 'Running',
    created_at: '2025-01-08T11:00:00Z',
  },
  {
    id: 'r18',
    name: 'Run 2025-01-07',
    description: 'Production evaluation',
    tags: ['production', 'release'],
    stats: '2h 30m',
    pipeline_id: 'p1',
    pipeline_name: 'RAG Evaluation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-07T16:30:00Z',
  },
  {
    id: 'r19',
    name: 'Run 2025-01-07',
    description: 'Backfill documents',
    tags: ['backfill'],
    stats: '5h',
    pipeline_id: 'p2',
    pipeline_name: 'Document Indexing Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-07T09:00:00Z',
  },
  {
    id: 'r20',
    name: 'Run 2025-01-06',
    description: 'Final embedding batch',
    tags: ['final', 'batch'],
    stats: '1h 55m',
    pipeline_id: 'p3',
    pipeline_name: 'Embedding Generation Pipeline',
    status: 'Succeeded',
    created_at: '2025-01-06T14:00:00Z',
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

export function deleteMockPipeline(namespace: string, pipelineId: string): Promise<void> {
  const runs = runsByNamespace.get(namespace) ?? [...MOCK_RUNS];
  const filtered = runs.filter((r) => r.pipeline_id !== pipelineId);
  runsByNamespace.set(namespace, filtered);
  return Promise.resolve();
}

export function deleteMockPipelineRun(namespace: string, runId: string): Promise<void> {
  const runs = runsByNamespace.get(namespace) ?? [...MOCK_RUNS];
  const filtered = runs.filter((r) => r.id !== runId);
  runsByNamespace.set(namespace, filtered);
  return Promise.resolve();
}
