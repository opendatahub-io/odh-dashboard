import type {
  AutoragEvaluationMetric,
  AutoragPattern,
  MetricReference,
  NormalizedMetricReference,
} from '~/app/types/autoragPattern';
import { DEFAULT_OPTIMIZATION_METRIC } from './const';

/** Opaque key for UI maps, React keys, and table column keys. Never parse this outside this file. */
export type MetricKey = string;

const normalize = (value: string): string => value.trim().toLowerCase();

type ObjectiveReference = MetricReference | string;

/** Normalize the parts of a metric identity without crossing the string-key boundary. */
export function normalizeMetricReference(reference: MetricReference): NormalizedMetricReference {
  const evaluator = reference.evaluator === undefined ? undefined : normalize(reference.evaluator);
  return {
    name: normalize(reference.name),
    ...(evaluator !== undefined ? { evaluator } : {}),
  };
}

/** Create the single normalized metric key used at UI string boundaries. */
export function metricKey(reference: MetricReference): MetricKey {
  const normalized = normalizeMetricReference(reference);
  return `metric:${JSON.stringify([normalized.evaluator, normalized.name])}`;
}

/** Create the sanitized identity suffix used only at DOM/test-ID boundaries. */
export function metricDomSuffix(reference: MetricReference): string {
  const normalized = normalizeMetricReference(reference);
  const identity = [normalized.name, normalized.evaluator].filter(Boolean).join('-');
  return (
    identity
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'metric'
  );
}

/** Create a deterministic DOM/test ID without parsing the opaque metric key. */
export function metricDomId(prefix: string, reference: MetricReference): string {
  return `${prefix}-${metricDomSuffix(reference)}`;
}

/** Group metric records by their normalized identity. */
export function groupMetricsByKey<T extends MetricReference>(
  metrics: readonly T[],
): Map<MetricKey, T[]> {
  const groups = new Map<MetricKey, T[]>();
  metrics.forEach((metric) => {
    const key = metricKey(metric);
    const group = groups.get(key);
    if (group) {
      group.push(metric);
    } else {
      groups.set(key, [metric]);
    }
  });
  return groups;
}

/** Find exactly one metric matching a reference; duplicate or name-only ambiguity returns undefined. */
export function findUniqueMetric<T extends MetricReference>(
  metrics: readonly T[],
  reference: MetricReference,
): T | undefined {
  const normalizedReference = normalizeMetricReference(reference);
  const matches = metrics.filter((metric) => {
    const normalizedMetric = normalizeMetricReference(metric);
    return (
      normalizedMetric.name === normalizedReference.name &&
      (normalizedReference.evaluator === undefined ||
        normalizedMetric.evaluator === normalizedReference.evaluator)
    );
  });
  return matches.length === 1 ? matches[0] : undefined;
}

/** Format a metric reference for user-facing labels. */
export function metricLabel(reference: MetricReference): string {
  const label = formatMetricName(normalizeMetricReference(reference).name);
  const evaluator = reference.evaluator?.trim();
  return evaluator ? `${label} (${evaluator})` : label;
}

/**
 * Find exactly one metric matching a reference. A name-only reference is intentionally ambiguous
 * when multiple evaluators provide the same metric.
 */
export function findMetric(
  pattern: AutoragPattern,
  reference: MetricReference,
): AutoragEvaluationMetric | undefined {
  return findUniqueMetric(pattern.evaluation.metrics, reference);
}

/**
 * Resolve the pattern's objective metric. Prefer the flagged metric when available, but fall
 * back to a uniquely named metric for patterns that do not repeat the objective flag. An
 * evaluator-qualified reference selects that evaluator even when another evaluator is marked.
 */
export function getObjectiveMetric(
  pattern: AutoragPattern,
  objectiveReference?: ObjectiveReference,
): AutoragEvaluationMetric | undefined {
  const reference =
    objectiveReference === undefined
      ? undefined
      : typeof objectiveReference === 'string'
        ? { name: objectiveReference }
        : objectiveReference;
  const normalizedObjective = reference ? normalizeMetricReference(reference) : undefined;
  const flaggedMatches = pattern.evaluation.metrics.filter(
    (metric) =>
      metric.optimization_metric === true &&
      (normalizedObjective === undefined ||
        (normalize(metric.name) === normalizedObjective.name &&
          (normalizedObjective.evaluator === undefined ||
            normalizeMetricReference(metric).evaluator === normalizedObjective.evaluator))),
  );

  // An evaluator-qualified reference identifies the selected metric even when another evaluator
  // carries the optimization marker.
  if (reference && normalizedObjective?.evaluator !== undefined) {
    return findUniqueMetric(pattern.evaluation.metrics, reference);
  }

  if (flaggedMatches.length === 1) {
    const flaggedObjective = findUniqueMetric(pattern.evaluation.metrics, flaggedMatches[0]);
    if (flaggedObjective) {
      return flaggedObjective;
    }
  }

  if (reference === undefined) {
    return undefined;
  }
  return findUniqueMetric(pattern.evaluation.metrics, { name: reference.name });
}

