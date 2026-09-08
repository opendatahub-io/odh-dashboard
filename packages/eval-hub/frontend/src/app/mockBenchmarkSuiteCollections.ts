/* eslint-disable camelcase */
import type { Collection } from '~/app/types';

const createMockCollection = (
  id: string,
  name: string,
  domains: string[],
  description: string,
  benchmarkIds: string[],
  benchmarkMetrics: string[],
): Collection => ({
  resource: {
    id,
    created_at: '2026-02-01T12:00:00Z',
    updated_at: '2026-02-01T12:00:00Z',
  },
  name,
  category: domains[0],
  domains,
  description,
  tags: domains,
  benchmarks: benchmarkIds.map((benchmarkId, index) => ({
    id: benchmarkId,
    provider_id: 'mock_eval_suite',
    primary_score: {
      metric: benchmarkMetrics[index],
      lower_is_better: false,
    },
  })),
});

export const mockBenchmarkSuiteCollections = (): Collection[] => [
  createMockCollection(
    'model-suite-2',
    'Model suite 2',
    ['safety', 'model'],
    'Evaluates model safety, bias, and fairness across diverse scenarios.',
    ['mc1', 'toxicity', 'gender-bias', 'bias', 'accuracy-disambiguated', 'ethics'],
    [
      'mc1_acc',
      'toxicity_score',
      'gender_bias_score',
      'bias_score',
      'accuracy_disambig',
      'ethics_cm_acc',
    ],
  ),
  createMockCollection(
    'model-suite-7',
    'Model suite 7',
    ['compliance', 'model'],
    'Evaluates model performance across compliance and multilingual benchmarks.',
    ['accuracy', 'accuracy-normalized', 'mc1'],
    ['acc', 'acc_norm', 'mc1_acc'],
  ),
  createMockCollection(
    'agent-safety-suite',
    'Agent safety suite',
    ['safety', 'agent'],
    'Measure agent refusal behavior, tool safety, and policy adherence.',
    ['attack-success', 'quality'],
    ['attack_success_rate', 'bias_score'],
  ),
  createMockCollection(
    'code-quality-suite',
    'Code quality suite',
    ['code', 'model'],
    'Evaluate code generation, reasoning, and instruction-following across programming tasks.',
    ['accuracy', 'accuracy-normalized'],
    ['acc', 'acc_norm'],
  ),
  createMockCollection(
    'trace-evaluation-suite',
    'Trace evaluation suite',
    ['general', 'traces'],
    'Measure trace quality, latency patterns, and observability coverage across agent runs.',
    ['mc1', 'toxicity'],
    ['mc1_acc', 'toxicity_score'],
  ),
  createMockCollection(
    'guardrails-compliance-suite',
    'Guardrails compliance suite',
    ['compliance', 'guardrails'],
    'Test policy adherence, harmful content refusal, and guardrail effectiveness.',
    ['attack-success', 'toxicity'],
    ['attack_success_rate', 'toxicity_score'],
  ),
];
/* eslint-enable camelcase */
