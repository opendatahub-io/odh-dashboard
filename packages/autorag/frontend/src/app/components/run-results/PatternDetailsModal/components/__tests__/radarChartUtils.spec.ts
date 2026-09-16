import {
  collectAllMetricNames,
  metricValues,
} from '~/app/components/run-results/PatternDetailsModal/components/radarChartUtils';
import type { AutoRAGEvaluationMetricResult } from '~/app/types/autoragPattern';

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
    ).toEqual(['unitxt:faithfulness', 'judge:faithfulness']);
  });

  it('should leave null and non-finite scores unavailable instead of plotting zero', () => {
    expect(
      metricValues(
        [metric('faithfulness', 'unitxt', null), metric('answer_correctness', 'unitxt', NaN)],
        ['unitxt:faithfulness', 'unitxt:answer_correctness'],
      ),
    ).toEqual([undefined, undefined]);
  });

  it('should preserve finite metric scores', () => {
    expect(metricValues([metric('faithfulness', 'unitxt', 0.8)], ['unitxt:faithfulness'])).toEqual([
      0.8,
    ]);
  });
});