/** Resolve one display reference for the run objective across the available patterns. */
export function resolveObjectiveReference(
  patterns: Record<string, AutoragPattern>,
  objectiveName: string,
): MetricReference {
  const objectiveMetrics = Object.values(patterns)
    .map((pattern) => getObjectiveMetric(pattern, objectiveName))
    .filter((metric): metric is AutoragEvaluationMetric => metric !== undefined);
  const missingEvaluator = objectiveMetrics.some(
    (metric) => normalizeMetricReference(metric).evaluator === undefined,
  );
  const evaluators = new Map<string, string>();
  objectiveMetrics.forEach((metric) => {
    const normalizedEvaluator = normalizeMetricReference(metric).evaluator;
    if (normalizedEvaluator !== undefined && !evaluators.has(normalizedEvaluator)) {
      evaluators.set(normalizedEvaluator, metric.evaluator);
    }
  });

  if (!missingEvaluator && evaluators.size === 1) {
    return { name: objectiveName, evaluator: evaluators.values().next().value };
  }
  return { name: objectiveName };
}

/** Format metric key names for display (e.g. `answer_correctness` → `Answer correctness`). */
function formatMetricName(metricName: string): string {
  /* eslint-disable camelcase */
  const specialCases: Record<string, string> = {
    faithfulness: 'Answer faithfulness',
    answer_correctness: 'Answer correctness',
    context_correctness: 'Context correctness',
    answer_relevance: 'Answer relevance',
    answer_relevancy: 'Answer relevancy',
    context_precision: 'Context precision',
    context_recall: 'Context recall',
    overall_score: 'Overall score',
  };
  /* eslint-enable camelcase */

  if (specialCases[metricName]) {
    return specialCases[metricName];
  }

  return metricName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Format metric values consistently, with optional surface-specific precision. */
export function formatMetricValue(value: number | string, precision = 3): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!Number.isFinite(value)) {
    return 'N/A';
  }
  const fixed = value.toFixed(precision);
  const zero = `0.${'0'.repeat(precision)}`;
  const negativeZero = `-0.${'0'.repeat(precision)}`;
  if ((fixed === zero || fixed === negativeZero) && value !== 0) {
    return value.toExponential(precision);
  }
  return fixed;
}

export function isPatternRankable(
  pattern: AutoragPattern,
  objectiveReference: ObjectiveReference,
): boolean {
  const mean = getObjectiveMetric(pattern, objectiveReference)?.scores.mean;
  return typeof mean === 'number' && Number.isFinite(mean);
}

/** Returns the mean score of the flagged objective metric, or zero for legacy fallback callers. */
export function getOptimizedScore(pattern: AutoragPattern): number {
  const mean = getObjectiveMetric(pattern)?.scores.mean;
  return typeof mean === 'number' && Number.isFinite(mean) ? mean : 0;
}

export function computePatternRankMap(
  patterns: Record<string, AutoragPattern>,
  objectiveReference: ObjectiveReference = { name: DEFAULT_OPTIMIZATION_METRIC },
): Record<string, number> {
  const sorted = Object.entries(patterns)
    .filter(([, pattern]) => isPatternRankable(pattern, objectiveReference))
    .toSorted(
      ([, a], [, b]) =>
        getObjectiveMetric(b, objectiveReference)!.scores.mean! -
        getObjectiveMetric(a, objectiveReference)!.scores.mean!,
    );
  const map: Record<string, number> = {};
  sorted.forEach(([key], index) => {
    map[key] = index + 1;
  });
  return map;
}

export function resolveBestPatternKey(
  patterns: Record<string, AutoragPattern>,
  objectiveReference: ObjectiveReference = { name: DEFAULT_OPTIMIZATION_METRIC },
): string | undefined {
  const patternKeys = Object.keys(patterns).filter((key) =>
    isPatternRankable(patterns[key], objectiveReference),
  );
  if (patternKeys.length === 0) {
    return undefined;
  }
  return patternKeys.toSorted(
    (a, b) =>
      getObjectiveMetric(patterns[b], objectiveReference)!.scores.mean! -
      getObjectiveMetric(patterns[a], objectiveReference)!.scores.mean!,
  )[0];
}

export function compareOptimizedMetricValues(aVal: number | string, bVal: number | string): number {
  if (aVal === 'N/A' && bVal === 'N/A') {
    return 0;
  }
  if (aVal === 'N/A') {
    return 1;
  }
  if (bVal === 'N/A') {
    return -1;
  }
  const aNum = typeof aVal === 'number' ? aVal : 0;
  const bNum = typeof bVal === 'number' ? bVal : 0;
  if (Object.is(aNum, bNum)) {
    return 0;
  }
  if (Number.isNaN(aNum)) {
    return 1;
  }
  if (Number.isNaN(bNum)) {
    return -1;
  }
  return bNum > aNum ? 1 : -1;
}

export function orderPatternsByLeaderboardRank(
  patternKeys: string[],
  getOptimizedValue: (patternKey: string) => number | string,
  bestPatternKey?: string,
): string[] {
  const sorted = patternKeys.toSorted((a, b) =>
    compareOptimizedMetricValues(getOptimizedValue(a), getOptimizedValue(b)),
  );

  if (!bestPatternKey || !patternKeys.includes(bestPatternKey)) {
    return sorted;
  }

  return [bestPatternKey, ...sorted.filter((key) => key !== bestPatternKey)];
}
