/* eslint-disable camelcase */
import { FlatBenchmark, ProviderBenchmark } from '~/app/types';

type MockBenchmarkOptions = Partial<{
  id: string;
  name: string;
  description: string;
  category: string;
  metrics: string[];
  tags: string[];
  numFewShot: number;
  datasetSize: number;
  primaryScoreMetric: string;
  lowerIsBetter: boolean;
  threshold: number;
}>;

export const mockBenchmark = (options: MockBenchmarkOptions = {}): ProviderBenchmark => ({
  id: options.id ?? 'truthfulqa_mc1',
  name: options.name ?? 'TruthfulQA MC1',
  description: options.description ?? 'Multiple-choice truthfulness evaluation.',
  category: options.category ?? 'Truthfulness',
  metrics: options.metrics ?? ['accuracy', 'mc1'],
  tags: options.tags ?? ['truthfulness'],
  num_few_shot: options.numFewShot ?? 0,
  dataset_size: options.datasetSize ?? 817,
  primary_score: options.primaryScoreMetric
    ? { metric: options.primaryScoreMetric, lower_is_better: options.lowerIsBetter ?? false }
    : undefined,
  pass_criteria: options.threshold != null ? { threshold: options.threshold } : undefined,
});

type MockFlatBenchmarkOptions = MockBenchmarkOptions &
  Partial<{
    providerId: string;
    providerName: string;
  }>;

export const mockFlatBenchmark = (options: MockFlatBenchmarkOptions = {}): FlatBenchmark => ({
  ...mockBenchmark(options),
  providerId: options.providerId ?? 'lm_evaluation_harness',
  providerName: options.providerName ?? 'LM Evaluation Harness',
});
/* eslint-enable camelcase */
