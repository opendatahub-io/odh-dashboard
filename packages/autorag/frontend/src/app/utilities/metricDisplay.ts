import type { AutoRAGEvaluationMetricResult } from '~/app/types/autoragPattern';
import { METRIC_DESCRIPTIONS } from '~/app/utilities/const';

const EVALUATOR_LABELS: Record<string, string> = {
  unitxt: 'Unitxt',
  ragas: 'Ragas',
  custom: 'Custom',
  judge: 'Judge',
};

const EVALUATOR_ORDER = ['unitxt', 'ragas', 'judge', 'custom'];

/* eslint-disable camelcase */
const METRIC_DESCRIPTION_ALIASES: Record<string, string> = {
  answer_relevancy: 'answer_relevance',
};
/* eslint-enable camelcase */

export const getMetricDescription = (metricKey: string): string | undefined => {
  const key = metricKey.toLowerCase();
  return METRIC_DESCRIPTIONS[key] ?? METRIC_DESCRIPTIONS[METRIC_DESCRIPTION_ALIASES[key]];
};

export const formatEvaluatorLabel = (evaluator: string): string => {
  if (!evaluator) {
    return 'Other';
  }
  const known = EVALUATOR_LABELS[evaluator.toLowerCase()];
  if (known) {
    return known;
  }
  return evaluator.charAt(0).toUpperCase() + evaluator.slice(1);
};

export type MetricEvaluatorGroup = {
  evaluator: string;
  label: string;
  metrics: AutoRAGEvaluationMetricResult[];
};

export const groupMetricsByEvaluator = (
  metrics: AutoRAGEvaluationMetricResult[],
): MetricEvaluatorGroup[] => {
  const groups = new Map<string, { evaluator: string; metrics: AutoRAGEvaluationMetricResult[] }>();

  metrics.forEach((metric) => {
    const originalEvaluator = metric.evaluator.trim() || 'other';
    const key = originalEvaluator.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.metrics.push(metric);
    } else {
      groups.set(key, { evaluator: originalEvaluator, metrics: [metric] });
    }
  });

  return Array.from(groups.entries())
    .toSorted(([a], [b]) => {
      const orderA = EVALUATOR_ORDER.indexOf(a);
      const orderB = EVALUATOR_ORDER.indexOf(b);
      const rankA = orderA === -1 ? EVALUATOR_ORDER.length : orderA;
      const rankB = orderB === -1 ? EVALUATOR_ORDER.length : orderB;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.localeCompare(b);
    })
    .map(([, group]) => ({
      evaluator: group.evaluator,
      label: formatEvaluatorLabel(group.evaluator),
      metrics: group.metrics,
    }));
};
