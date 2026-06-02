import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Progress,
  ProgressMeasureLocation,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import type { ScoreType, TabContentProps } from '~/app/types/autoragPattern';
import { formatPatternName, humanize } from '~/app/utilities/utils';
import KeyValueList from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
import ComparisonKeyValueList from '~/app/components/run-results/PatternDetailsModal/components/ComparisonKeyValueList';
import ScoresList, {
  scoreTypeLabels,
} from '~/app/components/run-results/PatternDetailsModal/components/ScoresList';

function buildTopLevelFields(pattern: {
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

const ScoreTypeContent: React.FC<{
  scoreType: ScoreType;
  onScoreTypeChange?: (type: ScoreType) => void;
}> = ({ scoreType, onScoreTypeChange }) => (
  <Flex gap={{ default: 'gapLg' }}>
    {(['mean', 'ci_high', 'ci_low'] satisfies ScoreType[]).map((type) => (
      <FlexItem key={type}>
        <Radio
          id={`score-type-${type}`}
          name="score-type"
          label={scoreTypeLabels[type]}
          isChecked={scoreType === type}
          onChange={() => onScoreTypeChange?.(type)}
          data-testid={`score-type-${type}`}
        />
      </FlexItem>
    ))}
  </Flex>
);

/** Score type selector rendered as a DescriptionListGroup. */
const ScoreTypeSelectorGroup: React.FC<{
  scoreType: ScoreType;
  onScoreTypeChange?: (type: ScoreType) => void;
}> = (props) => (
  <DescriptionListGroup>
    <DescriptionListTerm>Score type</DescriptionListTerm>
    <DescriptionListDescription>
      <ScoreTypeContent {...props} />
    </DescriptionListDescription>
  </DescriptionListGroup>
);

/** Renders a score value as a progress bar or "N/A". */
const ScoreValue: React.FC<{
  value: number | null;
  variant: 'primary' | 'comparison';
  testId: string;
}> = ({ value, variant, testId }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ci_high/ci_low can be null at runtime
  if (value === null) {
    return <>N/A</>;
  }
  return (
    <Progress
      value={value * 100}
      title=""
      label={`${value.toFixed(3)}`}
      measureLocation={ProgressMeasureLocation.outside}
      className={variant === 'comparison' ? 'autorag-scores-list--comparison' : undefined}
      data-testid={testId}
    />
  );
};

const PatternInformationTab: React.FC<TabContentProps> = ({
  primaryPattern,
  comparisonPattern,
  scoreType,
  onScoreTypeChange,
  onChangeComparisonPattern,
}) => {
  const primaryFields = buildTopLevelFields(primaryPattern.pattern);

  if (!comparisonPattern) {
    return (
      <Stack hasGutter>
        <StackItem>
          <KeyValueList entries={primaryFields} />
        </StackItem>
        <StackItem>
          <DescriptionList isHorizontal>
            <ScoreTypeSelectorGroup scoreType={scoreType} onScoreTypeChange={onScoreTypeChange} />
          </DescriptionList>
        </StackItem>
        <StackItem>
          <ScoresList scores={primaryPattern.pattern.scores} scoreType={scoreType} />
        </StackItem>
      </Stack>
    );
  }

  const comparisonFields = buildTopLevelFields(comparisonPattern.pattern);
  const scoreKeys = Object.keys(primaryPattern.pattern.scores);

  return (
    <Stack hasGutter>
      <StackItem>
        <ComparisonKeyValueList
          primaryPattern={primaryPattern}
          comparisonPattern={comparisonPattern}
          primaryEntries={primaryFields}
          comparisonEntries={comparisonFields}
          onChangeComparisonPattern={onChangeComparisonPattern}
        >
          <ScoreTypeSelectorGroup scoreType={scoreType} onScoreTypeChange={onScoreTypeChange} />
        </ComparisonKeyValueList>
      </StackItem>

      {/* Score bars with shared row labels */}
      <StackItem>
        <DescriptionList isHorizontal className="autorag-comparison-list">
          {scoreKeys.map((key) => {
            const primaryScore = primaryPattern.pattern.scores[key];
            const comparisonScore = comparisonPattern.pattern.scores[key];
            const primaryValue = primaryScore?.[scoreType] ?? null;
            const comparisonValue = comparisonScore?.[scoreType] ?? null;

            return (
              <DescriptionListGroup key={key}>
                <DescriptionListTerm>
                  {humanize(key)} ({scoreTypeLabels[scoreType]})
                </DescriptionListTerm>
                <DescriptionListDescription>
                  <Grid hasGutter>
                    <GridItem span={6}>
                      <ScoreValue
                        value={primaryValue}
                        variant="primary"
                        testId={`score-progress-${key}-primary`}
                      />
                    </GridItem>
                    <GridItem span={6}>
                      <ScoreValue
                        value={comparisonValue}
                        variant="comparison"
                        testId={`score-progress-${key}-comparison`}
                      />
                    </GridItem>
                  </Grid>
                </DescriptionListDescription>
              </DescriptionListGroup>
            );
          })}
        </DescriptionList>
      </StackItem>
    </Stack>
  );
};

export default PatternInformationTab;
