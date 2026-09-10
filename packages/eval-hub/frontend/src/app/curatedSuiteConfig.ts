export const CURATED_SUITE_PAGE_CONFIG = {
  agent: {
    title: 'Agent benchmark suites',
    description: 'Select a benchmark suite to evaluate your agent.',
  },
  model: {
    title: 'Model benchmark suites',
    description: 'Select a benchmark suite to evaluate your model.',
  },
} as const;

export type CuratedAiEntity = keyof typeof CURATED_SUITE_PAGE_CONFIG;

export const isCuratedAiEntity = (value: string | undefined): value is CuratedAiEntity =>
  value === 'agent' || value === 'model';
