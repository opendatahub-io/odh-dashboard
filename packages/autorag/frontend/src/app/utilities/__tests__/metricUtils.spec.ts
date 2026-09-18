/* eslint-disable camelcase */
import type { AutoragPattern, MetricReference } from '~/app/types/autoragPattern';
import {
  compareOptimizedMetricValues,
  computePatternRankMap,
  findMetric,
  formatMetricValue,
  getOptimizedScore,
  getObjectiveMetric,
  isPatternRankable,
  metricDomId,
  metricDomSuffix,
  metricKey,
  metricLabel,
  orderPatternsByLeaderboardRank,
  resolveBestPatternKey,
  resolveObjectiveReference,
} from '~/app/utilities/metricUtils';

const makePattern = (
  metrics: AutoragPattern['evaluation']['metrics'],
  name = 'pattern',
): AutoragPattern => ({
  name,
  iteration: 1,
  max_combinations: 1,
  duration_seconds: 1,
  settings: {} as AutoragPattern['settings'],
  evaluation: { metrics },
});

const makeMetric = (
  name: string,
  evaluator: string,
  mean: number | null,
  optimization_metric = false,
) => ({
  name,
  evaluator,
  scores: { mean, ci_low: null, ci_high: null },
  ...(optimization_metric ? { optimization_metric: true as const } : {}),
});

const makeRankPattern = (name: string, mean: number): AutoragPattern =>
  makePattern([makeMetric('overall_score', 'custom', mean, true)], name);

