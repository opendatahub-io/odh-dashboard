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
  accuracy: 'Accuracy',
  'accuracy/accuracy': 'Accuracy',
  'Accuracy/accuracy': 'Accuracy',
  'accuracy/stderr': 'Accuracy (standard error)',
  'Accuracy/stderr': 'Accuracy (standard error)',
  accuracy_amb: 'Accuracy (ambiguous)',
  accuracy_ambig: 'Accuracy (ambiguous)',
  accuracy_disamb: 'Accuracy (disambiguated)',
  accuracy_disambig: 'Accuracy (disambiguated)',
  'admirable/mean': 'Admirable behavior',
  anls: 'ANLS',
  attack_success_rate: 'Attack success rate',
  auc: 'AUC',
  'audit_situational_awareness/mean': 'Audit situational awareness',
  answer_relevancy: 'Answer relevancy',
  answer_similarity: 'Answer similarity',
  bias_score: 'Bias score',
  bleu: 'BLEU',
  broken_tool_use: 'Broken tool use',
  'broken_tool_use/mean': 'Broken tool use',
  chrf: 'chrF',
  'choice/accuracy': 'Choice accuracy',
  'choice/stderr': 'Choice (standard error)',
  concerning: 'Concerning behavior',
  'concerning/mean': 'Concerning behavior',
  context_entity_recall: 'Context entity recall',
  context_precision: 'Context precision',
  context_recall: 'Context recall',
  'cooperation_with_harmful_sysprompt/mean': 'Cooperation with harmful system prompt',
  'cooperation_with_human_misuse/mean': 'Cooperation with human misuse',
  ethics_cm_acc: 'Ethics CM accuracy',
  exact_match: 'Exact match',
  'eval_awareness/mean': 'Evaluation awareness',
  factual_correctness: 'Factual correctness',
  faithfulness: 'Faithfulness',
  gender_bias_score: 'Gender bias score',
  hhh_acc: 'HHH accuracy',
  injection_successful_percentage: 'Successful injection percentage',
  inst_level_loose_acc: 'Instruction accuracy (loose)',
  inst_level_strict_acc: 'Instruction accuracy (strict)',
  likelihood_diff: 'Likelihood difference',
  mean_itl_ms: 'Mean inter-token latency',
  mean_ttft_ms: 'Mean time to first token',
  mc1: 'MC1',
  mc1_acc: 'MC1 accuracy',
  mc2: 'MC2',
  needs_attention: 'Needs attention',
  'needs_attention/mean': 'Needs attention',
  noise_sensitivity: 'Noise sensitivity',
  output_tokens_per_second: 'Output tokens per second',
  'pass@1': 'Pass@1',
  'pattern/accuracy': 'Pattern accuracy',
  'pattern/stderr': 'Pattern (standard error)',
  pct_stereotype: 'Stereotypical preference percentage',
  ppl: 'Perplexity',
  prompt_level_loose_acc: 'Prompt accuracy (loose)',
  prompt_level_strict_acc: 'Prompt accuracy (strict)',
  prompt_tokens_per_second: 'Prompt tokens per second',
  requests_per_second: 'Requests per second',
  rouge: 'ROUGE',
  score_gt_16k_le_32k: 'Score (16K–32K)',
  score_gt_32k_le_64k: 'Score (32K–64K)',
  score_gt_64k_le_128k: 'Score (64K–128K)',
  score_gt_8k_le_16k: 'Score (8K–16K)',
  schema_compliance: 'Schema compliance',
  'telelogs_scorer/accuracy': 'Telelogs accuracy',
  'telelogs_scorer/maj_at_k': 'Telelogs majority at k',
  'telelogs_scorer/stderr': 'Telelogs (standard error)',
  'telemath_scorer/accuracy': 'Telemath accuracy',
  'telemath_scorer/stderr': 'Telemath (standard error)',
  toxicity_score: 'Toxicity score',
  'unprompted_bizarre_behavior/mean': 'Unprompted bizarre behavior',
  'unprompted_blackmail/mean': 'Unprompted blackmail',
  'unprompted_deception_toward_user/mean': 'Unprompted deception toward user',
  'unprompted_emotional_manipulativeness/mean': 'Unprompted emotional manipulativeness',
  'unprompted_encouragement_of_user_delusion/mean': 'Unprompted encouragement of user delusion',
  'unprompted_initiative/mean': 'Unprompted initiative',
  'unprompted_leaking/mean': 'Unprompted leaking',
  'unprompted_self_preservation/mean': 'Unprompted self-preservation',
  'unprompted_self_serving_bias/mean': 'Unprompted self-serving bias',
  'unprompted_sycophancy/mean': 'Unprompted sycophancy',
  'unprompted_whistleblowing/mean': 'Unprompted whistleblowing',
  'user_over_sysprompt/mean': 'User over system prompt',
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
