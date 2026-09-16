import type { AutoRAGEvaluationMetricResult } from '~/app/types/autoragPattern';
import { formatMetricName } from '~/app/utilities/utils';

export const metricIdentity = (metric: AutoRAGEvaluationMetricResult): string =>
  `${metric.evaluator}:${metric.name}`;

export const formatMetricIdentity = (identity: string): string => {
  const separator = identity.indexOf(':');
  const evaluator = identity.slice(0, separator);
  const name = identity.slice(separator + 1);
  return `${formatMetricName(name)} (${evaluator})`;
};

/**
 * Collect the union of all metric names across multiple Q&A evaluation results,
 * preserving insertion order from the first occurrence.
 */
export function collectAllMetricNames(
  results: { metrics: AutoRAGEvaluationMetricResult[] }[],
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const result of results) {
    for (const m of result.metrics) {
      const identity = metricIdentity(m);
      if (!seen.has(identity)) {
        seen.add(identity);
        names.push(identity);
      }
    }
  }
  return names;
}

export function metricValues(
  metrics: AutoRAGEvaluationMetricResult[],
  allMetricNames: string[],
): (number | undefined)[] {
  const byIdentity = new Map(metrics.map((m) => [metricIdentity(m), m.score]));
  return allMetricNames.map((identity) => {
    const score = byIdentity.get(identity);
    return typeof score === 'number' && Number.isFinite(score) ? score : undefined;
  });
}

/**
 * Split long labels onto two lines for radar chart readability.
 * ECharts renders '\n' as a line break in radar axis names.
 */
export function formatRadarLabel(label: string): string {
  const words = label.split(' ');
  if (words.length <= 1) {
    return label;
  }
  const mid = Math.ceil(words.length / 2);
  return `${words.slice(0, mid).join(' ')}\n${words.slice(mid).join(' ')}`;
}