describe('metricUtils', () => {
  it('creates one normalized opaque key for evaluator/name references', () => {
    expect(metricKey({ name: ' Faithfulness ', evaluator: ' RAGAS ' })).toBe(
      'metric:["ragas","faithfulness"]',
    );
    expect(metricKey({ name: 'Faithfulness' })).toBe('metric:[null,"faithfulness"]');
    expect(metricKey({ name: 'Faithfulness', evaluator: '' })).toBe('metric:["","faithfulness"]');
  });

  it('normalizes metric DOM IDs without exposing unsafe identity characters', () => {
    expect(metricDomSuffix({ name: ' Faith:fulness ', evaluator: ' RAGAS ' })).toBe(
      'faith-fulness-ragas',
    );
    expect(metricDomId('metric-header', { name: ' Faithfulness ', evaluator: ' RAGAS ' })).toBe(
      'metric-header-faithfulness-ragas',
    );
  });

  it('renders labels with and without evaluator qualifiers', () => {
    expect(metricLabel({ name: 'faithfulness', evaluator: 'ragas' })).toBe(
      'Answer faithfulness (ragas)',
    );
    expect(metricLabel({ name: 'faithfulness' })).toBe('Answer faithfulness');
    expect(metricLabel({ name: ' Faithfulness ', evaluator: ' RAGAS ' })).toBe(
      'Answer faithfulness (RAGAS)',
    );
  });

  it('finds exact evaluator-qualified metrics and rejects ambiguous name-only matches', () => {
    const pattern = makePattern([
      makeMetric('Faithfulness', 'unitxt', 0.8),
      makeMetric('faithfulness', 'judge', 0.9),
    ]);

    expect(findMetric(pattern, { name: 'faithfulness', evaluator: 'UNITXT' })?.scores.mean).toBe(
      0.8,
    );
    expect(findMetric(pattern, { name: 'faithfulness' })).toBeUndefined();
    expect(findMetric(pattern, { name: 'missing', evaluator: 'unitxt' })).toBeUndefined();
  });

  it('preserves an explicit empty evaluator as an exact metric identity', () => {
    const emptyEvaluatorMetric = makeMetric('faithfulness', '', 0.8, true);
    const ragasMetric = makeMetric('faithfulness', 'ragas', 0.9);
    const pattern = makePattern([emptyEvaluatorMetric, ragasMetric]);

    expect(findMetric(pattern, { name: 'faithfulness', evaluator: '' })).toBe(emptyEvaluatorMetric);
    expect(getObjectiveMetric(pattern, { name: 'faithfulness', evaluator: '' })).toBe(
      emptyEvaluatorMetric,
    );
    expect(resolveObjectiveReference({ pattern }, 'faithfulness')).toEqual({
      name: 'faithfulness',
      evaluator: '',
    });
  });

  it('selects the single flagged objective metric when names are duplicated', () => {
    const unitxtMetric = makeMetric('faithfulness', 'unitxt', 0.6);
    const judgeMetric = makeMetric('faithfulness', 'judge', 0.9, true);
    const pattern = makePattern([unitxtMetric, judgeMetric]);

    expect(getObjectiveMetric(pattern, 'FAITHFULNESS')).toBe(judgeMetric);
  });

  it('uses an evaluator-qualified objective reference when markers select another evaluator', () => {
    const unitxtMetric = makeMetric('faithfulness', 'unitxt', 0.6);
    const judgeMetric = makeMetric('faithfulness', 'judge', 0.9, true);
    const pattern = makePattern([unitxtMetric, judgeMetric]);

    expect(getObjectiveMetric(pattern, { name: 'faithfulness', evaluator: 'unitxt' })).toBe(
      unitxtMetric,
    );
    expect(isPatternRankable(pattern, { name: 'faithfulness', evaluator: 'unitxt' })).toBe(true);
  });

  it('falls back to a unique objective metric when the pattern is not flagged', () => {
    const objectiveMetric = makeMetric('faithfulness', 'unitxt', 0.6);
    const pattern = makePattern([
      objectiveMetric,
      makeMetric('overall_score', 'custom', 0.9, true),
    ]);

    expect(getObjectiveMetric(pattern, 'faithfulness')).toBe(objectiveMetric);
    expect(isPatternRankable(pattern, 'faithfulness')).toBe(true);
  });

  it('rejects an objective when an exact identity is duplicated, even if only one is flagged', () => {
    const flaggedMetric = makeMetric('faithfulness', 'ragas', 0.9, true);
    const duplicateMetric = makeMetric(' Faithfulness ', ' RAGAS ', 0.1);
    const pattern = makePattern([flaggedMetric, duplicateMetric]);

    expect(getObjectiveMetric(pattern, 'faithfulness')).toBeUndefined();
    expect(isPatternRankable(pattern, 'faithfulness')).toBe(false);
  });

  it('resolves an evaluator only when all available objective metadata agrees', () => {
    const sameEvaluator = {
      first: makePattern([makeMetric('faithfulness', 'RAGAS', 0.8, true)]),
      second: makePattern([makeMetric('FAITHFULNESS', 'ragas', 0.9, true)]),
    };
    expect(resolveObjectiveReference(sameEvaluator, 'faithfulness')).toEqual({
      name: 'faithfulness',
      evaluator: 'RAGAS',
    });

    const missingEvaluator = {
      first: makePattern([makeMetric('faithfulness', '', 0.8, true)]),
      second: makePattern([makeMetric('faithfulness', 'ragas', 0.9, true)]),
    };
    expect(resolveObjectiveReference(missingEvaluator, 'faithfulness')).toEqual({
      name: 'faithfulness',
    });

    const conflictingEvaluator = {
      first: makePattern([makeMetric('faithfulness', 'ragas', 0.8, true)]),
      second: makePattern([makeMetric('faithfulness', 'unitxt', 0.9, true)]),
    };
    expect(resolveObjectiveReference(conflictingEvaluator, 'faithfulness')).toEqual({
      name: 'faithfulness',
    });
  });

  it('keeps ranking based on finite flagged objective values', () => {
    const patterns = {
      low: makePattern([makeMetric('faithfulness', 'ragas', 0.2, true)]),
      high: makePattern([makeMetric('faithfulness', 'unitxt', 0.9, true)]),
      invalid: makePattern([makeMetric('faithfulness', 'ragas', Number.NaN, true)]),
    };

    expect(isPatternRankable(patterns.low, 'faithfulness')).toBe(true);
    expect(isPatternRankable(patterns.invalid, 'faithfulness')).toBe(false);
    expect(computePatternRankMap(patterns, 'faithfulness')).toEqual({ high: 1, low: 2 });
    expect(resolveBestPatternKey(patterns, 'faithfulness')).toBe('high');
  });

  it('ranks unflagged patterns when their objective metric is uniquely named', () => {
    const patterns = {
      winner: makePattern([makeMetric('faithfulness', 'unitxt', 0.9, true)]),
      other: makePattern([makeMetric('faithfulness', 'unitxt', 0.6)]),
    };

    expect(computePatternRankMap(patterns, 'faithfulness')).toEqual({ winner: 1, other: 2 });
  });

  it('ranks unflagged same-named metrics using the selected evaluator', () => {
    const selectedPattern = makePattern([makeMetric('faithfulness', 'unitxt', 0.6, true)]);
    const unflaggedPattern = makePattern([
      makeMetric('faithfulness', 'unitxt', 0.9),
      makeMetric('faithfulness', 'judge', 0.1),
    ]);

    expect(
      computePatternRankMap(
        { selected: selectedPattern, unflagged: unflaggedPattern },
        { name: 'faithfulness', evaluator: 'unitxt' },
      ),
    ).toEqual({ unflagged: 1, selected: 2 });
    expect(
      resolveBestPatternKey(
        { selected: selectedPattern, unflagged: unflaggedPattern },
        { name: 'faithfulness', evaluator: 'unitxt' },
      ),
    ).toBe('unflagged');
  });

  it('formats non-finite metric values as N/A', () => {
    expect(formatMetricValue(Number.NaN)).toBe('N/A');
    expect(formatMetricValue(Number.POSITIVE_INFINITY)).toBe('N/A');
  });

  it.each([
    [0.12345, 3, '0.123'],
    [0.8, 2, '0.80'],
    [0.0001, 3, '1.000e-4'],
    [0, 3, '0.000'],
    ['N/A', 3, 'N/A'],
  ] as const)('formats metric value %s with precision %s', (value, precision, expected) => {
    expect(formatMetricValue(value, precision)).toBe(expected);
  });

  it('preserves a reference shape without adding an evaluator', () => {
    const reference: MetricReference = { name: 'faithfulness' };
    expect(resolveObjectiveReference({}, reference.name)).toEqual(reference);
  });

  describe('getOptimizedScore', () => {
    it('should return the optimization metric mean', () => {
      expect(getOptimizedScore(makeRankPattern('pattern', 0.85))).toBe(0.85);
    });

    it('should return 0 when the optimization metric mean is null', () => {
      const pattern = makePattern([makeMetric('overall_score', 'custom', null, true)]);
      expect(getOptimizedScore(pattern)).toBe(0);
    });
  });

  describe('metricLabel', () => {
    it('should format known metric keys with special casing', () => {
      expect(metricLabel({ name: 'faithfulness' })).toBe('Answer faithfulness');
      expect(metricLabel({ name: 'answer_correctness' })).toBe('Answer correctness');
      expect(metricLabel({ name: 'context_correctness' })).toBe('Context correctness');
      expect(metricLabel({ name: 'answer_relevancy' })).toBe('Answer relevancy');
      expect(metricLabel({ name: 'context_precision' })).toBe('Context precision');
      expect(metricLabel({ name: 'context_recall' })).toBe('Context recall');
      expect(metricLabel({ name: 'overall_score' })).toBe('Overall score');
    });

    it('should title-case unknown metric keys', () => {
      expect(metricLabel({ name: 'custom_metric' })).toBe('Custom Metric');
      expect(metricLabel({ name: 'my_special_score' })).toBe('My Special Score');
      expect(metricLabel({ name: 'bleu' })).toBe('Bleu');
    });
  });

  describe('computePatternRankMap', () => {
    it('should rank patterns by objective score descending', () => {
      expect(
        computePatternRankMap({
          low: makeRankPattern('low', 0.3),
          high: makeRankPattern('high', 0.9),
          mid: makeRankPattern('mid', 0.6),
        }),
      ).toEqual({ high: 1, mid: 2, low: 3 });
    });

    it('should assign contiguous ranks only to valid objective patterns', () => {
      expect(
        computePatternRankMap({
          high: makeRankPattern('high', 0.9),
          invalid: makePattern([]),
          low: makeRankPattern('low', 0.3),
        }),
      ).toEqual({ high: 1, low: 2 });
    });

    it('should keep duplicate display names independent by record key', () => {
      expect(
        computePatternRankMap({
          first: makeRankPattern('Shared name', 0.4),
          second: makeRankPattern('Shared name', 0.9),
        }),
      ).toEqual({ second: 1, first: 2 });
    });
  });

  describe('resolveBestPatternKey', () => {
    it('should return the rank-1 pattern key by objective score', () => {
      expect(
        resolveBestPatternKey({
          low: makeRankPattern('low', 0.3),
          high: makeRankPattern('high', 0.9),
          mid: makeRankPattern('mid', 0.6),
        }),
      ).toBe('high');
    });

    it('should return undefined for an empty or invalid patterns record', () => {
      expect(resolveBestPatternKey({})).toBeUndefined();
      expect(resolveBestPatternKey({ invalid: makePattern([]) })).toBeUndefined();
    });
  });

  describe('compareOptimizedMetricValues', () => {
    it('should sort higher numeric values first and N/A last', () => {
      expect(compareOptimizedMetricValues(0.9, 0.1)).toBeLessThan(0);
      expect(compareOptimizedMetricValues('N/A', 0.5)).toBeGreaterThan(0);
      expect(compareOptimizedMetricValues(0.5, 'N/A')).toBeLessThan(0);
      expect(compareOptimizedMetricValues('N/A', 'N/A')).toBe(0);
    });
  });

  describe('orderPatternsByLeaderboardRank', () => {
    it('should order by metric descending and pin the best pattern first', () => {
      const values: Record<string, number | string> = { a: 0.5, b: 0.9, c: 0.7 };
      expect(orderPatternsByLeaderboardRank(['a', 'b', 'c'], (key) => values[key], 'a')).toEqual([
        'a',
        'b',
        'c',
      ]);
    });
  });
});
