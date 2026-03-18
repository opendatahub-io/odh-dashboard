import { EvaluationJob, EvaluationJobState } from '~/app/types';

type MockEvaluationJobOptions = {
  id?: string;
  name?: string;
  tenant?: string;
  state?: EvaluationJobState;
  modelName?: string;
  benchmarkId?: string;
  providerId?: string;
  createdAt?: string;
  score?: number;
  scorePass?: boolean;
};

const DEFAULT_BENCHMARK_ID = 'default-benchmark';

/* eslint-disable camelcase */
export const mockEvaluationJob = (options: MockEvaluationJobOptions = {}): EvaluationJob => ({
  resource: {
    id: options.id ?? 'eval-job-001',
    tenant: options.tenant,
    created_at: options.createdAt ?? '2026-02-20T10:00:00Z',
    updated_at: options.createdAt ?? '2026-02-20T10:00:00Z',
  },
  status: {
    state: options.state ?? 'completed',
  },
  results: {
    benchmarks:
      options.score != null
        ? [
            {
              id: options.benchmarkId ?? DEFAULT_BENCHMARK_ID,
              test: { primary_score: options.score, pass: options.scorePass },
            },
          ]
        : [],
    test: options.score != null ? { score: options.score, pass: options.scorePass } : undefined,
  },
  name: options.name,
  model: {
    name: options.modelName ?? 'test-model',
  },
  benchmarks: [
    {
      id: options.benchmarkId ?? DEFAULT_BENCHMARK_ID,
      provider_id: options.providerId ?? 'lm_evaluation_harness',
    },
  ],
});
/* eslint-enable camelcase */
