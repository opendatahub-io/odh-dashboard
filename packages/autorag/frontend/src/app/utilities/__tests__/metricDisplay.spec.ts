import type { AutoRAGEvaluationMetricResult } from '~/app/types/autoragPattern';
import {
  formatEvaluatorLabel,
  getMetricDescription,
  groupMetricsByEvaluator,
} from '~/app/utilities/metricDisplay';
import { METRIC_DESCRIPTIONS } from '~/app/utilities/const';

const metric = (
  name: string,
  evaluator: string,
  score: number | null = 0.5,
): AutoRAGEvaluationMetricResult => ({ name, evaluator, score });

describe('getMetricDescription', () => {
  it('should return the shared description for known metric keys', () => {
    expect(getMetricDescription('answer_correctness')).toBe(METRIC_DESCRIPTIONS.answer_correctness);
  });

  it('should look up descriptions case-insensitively', () => {
    expect(getMetricDescription('Answer_Correctness')).toBe(METRIC_DESCRIPTIONS.answer_correctness);
  });

  it('should return a description for Ragas answer relevancy', () => {
    expect(getMetricDescription('answer_relevancy')).toBe(METRIC_DESCRIPTIONS.answer_relevancy);
  });

  it('should return undefined for unknown metrics', () => {
    expect(getMetricDescription('unknown_metric')).toBeUndefined();
  });

  it('should return undefined for inherited object property names', () => {
    expect(getMetricDescription('__proto__')).toBeUndefined();
    expect(getMetricDescription('constructor')).toBeUndefined();
    expect(getMetricDescription('toString')).toBeUndefined();
  });
});

describe('formatEvaluatorLabel', () => {
  it('should use display names for known evaluators', () => {
    expect(formatEvaluatorLabel('unitxt')).toBe('Unitxt');
    expect(formatEvaluatorLabel('ragas')).toBe('Ragas');
    expect(formatEvaluatorLabel('custom')).toBe('Custom');
    expect(formatEvaluatorLabel('judge')).toBe('Judge');
  });

  it('should title-case unknown evaluators', () => {
    expect(formatEvaluatorLabel('deepeval')).toBe('Deepeval');
  });

  it('should label missing evaluators as Other', () => {
    expect(formatEvaluatorLabel('')).toBe('Other');
  });

  it('should title-case inherited object property names as unknown evaluators', () => {
    expect(formatEvaluatorLabel('__proto__')).toBe('__proto__');
    expect(formatEvaluatorLabel('constructor')).toBe('Constructor');
    expect(formatEvaluatorLabel('toString')).toBe('ToString');
  });
});

describe('groupMetricsByEvaluator', () => {
  it('should group metrics and order known evaluators first', () => {
    const grouped = groupMetricsByEvaluator([
      metric('overall_score', 'custom'),
      metric('faithfulness', 'unitxt'),
      metric('answer_relevancy', 'ragas'),
      metric('faithfulness', 'judge'),
    ]);

    expect(grouped.map((group) => group.label)).toEqual(['Unitxt', 'Ragas', 'Judge', 'Custom']);
    expect(grouped[0].metrics).toEqual([metric('faithfulness', 'unitxt')]);
    expect(grouped[1].metrics).toEqual([metric('answer_relevancy', 'ragas')]);
  });

  it('should keep unknown evaluators after the known set', () => {
    const grouped = groupMetricsByEvaluator([
      metric('overall_score', 'custom'),
      metric('bleu', 'deepeval'),
    ]);

    expect(grouped.map((group) => group.evaluator)).toEqual(['custom', 'deepeval']);
  });

  it('should merge evaluators that differ only by case and keep the first original name', () => {
    const grouped = groupMetricsByEvaluator([
      metric('faithfulness', 'Unitxt'),
      metric('answer_correctness', 'unitxt'),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].evaluator).toBe('Unitxt');
    expect(grouped[0].label).toBe('Unitxt');
    expect(grouped[0].metrics).toEqual([
      metric('faithfulness', 'Unitxt'),
      metric('answer_correctness', 'unitxt'),
    ]);
  });

  it('should treat surrounding whitespace as the same evaluator', () => {
    const grouped = groupMetricsByEvaluator([
      metric('faithfulness', 'unitxt'),
      metric('answer_correctness', ' UNITXT '),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].evaluator).toBe('unitxt');
    expect(grouped[0].metrics).toHaveLength(2);
  });

  it('should group missing evaluators under other', () => {
    const grouped = groupMetricsByEvaluator([metric('overall_score', '')]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].evaluator).toBe('other');
    expect(grouped[0].label).toBe('Other');
  });
});
