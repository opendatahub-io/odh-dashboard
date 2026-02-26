import { EvaluationJob, EvaluationJobState } from '~/app/types';

type MockEvaluationJobOptions = {
  id?: string;
  tenant?: string;
  state?: EvaluationJobState;
  modelName?: string;
  benchmarkId?: string;
  providerId?: string;
  createdAt?: string;
  metrics?: Record<string, number>;
};

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
    total_evaluations: options.metrics ? 1 : 0,
    benchmarks: options.metrics
      ? [{ id: options.benchmarkId ?? 'bench-1', metrics: options.metrics }]
      : [],
  },
  model: {
    name: options.modelName ?? 'test-model',
  },
  benchmarks:
    options.benchmarkId !== undefined || options.providerId !== undefined
      ? [
          {
            id: options.benchmarkId ?? 'bench-1',
            provider_id: options.providerId ?? 'lm_evaluation_harness',
          },
        ]
      : [{ id: 'default-benchmark', provider_id: 'lm_evaluation_harness' }],
});
/* eslint-enable camelcase */
