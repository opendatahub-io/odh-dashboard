/* eslint-disable camelcase */
import type { Collection } from '~/app/types';

const MOCK_AI_ENTITIES = ['model', 'agent'] as const;
type MockAiEntity = (typeof MOCK_AI_ENTITIES)[number];

const isMockAiEntity = (value: string): value is MockAiEntity =>
  MOCK_AI_ENTITIES.some((aiEntity) => aiEntity === value);

const MOCK_COLLECTION_INDUSTRIES: Record<string, string[]> = {
  'model-suite-2': ['health'],
  'model-suite-7': ['financial'],
  'agent-safety-suite': ['government'],
  'code-quality-suite': ['telco'],
  'trace-evaluation-suite': ['health'],
  'guardrails-compliance-suite': ['government'],
  'finance-evaluation-suite': ['financial'],
  'open-llm-leaderboard-v2': ['telco'],
  clawbench: ['government'],
  'curated-agent-safety-suite': ['health'],
  'curated-safety-and-fairness-agent': ['government'],
  'software-engineering-agent-suite': ['telco'],
  'curated-toxicity-risk-agent': ['health'],
  'curated-open-llm-leaderboard-v2': ['telco'],
  'safety-and-fairness-v1': ['health'],
  'free-open-telco-llm-benchmark': ['telco'],
  'healthcare-evaluation-suite': ['health'],
  'eu-ai-act-compliance-suite': ['government'],
  'curated-toxicity-risk-model': ['financial'],
};

const createMockCollection = (
  id: string,
  name: string,
  domains: string[],
  description: string,
  benchmarkIds: string[],
  benchmarkMetrics: string[],
): Collection => {
  const collectionDomains = domains.filter((domain) => !isMockAiEntity(domain));
  const aiEntities = domains.filter(isMockAiEntity);

  return {
    resource: {
      id,
      created_at: '2026-02-01T12:00:00Z',
      updated_at: '2026-02-01T12:00:00Z',
    },
    name,
    category: collectionDomains[0],
    domains: collectionDomains,
    ai_entities: aiEntities,
    industries: MOCK_COLLECTION_INDUSTRIES[id] ?? [],
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
  };
};

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
  createMockCollection(
    'finance-evaluation-suite',
    'Finance evaluation suite',
    ['general', 'model'],
    'Evaluate model performance for financial services and banking scenarios.',
    ['accuracy', 'detection-rate', 'compliance-rate'],
    ['acc', 'detection_rate', 'compliance_rate'],
  ),
  createMockCollection(
    'open-llm-leaderboard-v2',
    'Open LLM Leaderboard v2',
    ['general', 'model'],
    'Comprehensive evaluation suite for general-purpose language models.',
    ['accuracy'],
    ['acc'],
  ),
];

