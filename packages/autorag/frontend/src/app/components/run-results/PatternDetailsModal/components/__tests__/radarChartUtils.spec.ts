import {
  collectAllMetricNames,
  formatRadarLabel,
  metricValues,
} from '~/app/components/run-results/PatternDetailsModal/components/radarChartUtils';
import type { AutoRAGEvaluationMetricResult, MetricReference } from '~/app/types/autoragPattern';

const metric = (
  name: string,
  evaluator: string,
  score: number | null,
): AutoRAGEvaluationMetricResult => ({ name, evaluator, score });

describe('radarChartUtils', () => {
  it('should preserve duplicate metric names from different evaluators', () => {
    expect(
      collectAllMetricNames([
        { metrics: [metric('faithfulness', 'unitxt', 0.8), metric('faithfulness', 'judge', 0.7)] },
      ]),
    ).toEqual([
      { name: 'faithfulness', evaluator: 'unitxt' },
      { name: 'faithfulness', evaluator: 'judge' },
    ]);
  });

  it('should leave null and non-finite scores unavailable instead of plotting zero', () => {
    expect(
      metricValues(
        [metric('faithfulness', 'unitxt', null), metric('answer_correctness', 'unitxt', NaN)],
        [
          { name: 'faithfulness', evaluator: 'unitxt' },
          { name: 'answer_correctness', evaluator: 'unitxt' },
        ] satisfies MetricReference[],
      ),
    ).toEqual([undefined, undefined]);
  });

  it('should preserve finite metric scores', () => {
    expect(
      metricValues(
        [metric('faithfulness', 'unitxt', 0.8)],
        [{ name: 'faithfulness', evaluator: 'unitxt' }],
      ),
    ).toEqual([0.8]);
  });

  it('should leave duplicate normalized metric identities unavailable', () => {
    expect(
      metricValues(
        [metric('faithfulness', 'unitxt', 0.8), metric(' Faithfulness ', ' UNITXT ', 0.9)],
        [{ name: 'faithfulness', evaluator: 'unitxt' }],
      ),
    ).toEqual([undefined]);
  });

  it('should place evaluator suffixes on their own line so long radar labels wrap', () => {
    expect(formatRadarLabel('Context correctness (unitxt)')).toBe('Context\ncorrectness\n(unitxt)');
  });

  it('should wrap two-word metric names without a suffix', () => {
    expect(formatRadarLabel('Context correctness')).toBe('Context\ncorrectness');
  });

  it('should tolerate multiple spaces before the evaluator suffix', () => {
    expect(formatRadarLabel('Context correctness  (unitxt)')).toBe(
      'Context\ncorrectness\n(unitxt)',
    );
  });

  it('should treat the last trailing parenthesized group as the suffix', () => {
    expect(formatRadarLabel('a (b) (c)')).toBe('a\n(b)\n(c)');
  });

  it('should wrap a parenthesized group mid-string as part of the name', () => {
    expect(formatRadarLabel('(x) y')).toBe('(x)\ny');
  });

  it('should not extract an empty parenthesized group as the suffix', () => {
    expect(formatRadarLabel('foo ()')).toBe('foo\n()');
  });

  it('should not extract a suffix from unbalanced trailing parens', () => {
    expect(formatRadarLabel('a (b))')).toBe('a\n(b))');
  });

  it('should keep single-word names on one line above the suffix', () => {
    expect(formatRadarLabel('Score (unitxt)')).toBe('Score\n(unitxt)');
  });

  it('should complete a large adversarial label without quadratic backtracking', () => {
    const label = ' (a'.repeat(65536); // 256 KiB, no closing paren
    const start = Date.now();
    const result = formatRadarLabel(label);
    const elapsed = Date.now() - start;
    expect(typeof result).toBe('string');
    expect(elapsed).toBeLessThan(1000);
  });
});
