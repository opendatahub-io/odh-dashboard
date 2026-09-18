import React from 'react';
import type { AutoragPattern, MetricReference, TabContentProps } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';
import { getObjectiveMetric } from '~/app/utilities/metricUtils';
import KeyValueList from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
import ComparisonKeyValueList from '~/app/components/run-results/PatternDetailsModal/components/ComparisonKeyValueList';
import ConfidenceIntervalChart from '~/app/components/run-results/PatternDetailsModal/components/ConfidenceIntervalChart';

export function buildTopLevelFields(
  pattern: AutoragPattern,
  optimizationMetric?: MetricReference,
): Record<string, unknown> {
  const objectiveMean = optimizationMetric
    ? getObjectiveMetric(pattern, optimizationMetric)?.scores.mean
    : getObjectiveMetric(pattern)?.scores.mean;
  const finalScore =
    typeof objectiveMean === 'number' && Number.isFinite(objectiveMean) ? objectiveMean : 'N/A';

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
  optimizationMetric,
  onChangeComparisonPattern,
}) => {
  const primaryFields = buildTopLevelFields(primaryPattern.pattern, optimizationMetric);

  if (!comparisonPattern) {
    return (
      <>
        <KeyValueList entries={primaryFields} />
        <ConfidenceIntervalChart scores={primaryPattern.pattern.evaluation.metrics} />
      </>
    );
  }

  const comparisonFields = buildTopLevelFields(comparisonPattern.pattern, optimizationMetric);

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
        scores={primaryPattern.pattern.evaluation.metrics}
        comparisonScores={comparisonPattern.pattern.evaluation.metrics}
        primaryLabel={formatPatternName(primaryPattern.pattern.name)}
        comparisonLabel={formatPatternName(comparisonPattern.pattern.name)}
      />
    </>
  );
};

export default PatternInformationTab;
