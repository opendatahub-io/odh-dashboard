import type { AutoRAGEvaluationMetricResult, MetricReference } from '~/app/types/autoragPattern';
import { groupMetricsByKey, metricKey } from '~/app/utilities/metricUtils';

/**
 * Collect the union of all metric names across multiple Q&A evaluation results,
 * preserving insertion order from the first occurrence.
 */
export function collectAllMetricNames(
  results: { metrics: AutoRAGEvaluationMetricResult[] }[],
): MetricReference[] {
  const seen = new Set<string>();
  const names: MetricReference[] = [];
  for (const result of results) {
    for (const m of result.metrics) {
      const key = metricKey(m);
      if (!seen.has(key)) {
        seen.add(key);
        names.push({ name: m.name, evaluator: m.evaluator });
      }
    }
  }
  return names;
}

export function metricValues(
  metrics: AutoRAGEvaluationMetricResult[],
  allMetricNames: MetricReference[],
): (number | undefined)[] {
  const byKey = groupMetricsByKey(metrics);
  return allMetricNames.map((metric) => {
    const group = byKey.get(metricKey(metric));
    if (!group || group.length !== 1) {
      return undefined;
    }
    const { score } = group[0];
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