export const mockCuratedBenchmarkSuiteCollections = (aiEntity: 'agent' | 'model'): Collection[] => {
  if (aiEntity === 'agent') {
    return [
      createMockCollection(
        'clawbench',
        'ClawBench',
        ['general', 'agent'],
        'Multi-step task completion benchmark for AI agents using real-world scenarios and tool interactions.',
        ['clawbench-task-completion', 'clawbench-tool-use', 'clawbench-planning'],
        ['task_completion', 'tool_use', 'planning'],
      ),
      createMockCollection(
        'curated-agent-safety-suite',
        'Agent safety suite',
        ['safety', 'agent'],
        'Evaluate agent refusal behavior, adversarial resistance, and safe handling of harmful requests.',
        ['attack-success', 'adversarial-resistance', 'refusal-quality'],
        ['attack_success_rate', 'resistance_rate', 'quality_score'],
      ),
      createMockCollection(
        'curated-safety-and-fairness-agent',
        'Safety and fairness',
        ['safety', 'agent'],
        'Evaluate agent safety, bias, and fairness across diverse scenarios.',
        ['safety', 'bias', 'fairness', 'refusal', 'toxicity', 'stereotype'],
        [
          'safety_score',
          'bias_score',
          'fairness_score',
          'refusal_rate',
          'toxicity_score',
          'stereotype_score',
        ],
      ),
      createMockCollection(
        'software-engineering-agent-suite',
        'Software engineering evaluation suite',
        ['code', 'agent'],
        'Code generation, debugging, and software development tasks.',
        [
          'code-generation',
          'code-debugging',
          'code-reasoning',
          'code-quality',
          'instruction-following',
          'repo-task',
        ],
        [
          'accuracy',
          'pass_rate',
          'reasoning_score',
          'quality_score',
          'instruction_following',
          'task_completion',
        ],
      ),
      createMockCollection(
        'curated-toxicity-risk-agent',
        'Toxicity & risk evals (WIP)',
        ['safety', 'agent'],
        'Evaluate agent outputs for toxic, harmful, or risky content.',
        ['toxicity', 'harmfulness', 'risk', 'jailbreak', 'refusal', 'alignment'],
        [
          'toxicity_score',
          'harmfulness_score',
          'risk_score',
          'jailbreak_resistance',
          'refusal_rate',
          'alignment_score',
        ],
      ),
    ];
  }

  return [
    createMockCollection(
      'curated-open-llm-leaderboard-v2',
      'Open LLM Leaderboard v2',
      ['general', 'model'],
      'Comprehensive evaluation suite for general-purpose language models.',
      [
        'leaderboard-accuracy',
        'leaderboard-reasoning',
        'leaderboard-knowledge',
        'leaderboard-safety',
        'leaderboard-code',
        'leaderboard-math',
      ],
      [
        'accuracy',
        'reasoning_score',
        'knowledge_score',
        'safety_score',
        'code_score',
        'math_score',
      ],
    ),
    createMockCollection(
      'safety-and-fairness-v1',
      'Safety and fairness',
      ['safety', 'model'],
      'Evaluates model safety, bias, and fairness across diverse scenarios.',
      ['safety', 'bias', 'fairness', 'refusal', 'toxicity', 'stereotype'],
      [
        'safety_score',
        'bias_score',
        'fairness_score',
        'refusal_rate',
        'toxicity_score',
        'stereotype_score',
      ],
    ),
    createMockCollection(
      'free-open-telco-llm-benchmark',
      'Free open-telco LLM benchmark',
      ['telco', 'model'],
      'Specialized benchmarks for telecommunications industry applications.',
      ['telcomath', 'teleqna', 'telos', '3gpp-tsg', 'tele-yaml'],
      ['accuracy', 'accuracy', 'accuracy', 'classification', 'accuracy'],
    ),
    createMockCollection(
      'healthcare-evaluation-suite',
      'Healthcare evaluation suite',
      ['healthcare', 'model'],
      'Medical and healthcare domain-specific evaluation suite.',
      [
        'medical-knowledge',
        'clinical-reasoning',
        'medical-safety',
        'diagnosis',
        'patient-communication',
        'healthcare-bias',
      ],
      [
        'accuracy',
        'reasoning_score',
        'safety_score',
        'diagnosis_accuracy',
        'quality_score',
        'bias_score',
      ],
    ),
    createMockCollection(
      'finance-evaluation-suite',
      'Finance evaluation suite',
      ['finance', 'model'],
      'Financial services and banking domain evaluation suite.',
      [
        'finance-accuracy',
        'finance-detection',
        'finance-compliance',
        'finance-reasoning',
        'finance-risk',
        'finance-qa',
      ],
      [
        'accuracy',
        'detection_rate',
        'compliance_rate',
        'reasoning_score',
        'risk_score',
        'qa_accuracy',
      ],
    ),
    createMockCollection(
      'software-engineering-model-suite',
      'Software engineering evaluation suite',
      ['code', 'model'],
      'Code generation, debugging, and software development tasks.',
      [
        'code-generation',
        'code-debugging',
        'code-reasoning',
        'code-quality',
        'instruction-following',
        'repo-task',
      ],
      [
        'accuracy',
        'pass_rate',
        'reasoning_score',
        'quality_score',
        'instruction_following',
        'task_completion',
      ],
    ),
    createMockCollection(
      'eu-ai-act-compliance-suite',
      'EU AI Act compliance evaluation suite',
      ['compliance', 'model'],
      'Compliance testing for EU AI Act requirements.',
      [
        'compliance-risk',
        'transparency',
        'fairness',
        'privacy',
        'robustness',
        'accountability',
        'safety',
      ],
      [
        'compliance_rate',
        'transparency_score',
        'fairness_score',
        'privacy_score',
        'robustness_score',
        'accountability_score',
        'safety_score',
      ],
    ),
    createMockCollection(
      'curated-toxicity-risk-model',
      'Toxicity & risk evals (WIP)',
      ['safety', 'model'],
      'Evaluates model outputs for toxic, harmful, or risky content.',
      ['toxicity', 'harmfulness', 'risk', 'jailbreak', 'refusal', 'alignment'],
      [
        'toxicity_score',
        'harmfulness_score',
        'risk_score',
        'jailbreak_resistance',
        'refusal_rate',
        'alignment_score',
      ],
    ),
  ];
};
/* eslint-enable camelcase */
