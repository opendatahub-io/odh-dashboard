import React from 'react';
import type { TabContentProps } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';
import KeyValueList from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
import ComparisonKeyValueList from '~/app/components/run-results/PatternDetailsModal/components/ComparisonKeyValueList';
import ConfidenceIntervalChart from '~/app/components/run-results/PatternDetailsModal/components/ConfidenceIntervalChart';

export function buildTopLevelFields(pattern: {
  name: string;
  iteration: number;
  max_combinations: number;
  duration_seconds: number;
  final_score: number;
}): Record<string, unknown> {
  return {
    name: formatPatternName(pattern.name),
    iteration: pattern.iteration,
    // eslint-disable-next-line camelcase
    max_combinations: pattern.max_combinations,
    // eslint-disable-next-line camelcase
    duration_seconds: pattern.duration_seconds,
    // eslint-disable-next-line camelcase
    final_score: pattern.final_score,
  };
}

const PatternInformationTab: React.FC<TabContentProps> = ({
  primaryPattern,
  comparisonPattern,
  onChangeComparisonPattern,
}) => {
  const primaryFields = buildTopLevelFields(primaryPattern.pattern);

  if (!comparisonPattern) {
    return (
      <>
        <KeyValueList entries={primaryFields} />
        <ConfidenceIntervalChart scores={primaryPattern.pattern.scores} />
      </>
    );
  }

  const comparisonFields = buildTopLevelFields(comparisonPattern.pattern);

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
        scores={primaryPattern.pattern.scores}
        comparisonScores={comparisonPattern.pattern.scores}
        primaryLabel={formatPatternName(primaryPattern.pattern.name)}
        comparisonLabel={formatPatternName(comparisonPattern.pattern.name)}
      />
    </>
  );
};

export default PatternInformationTab;
