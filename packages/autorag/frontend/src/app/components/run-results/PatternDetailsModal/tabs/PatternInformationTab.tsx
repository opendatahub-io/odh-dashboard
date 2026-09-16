import React from 'react';
import type {
  AutoragPattern,
  AutoragPatternScores,
  TabContentProps,
} from '~/app/types/autoragPattern';
import {
  formatPatternName,
  getOptimizedScore,
  getRankableOptimizationMetric,
} from '~/app/utilities/utils';
import KeyValueList from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
import ComparisonKeyValueList from '~/app/components/run-results/PatternDetailsModal/components/ComparisonKeyValueList';
import ConfidenceIntervalChart from '~/app/components/run-results/PatternDetailsModal/components/ConfidenceIntervalChart';

function metricsToScores(pattern: AutoragPattern): AutoragPatternScores {
  return Object.fromEntries(pattern.evaluation.metrics.map((m) => [m.name, m.scores]));
}

export function buildTopLevelFields(
  pattern: AutoragPattern,
  optimizedMetric?: string,
): Record<string, unknown> {
  const finalScore = optimizedMetric
    ? (getRankableOptimizationMetric(pattern, optimizedMetric)?.scores.mean ?? 'N/A')
    : getOptimizedScore(pattern);

  return {
    name: formatPatternName(pattern.name),
    iteration: pattern.iteration,
    // eslint-disable-next-line camelcase
    max_combinations: pattern.max_combinations,
    // eslint-disable-next-line camelcase
    duration_seconds: pattern.duration_seconds,
    // eslint-disable-next-line camelcase
    final_score: finalScore,
  };
}

const PatternInformationTab: React.FC<TabContentProps> = ({
  primaryPattern,
  comparisonPattern,
  optimizedMetric,
  onChangeComparisonPattern,
}) => {
  const primaryFields = buildTopLevelFields(primaryPattern.pattern, optimizedMetric);

  if (!comparisonPattern) {
    return (
      <>
        <KeyValueList entries={primaryFields} />
        <ConfidenceIntervalChart scores={metricsToScores(primaryPattern.pattern)} />
      </>
    );
  }

  const comparisonFields = buildTopLevelFields(comparisonPattern.pattern, optimizedMetric);

  return (
    <>
      <ComparisonKeyValueList
        primaryPattern={primaryPattern}
        comparisonPattern={comparisonPattern}
        primaryEntries={primaryFields}
        comparisonEntries={comparisonFields}
        onChangeComparisonPattern={onChangeComparisonPattern}
      />
      <ConfidenceIntervalChart
        scores={metricsToScores(primaryPattern.pattern)}
        comparisonScores={metricsToScores(comparisonPattern.pattern)}
        primaryLabel={formatPatternName(primaryPattern.pattern.name)}
        comparisonLabel={formatPatternName(comparisonPattern.pattern.name)}
      />
    </>
  );
};

export default PatternInformationTab;
