/* eslint-disable camelcase */
import { Collection, CollectionsListResponse } from '~/app/types';

export { mockBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';

type MockCollectionOptions = Partial<{
  id: string;
  name: string;
  category: string;
  // Collection-level classifications rendered as domain chips on suite cards.
  domains: string[];
  description: string;
  tags: string[];
  benchmarkIds: string[];
  // Mock-only values mapped to each benchmark's primary_score.metric field.
  benchmarkMetrics: string[];
  threshold: number;
}>;

export const mockCollection = (options: MockCollectionOptions = {}): Collection => ({
  resource: {
    id: options.id ?? 'collection-001',
    created_at: '2026-02-01T12:00:00Z',
    updated_at: '2026-02-01T12:00:00Z',
  },
  name: options.name ?? 'Safety Suite',
  category: options.category ?? 'Safety',
  domains: options.domains,
  description: options.description ?? 'A comprehensive safety benchmark suite.',
  tags: options.tags ?? ['safety', 'llm'],
  pass_criteria: options.threshold != null ? { threshold: options.threshold } : undefined,
  benchmarks: (options.benchmarkIds ?? ['harmful_request_refusal', 'toxigen']).map((id, index) => ({
    id,
    provider_id: 'safety_eval_suite',
    primary_score: options.benchmarkMetrics?.[index]
      ? { metric: options.benchmarkMetrics[index], lower_is_better: false }
      : undefined,
  })),
});

export const mockCollectionsListResponse = (
  collections: Collection[],
  totalCount?: number,
): CollectionsListResponse => ({
  items: collections,
  total_count: totalCount ?? collections.length,
});

/* eslint-enable camelcase */
