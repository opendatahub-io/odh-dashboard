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

export const RADAR_AXIS_NAME_WIDTH = 86;

export const radarAxisNameStyle = (color: string): Record<string, unknown> => ({
  color,
  fontSize: 11,
  lineHeight: 14,
  overflow: 'break',
  width: RADAR_AXIS_NAME_WIDTH,
});

/**
 * Split long labels onto multiple lines for radar chart readability.
 * ECharts renders '\n' as a line break in radar axis names.
 * Evaluator suffixes such as "(unitxt)" are always placed on their own line
 * so labels like "Context correctness (unitxt)" stay fully visible.
 */
export function formatRadarLabel(label: string): string {
  const match = /^(.*?)(?:\s+(\([^)]+\)))?$/.exec(label);
  const name = match?.[1]?.trim() || label;
  const suffix = match?.[2];
  const words = name.split(/\s+/).filter(Boolean);
  let wrapped = name;
  if (words.length === 2) {
    wrapped = words.join('\n');
  } else if (words.length > 2) {
    const mid = Math.ceil(words.length / 2);
    wrapped = `${words.slice(0, mid).join(' ')}\n${words.slice(mid).join(' ')}`;
  }
  return suffix ? `${wrapped}\n${suffix}` : wrapped;
}
