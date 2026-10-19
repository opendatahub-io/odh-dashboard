import type { CollectionBenchmark, Provider } from '~/app/types';

export type BenchmarkNameMap = ReadonlyMap<string, string>;

const benchmarkNameMapKey = (providerId: string, benchmarkId: string): string =>
  `${providerId}:${benchmarkId}`;

/**
 * Builds benchmark-name lookups for both provider-qualified and provider-agnostic collection
 * benchmark references. An ID-only lookup is omitted when providers expose conflicting names.
 */
export const getBenchmarkNameMap = (providers: Provider[]): Map<string, string> => {
  const nameMap = new Map<string, string>();
  const ambiguousBenchmarkIds = new Set<string>();

  providers.forEach((provider) => {
    (provider.benchmarks ?? []).forEach((benchmark) => {
      const name = benchmark.name.trim() || benchmark.id;
      nameMap.set(benchmarkNameMapKey(provider.resource.id, benchmark.id), name);

      if (ambiguousBenchmarkIds.has(benchmark.id)) {
        return;
      }

      const existingName = nameMap.get(benchmark.id);
      if (existingName && existingName !== name) {
        nameMap.delete(benchmark.id);
        ambiguousBenchmarkIds.add(benchmark.id);
      } else {
        nameMap.set(benchmark.id, name);
      }
    });
  });

  return nameMap;
};

export const getBenchmarkDisplayName = (
  benchmark: CollectionBenchmark,
  benchmarkNameMap?: BenchmarkNameMap,
): string => {
  const providerBenchmarkName = benchmark.provider_id
    ? benchmarkNameMap?.get(benchmarkNameMapKey(benchmark.provider_id, benchmark.id))
    : undefined;

  return providerBenchmarkName ?? benchmarkNameMap?.get(benchmark.id) ?? benchmark.id;
};

type CategoryColor = 'orange' | 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'yellow' | 'grey';

export type CategoryTileColor =
  | 'light-blue'
  | 'lavender'
  | 'mint-teal'
  | 'light-green'
  | 'apricot'
  | 'soft-mint-yellow'
  | 'soft-pink'
  | 'pale-cyan';

export const CATEGORY_TILE_COLORS: Readonly<Record<CategoryTileColor, string>> = {
  'light-blue': '#B9DCF7',
  lavender: '#D0C4F3',
  'mint-teal': '#BCE8DF',
  'light-green': '#C8EFB5',
  apricot: '#FFD0A0',
  'soft-mint-yellow': '#E6E6A8',
  'soft-pink': '#F5C1C1',
  'pale-cyan': '#B9E5E5',
};

/* eslint-disable camelcase */
const CATEGORY_TILE_COLOR_MAP: Readonly<Record<string, CategoryTileColor>> = {
  knowledge_and_reasoning: 'lavender',
  grounded_document_understanding: 'light-blue',
  instruction_and_output_reliability: 'light-green',
  tool_use_and_function_calling: 'apricot',
  software: 'mint-teal',
  trustworthiness: 'soft-pink',
  multilingual: 'pale-cyan',
  multimodal: 'soft-mint-yellow',
};
/* eslint-enable camelcase */

export const normalizeCategory = (category?: string): string =>
  category
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_') ?? '';

export const getCategoryTileColor = (category?: string): CategoryTileColor => {
  const normalizedCategory = normalizeCategory(category);
  return Object.hasOwn(CATEGORY_TILE_COLOR_MAP, normalizedCategory)
    ? CATEGORY_TILE_COLOR_MAP[normalizedCategory]
    : 'light-blue';
};

const CATEGORY_COLOR_PALETTE: CategoryColor[] = [
  'blue',
  'teal',
  'green',
  'purple',
  'orange',
  'red',
  'yellow',
];

/* eslint-disable camelcase */
const CATEGORY_LABEL_COLOR_MAP: Readonly<Partial<Record<string, CategoryColor>>> = {
  knowledge_and_reasoning: 'purple',
  grounded_document_understanding: 'blue',
  instruction_and_output_reliability: 'green',
  tool_use_and_function_calling: 'orange',
  software: 'teal',
  trustworthiness: 'red',
  multilingual: 'grey',
  multimodal: 'yellow',
};
/* eslint-enable camelcase */

export const getCategoryColor = (category?: string): CategoryColor => {
  if (!category) {
    return 'blue';
  }
  const normalizedCategory = normalizeCategory(category);
  const mappedColor = Object.hasOwn(CATEGORY_LABEL_COLOR_MAP, normalizedCategory)
    ? CATEGORY_LABEL_COLOR_MAP[normalizedCategory]
    : undefined;
  if (mappedColor) {
    return mappedColor;
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

export const getCollectionCategoryValues = (collection: {
  category?: string;
  domains?: string[];
}): string[] => (collection.category ? [collection.category] : (collection.domains ?? []));

const COLLECTION_METADATA_ACRONYMS: Record<string, string> = {
  qa: 'QA',
  rag: 'RAG',
  vqa: 'VQA',
};

export const formatCollectionMetadataValue = (value: string): string =>
  formatCategory(value.replace(/-/g, '_')).replace(
    /\b(qa|rag|vqa)\b/gi,
    (acronym) => COLLECTION_METADATA_ACRONYMS[acronym.toLowerCase()] ?? acronym,
  );

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

export const getVisibleMetricCount = (
  metricWidths: number[],
  overflowLabelWidths: number[],
  availableWidth: number,
  gap: number,
): number => {
  const maximumVisibleCount = Math.min(metricWidths.length, VISIBLE_METRICS_COUNT);

  for (let visibleCount = maximumVisibleCount; visibleCount >= 0; visibleCount -= 1) {
    const hiddenCount = metricWidths.length - visibleCount;
    const labelsWidth = metricWidths.slice(0, visibleCount).reduce((sum, width) => sum + width, 0);
    const labelsGap = Math.max(visibleCount - 1, 0) * gap;
    const overflowWidth = hiddenCount > 0 ? (overflowLabelWidths[hiddenCount - 1] ?? 0) : 0;
    const overflowGap = visibleCount > 0 && hiddenCount > 0 ? gap : 0;

    if (labelsWidth + labelsGap + overflowWidth + overflowGap <= availableWidth) {
      return visibleCount;
    }
  }

  return 0;
};

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
