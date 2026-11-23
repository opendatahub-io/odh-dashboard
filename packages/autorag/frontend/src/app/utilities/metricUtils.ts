import type {
  AutoragEvaluationMetric,
  AutoragPattern,
  MetricReference,
  NormalizedMetricReference,
} from '~/app/types/autoragPattern';
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import { DEFAULT_OPTIMIZATION_METRIC, QUALIFIED_METRIC_LABELS } from './const';

/** Opaque key for UI maps, React keys, and table column keys. Never parse this outside this file. */
export type MetricKey = string;

const normalize = (value: string): string => value.trim().toLowerCase();

export type ObjectiveReference = MetricReference | string;

export function parseMetricReference(value: string): MetricReference {
  const separator = value.indexOf(':');
  return separator === -1
    ? { name: value }
    : { evaluator: value.slice(0, separator), name: value.slice(separator + 1) };
}

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
  const parsedReference =
    reference.evaluator === undefined ? parseMetricReference(reference.name) : reference;
  const normalizedReference = normalizeMetricReference(parsedReference);
  const qualifiedMetric = `${normalizedReference.evaluator ?? ''}:${normalizedReference.name}`;
  const qualifiedLabel = Object.entries(QUALIFIED_METRIC_LABELS).find(
    ([metric]) => metric === qualifiedMetric,
  )?.[1].results;
  if (qualifiedLabel) {
    return qualifiedLabel;
  }
  const label = formatMetricName(normalizedReference.name);
  const evaluator = parsedReference.evaluator?.trim();
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
        ? parseMetricReference(objectiveReference)
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
  const objectiveReference = parseMetricReference(objectiveName);
  const objectiveMetrics = Object.values(patterns)
    .map((pattern) => getObjectiveMetric(pattern, objectiveReference))
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
    return { name: objectiveReference.name, evaluator: evaluators.values().next().value };
  }
  return objectiveReference;
}

/** Format metric key names for display (e.g. `answer_correctness` → `Answer correctness`). */
export function formatMetricName(metricName: string): string {
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

/** Returns the complete backend rank map, or undefined when legacy ranking is required. */
export function getCompletePatternRankMap(
  patterns: Record<string, AutoragPattern>,
): Record<string, number> | undefined {
  const entries = Object.entries(patterns);
  if (entries.length === 0) {
    return undefined;
  }

  const rankMap: Record<string, number> = {};
  const uniqueRanks = new Set<number>();
  for (const [key, pattern] of entries) {
    const { rank } = pattern;
    if (typeof rank !== 'number' || !Number.isSafeInteger(rank) || rank <= 0) {
      return undefined;
    }
    if (uniqueRanks.has(rank)) {
      return undefined;
    }
    uniqueRanks.add(rank);
    rankMap[key] = rank;
  }

  for (let expectedRank = 1; expectedRank <= entries.length; expectedRank++) {
    if (!uniqueRanks.has(expectedRank)) {
      return undefined;
    }
  }

  return rankMap;
}

export type PatternRankFallbackReason = 'legacy' | 'invalid';

export function getPatternRankFallbackReason(
  patterns: Record<string, AutoragPattern>,
): PatternRankFallbackReason {
  const hasRankMetadata = Object.values(patterns).some((pattern) => pattern.rank !== undefined);
  return hasRankMetadata && getCompletePatternRankMap(patterns) === undefined
    ? 'invalid'
    : 'legacy';
}

/** Returns the mean score of the flagged objective metric, or zero for legacy fallback callers. */
export function getOptimizedScore(pattern: AutoragPattern): number {
  const mean = getObjectiveMetric(pattern)?.scores.mean;
  return typeof mean === 'number' && Number.isFinite(mean) ? mean : 0;
}

export function computePatternRankMap(
  patterns: Record<string, AutoragPattern>,
  objectiveReference: ObjectiveReference = parseMetricReference(DEFAULT_OPTIMIZATION_METRIC),
): Record<string, number> {
  const backendRankMap = getCompletePatternRankMap(patterns);
  if (backendRankMap !== undefined) {
    return backendRankMap;
  }

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
  objectiveReference: ObjectiveReference = parseMetricReference(DEFAULT_OPTIMIZATION_METRIC),
): string | undefined {
  const rankMap = computePatternRankMap(patterns, objectiveReference);
  return Object.keys(rankMap).find((key) => rankMap[key] === 1);
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
): string[] {
  return patternKeys.toSorted((a, b) =>
    compareOptimizedMetricValues(getOptimizedValue(a), getOptimizedValue(b)),
  );
}

/** Reads the pipeline-selected fallback winner from AutoRAG stage-map metadata. */
export function getBestPatternFromStageMap(
  componentStageMap?: ComponentStageMap,
): string | undefined {
  if (!componentStageMap) {
    return undefined;
  }

  const parseValue = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const getRecordValue = (record: Record<string, unknown>): string | undefined =>
    parseValue(record.best_pattern) ||
    (isRecord(record.metadata) ? parseValue(record.metadata.best_pattern) : undefined);

  const components = Array.isArray(componentStageMap.components)
    ? componentStageMap.components.filter(isRecord)
    : [];
  for (const component of components) {
    const stages = Array.isArray(component.stages) ? component.stages.filter(isRecord) : [];
    const stage = stages.find((entry) => entry.id === 'build_leaderboard');
    const stageWinner = stage ? getRecordValue(stage) : undefined;
    if (stageWinner) {
      return stageWinner;
    }
  }

  for (const component of components) {
    const componentWinner = getRecordValue(component);
    if (componentWinner) {
      return componentWinner;
    }
  }

  return getRecordValue(componentStageMap);
}
