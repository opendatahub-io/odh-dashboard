import type { AutoRAGEvaluationMetricResult } from '~/app/types/autoragPattern';

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
      if (!seen.has(m.name)) {
        seen.add(m.name);
        names.push(m.name);
      }
    }
  }
  return names;
}

// Metrics are scored on a 0–1 scale, so 0 is used for any metric
// that is not computed for a given Q&A pair. This keeps every radar
// chart axis visible and comparable across entries.
export function metricValues(
  metrics: AutoRAGEvaluationMetricResult[],
  allMetricNames: string[],
): number[] {
  const byName = new Map(metrics.map((m) => [m.name, m.score]));
  return allMetricNames.map((name) => byName.get(name) ?? 0);
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
