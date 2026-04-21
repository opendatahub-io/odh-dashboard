/* eslint-disable camelcase */
import { Provider, ProviderBenchmark } from '~/app/types';

type MockProviderOptions = Partial<{
  id: string;
  name: string;
  title: string;
  description: string;
  tags: string[];
  benchmarks: ProviderBenchmark[];
}>;

export const mockProvider = (options: MockProviderOptions = {}): Provider => ({
  resource: {
    id: options.id ?? 'lm_evaluation_harness',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
  },
  name: options.name ?? 'lm_evaluation_harness',
  title: options.title ?? 'LM Evaluation Harness',
  description: options.description ?? 'Comprehensive LLM evaluation framework.',
  tags: options.tags ?? ['llm', 'evaluation'],
  benchmarks: options.benchmarks ?? [
    {
      id: 'truthfulqa_mc1',
      name: 'TruthfulQA MC1',
      description: 'Multiple-choice truthfulness evaluation.',
      category: 'Truthfulness',
      metrics: ['accuracy', 'mc1'],
      tags: ['truthfulness'],
      num_few_shot: 0,
      dataset_size: 817,
    },
    {
      id: 'hellaswag',
      name: 'HellaSwag',
      description: 'Commonsense reasoning benchmark.',
      category: 'Reasoning',
      metrics: ['accuracy', 'perplexity'],
      tags: ['reasoning'],
      num_few_shot: 10,
      dataset_size: 10042,
    },
  ],
});
/* eslint-enable camelcase */
