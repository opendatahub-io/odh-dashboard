import {
  collectAllMetricNames,
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
});
