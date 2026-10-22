/**
 * Utilities for the model catalog Security/Quality Insights tabs.
 *
 * These helpers are copied from the eval-hub frontend
 * (`app/components/benchmarkUtils.ts`, `app/utilities/evaluationUtils.ts`,
 * `app/utilities/tablePaginationConstants.ts`) because those files live in the
 * evalHub remote bundle and cannot be imported from host-bundled code.
 * Keep the values in sync with eval-hub until they are shared upstream.
 */

export const DEFAULT_TABLE_PER_PAGE = 20;

export const TABLE_PER_PAGE_OPTIONS = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '20', value: 20 },
];

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

// EvalHub currently provides the metric name but not its display format. Keep the
// known percentage metrics here until the API exposes unit metadata. Percentage
// values may arrive as either 0–1 ratios or an already normalized 0–100 value.
/* eslint-disable camelcase */
const PERCENTAGE_METRICS: ReadonlySet<string> = new Set([
  'acc',
  'acc_norm',
  'accuracy',
  'accuracy/accuracy',
  'Accuracy/accuracy',
  'accuracy_amb',
  'accuracy_ambig',
  'accuracy_disamb',
  'accuracy_disambig',
  'attack_success_rate',
  'bias_score',
  'choice/accuracy',
  'ethics_cm_acc',
  'exact_match',
  'f1',
  'f1_score',
  'gender_bias_score',
  'hhh_acc',
  'injection_successful_percentage',
  'inst_level_loose_acc',
  'inst_level_strict_acc',
  'mc1',
  'mc1_acc',
  'mc2',
  'pass@1',
  'pattern/accuracy',
  'pct_stereotype',
  'prompt_level_loose_acc',
  'prompt_level_strict_acc',
  'refusal_rate',
  'schema_compliance',
  'telelogs_scorer/accuracy',
  'telelogs_scorer/maj_at_k',
  'telemath_scorer/accuracy',
  'toxicity_score',
]);

// Known non-percentage metrics retain their provider-defined units.
const METRIC_UNITS: Record<string, string> = {
  mean_itl_ms: 'ms',
  mean_ttft_ms: 'ms',
  output_tokens_per_second: 'output tokens/s',
  prompt_tokens_per_second: 'prompt tokens/s',
  requests_per_second: 'requests/s',
};
/* eslint-enable camelcase */

export const getMetricUnit = (metric?: string): string | undefined =>
  metric ? METRIC_UNITS[metric] : undefined;

// An omitted metric is reserved for normalized collection-level aggregate scores. Named metrics
// must be explicitly listed above; unknown metrics are displayed as flat values for safety.
export const isPercentageMetric = (metric?: string): boolean =>
  metric === undefined || PERCENTAGE_METRICS.has(metric);

const formatMetricNumber = (value: number): string =>
  Number.isFinite(value) ? Number(value.toFixed(2)).toString() : '-';

// Different benchmark providers use different scoring scales — most use 0–1 decimal fractions,
// but some use a 0–100 percentage scale. Normalize both representations for display and requests.
const normalizeThreshold = (threshold: number): number =>
  threshold <= 1 ? Math.round(threshold * 100) : Math.round(threshold);

export const formatMetricValue = (value: number, metric?: string, includeUnit = true): string => {
  if (!Number.isFinite(value)) {
    return '-';
  }
  if (isPercentageMetric(metric)) {
    return `${normalizeThreshold(value)}%`;
  }

  const unit = getMetricUnit(metric);
  const formattedValue = formatMetricNumber(value);
  return includeUnit && unit ? `${formattedValue} ${unit}` : formattedValue;
};
