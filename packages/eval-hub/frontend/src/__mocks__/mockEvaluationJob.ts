/* eslint-disable camelcase */
import { EvaluationJob, EvaluationJobState } from '~/app/types';

type MockEvaluationJobOptions = Partial<{
  id: string;
  name: string;
  tenant: string;
  state: EvaluationJobState;
  modelName: string;
  modelUrl: string;
  owner: string;
  createdAt: string;
  tags: string[];
  benchmarkIds: string[];
  providerId: string;
  collectionId: string;
  score: number;
  scorePass: boolean;
  threshold: number;
  benchmarkResults: EvaluationJob['results']['benchmarks'];
}>;

export const mockEvaluationJob = (options: MockEvaluationJobOptions = {}): EvaluationJob => ({
  resource: {
    id: options.id ?? 'eval-job-001',
    tenant: options.tenant,
    created_at: options.createdAt ?? '2026-03-10T14:30:00Z',
    updated_at: options.createdAt ?? '2026-03-10T14:30:00Z',
    owner: options.owner ?? 'user@example.com',
  },
  status: {
    state: options.state ?? 'completed',
  },
  results: {
    benchmarks: options.benchmarkResults ?? [],
    test:
      options.score != null
        ? {
            score: options.score,
            threshold: options.threshold,
            pass: options.scorePass,
          }
        : undefined,
  },
  name: options.name,
  tags: options.tags,
  model: {
    name: options.modelName ?? 'test-model',
    url: options.modelUrl,
  },
  pass_criteria: options.threshold != null ? { threshold: options.threshold } : undefined,
  benchmarks: (options.benchmarkIds ?? ['default-benchmark']).map((id) => ({
    id,
    provider_id: options.providerId ?? 'lm_evaluation_harness',
  })),
  collection: options.collectionId ? { id: options.collectionId } : undefined,
});

export const mockSingleEvaluationJob = (): EvaluationJob =>
  mockEvaluationJob({
    id: 'eval-job-004',
    name: 'ToxicityDetect_Eval_Claude',
    tags: ['Safety'],
    state: 'completed',
    modelName: 'claude-3-opus',
    modelUrl: 'https://api.example.com/v1/models/serving-endpoint01',
    owner: 'user@example.com',
    createdAt: '2026-03-05T10:20:00Z',
    benchmarkIds: ['harmful_request_refusal'],
    providerId: 'safety_eval_suite',
    score: 0.3,
    scorePass: false,
    threshold: 0.5,
    benchmarkResults: [
      {
        id: 'harmful_request_refusal',
        provider_id: 'safety_eval_suite',
        metrics: { refusal_rate: 0.3 },
        test: { primary_score: 0.3, threshold: 0.5, pass: false },
      },
    ],
  });

export const mockCollectionEvaluationJob = (): EvaluationJob =>
  mockEvaluationJob({
    id: 'eval-job-collection-001',
    name: 'ToxicityDet_Claude',
    tags: ['Safety'],
    state: 'completed',
    modelName: 'claude-3-opus',
    modelUrl: 'https://api.example.com/v1/models/serving-endpoint01',
    owner: 'user@example.com',
    createdAt: '2026-03-10T14:30:00Z',
    collectionId: 'collection-002',
    score: 0.72,
    scorePass: true,
    threshold: 0.3,
    benchmarkIds: [
      'harmful_request_refusal',
      'truthfulqa_mc1',
      'toxigen',
      'toxicity_risk',
      'ethical_alignment',
      'winobias',
      'adversarial_robustness',
      'truthfulqa_gen',
    ],
    providerId: 'safety_eval_suite',
    benchmarkResults: [
      {
        id: 'harmful_request_refusal',
        provider_id: 'safety_eval_suite',
        metrics: { refusal_rate: 0.95 },
        test: { primary_score: 0.95, threshold: 0.8, pass: true },
      },
      {
        id: 'truthfulqa_mc1',
        provider_id: 'lm_evaluation_harness',
        metrics: { accuracy: 0.68 },
        test: { primary_score: 0.68, threshold: 0.5, pass: true },
      },
      {
        id: 'toxigen',
        provider_id: 'safety_eval_suite',
        metrics: { toxicity_score: 0.12 },
        test: { primary_score: 0.88, threshold: 0.7, pass: true },
      },
      {
        id: 'toxicity_risk',
        provider_id: 'safety_eval_suite',
        metrics: { risk_score: 0.45 },
        test: { primary_score: 0.55, threshold: 0.6, pass: false },
      },
      {
        id: 'ethical_alignment',
        provider_id: 'safety_eval_suite',
        metrics: { alignment_score: 0.81 },
        test: { primary_score: 0.81, threshold: 0.7, pass: true },
      },
      {
        id: 'winobias',
        provider_id: 'safety_eval_suite',
        metrics: { bias_score: 0.73 },
        test: { primary_score: 0.73, threshold: 0.8, pass: false },
      },
      {
        id: 'adversarial_robustness',
        provider_id: 'safety_eval_suite',
        metrics: { robustness: 0.62 },
        test: { primary_score: 0.62, threshold: 0.5, pass: true },
      },
      {
        id: 'truthfulqa_gen',
        provider_id: 'lm_evaluation_harness',
        metrics: { truthfulness: 0.59 },
        test: { primary_score: 0.59, threshold: 0.5, pass: true },
      },
    ],
  });
/* eslint-enable camelcase */
