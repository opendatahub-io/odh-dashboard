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
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import type { ScoreType, TabContentProps } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';
import KeyValueList from '~/app/components/run-results/PatternDetailsModal/components/KeyValueList';
import ScoresList, {
  scoreTypeLabels,
} from '~/app/components/run-results/PatternDetailsModal/components/ScoresList';
import ComparisonColumnHeader from '~/app/components/run-results/PatternDetailsModal/components/ComparisonColumnHeader';

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

const ScoreTypeSelector: React.FC<{
  scoreType: ScoreType;
  onScoreTypeChange?: (type: ScoreType) => void;
}> = ({ scoreType, onScoreTypeChange }) => (
  <DescriptionList isHorizontal>
    <DescriptionListGroup>
      <DescriptionListTerm>Score type</DescriptionListTerm>
      <DescriptionListDescription>
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
      </DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);

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
          <ScoreTypeSelector scoreType={scoreType} onScoreTypeChange={onScoreTypeChange} />
        </StackItem>
        <StackItem>
          <ScoresList scores={primaryPattern.pattern.scores} scoreType={scoreType} />
        </StackItem>
      </Stack>
    );
  }

  const comparisonFields = buildTopLevelFields(comparisonPattern.pattern);

  return (
    <Stack hasGutter>
      <StackItem>
        <Grid hasGutter>
          <GridItem span={6}>
            <ComparisonColumnHeader
              patternName={primaryPattern.pattern.name}
              rank={primaryPattern.rank}
              label="selected pattern"
              data-testid="comparison-column-header-primary"
            />
          </GridItem>
          <GridItem span={6}>
            <ComparisonColumnHeader
              patternName={comparisonPattern.pattern.name}
              rank={comparisonPattern.rank}
              onChangeClick={onChangeComparisonPattern}
              data-testid="comparison-column-header-comparison"
            />
          </GridItem>
        </Grid>
      </StackItem>
      <StackItem>
        <ScoreTypeSelector scoreType={scoreType} onScoreTypeChange={onScoreTypeChange} />
      </StackItem>
      <StackItem>
        <Grid hasGutter>
          <GridItem span={6}>
            <KeyValueList entries={primaryFields} />
          </GridItem>
          <GridItem span={6}>
            <KeyValueList entries={comparisonFields} />
          </GridItem>
        </Grid>
      </StackItem>
      <StackItem>
        <Grid hasGutter>
          <GridItem span={6}>
            <ScoresList
              scores={primaryPattern.pattern.scores}
              scoreType={scoreType}
              variant="primary"
            />
          </GridItem>
          <GridItem span={6}>
            <ScoresList
              scores={comparisonPattern.pattern.scores}
              scoreType={scoreType}
              variant="comparison"
            />
          </GridItem>
        </Grid>
      </StackItem>
    </Stack>
  );
};

export default PatternInformationTab;
