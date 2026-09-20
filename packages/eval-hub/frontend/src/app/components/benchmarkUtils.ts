type CategoryColor = 'orange' | 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'yellow';

const CATEGORY_COLOR_PALETTE: CategoryColor[] = [
  'blue',
  'teal',
  'green',
  'purple',
  'orange',
  'red',
  'yellow',
];

export const getCategoryColor = (category?: string): CategoryColor => {
  if (!category) {
    return 'blue';
  }
  const hash = category
    .toLowerCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
};

export const capitalizeFirst = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const toTitleCase = (value: string): string => {
  if (!value) {
    return value;
  }
  return value
    .split(' ')
    .map((word) => {
      if (word === word.toUpperCase() && word.length > 1) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const formatCategory = (value: string): string => capitalizeFirst(value.replace(/_/g, ' '));

/* eslint-disable camelcase */
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  acc: 'Accuracy',
  acc_norm: 'Accuracy (normalized)',
  accuracy_ambig: 'Accuracy (ambiguous)',
  accuracy_disambig: 'Accuracy (disambiguated)',
  attack_success_rate: 'Attack success rate',
  auc: 'AUC',
  bias_score: 'Bias score',
  bleu: 'BLEU',
  chrf: 'chrF',
  ethics_cm_acc: 'Ethics CM accuracy',
  exact_match: 'Exact match',
  gender_bias_score: 'Gender bias score',
  hhh_acc: 'HHH accuracy',
  inst_level_loose_acc: 'Instruction accuracy (loose)',
  inst_level_strict_acc: 'Instruction accuracy (strict)',
  mc1: 'MC1',
  mc1_acc: 'MC1 accuracy',
  mc2: 'MC2',
  ppl: 'Perplexity',
  prompt_level_loose_acc: 'Prompt accuracy (loose)',
  prompt_level_strict_acc: 'Prompt accuracy (strict)',
  rouge: 'ROUGE',
  score_gt_16k_le_32k: 'Score (16K–32K)',
  score_gt_32k_le_64k: 'Score (32K–64K)',
  score_gt_64k_le_128k: 'Score (64K–128K)',
  score_gt_8k_le_16k: 'Score (8K–16K)',
  toxicity_score: 'Toxicity score',
};
/* eslint-enable camelcase */

export const getMetricDisplayName = (metric: string): string =>
  Object.hasOwn(METRIC_DISPLAY_NAMES, metric)
    ? METRIC_DISPLAY_NAMES[metric]
    : formatCategory(metric);

export const VISIBLE_METRICS_COUNT = 3;

export const toSafeExternalUrl = (raw?: string): string | undefined => {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? raw : undefined;
  } catch {
    return undefined;
  }
};
