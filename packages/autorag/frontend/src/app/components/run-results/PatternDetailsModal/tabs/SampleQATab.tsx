import React from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  ContentVariants,
  ExpandableSection,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import type { AutoRAGEvaluationResult, TabContentProps } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';
import SampleQAEntry from '~/app/components/run-results/PatternDetailsModal/components/SampleQAEntry';
import ComparisonRadarChart from '~/app/components/run-results/PatternDetailsModal/components/ComparisonRadarChart';

const ComparisonQAEntry: React.FC<{
  primaryResult: AutoRAGEvaluationResult;
  comparisonResult?: AutoRAGEvaluationResult;
  primaryLabel: string;
  comparisonLabel: string;
  onChangeComparisonPattern?: () => void;
}> = ({
  primaryResult,
  comparisonResult,
  primaryLabel,
  comparisonLabel,
  onChangeComparisonPattern,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card isCompact data-testid={`qa-entry-${primaryResult.question_id}`}>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Content component={ContentVariants.small}>
              <strong>Question</strong>
            </Content>
            <Content component={ContentVariants.p} className="autorag-pre-wrap">
              {primaryResult.question}
            </Content>
          </StackItem>
          {comparisonResult && (
            <StackItem>
              <ComparisonRadarChart
                primaryScores={primaryResult.scores}
                primaryLabel={primaryLabel}
                comparisonScores={comparisonResult.scores}
                comparisonLabel={comparisonLabel}
              />
            </StackItem>
          )}
          <StackItem>
            <Grid hasGutter>
              <GridItem span={6} data-testid={`qa-primary-answer-${primaryResult.question_id}`}>
                <Content component={ContentVariants.small}>
                  <strong>Answer ({primaryLabel})</strong>
                </Content>
                <Content component={ContentVariants.p} className="autorag-pre-wrap">
                  {primaryResult.answer}
                </Content>
              </GridItem>
              <GridItem span={6} data-testid={`qa-comparison-answer-${primaryResult.question_id}`}>
                <Content component={ContentVariants.small}>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                    <FlexItem>
                      <strong>Answer ({comparisonLabel})</strong>
                    </FlexItem>
                    {onChangeComparisonPattern && (
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          icon={<SyncAltIcon />}
                          onClick={onChangeComparisonPattern}
                          data-testid="change-comparison-pattern-qa"
                        >
                          Change
                        </Button>
                      </FlexItem>
                    )}
                  </Flex>
                </Content>
                <Content component={ContentVariants.p} className="autorag-pre-wrap">
                  {comparisonResult?.answer ?? '\u2014'}
                </Content>
              </GridItem>
            </Grid>
          </StackItem>
          <StackItem>
            <ExpandableSection
              toggleText={`View expected answer (${primaryResult.correct_answers.length})`}
              isExpanded={isExpanded}
              onToggle={(_e, expanded) => setIsExpanded(expanded)}
              isIndented
              data-testid={`qa-expected-answers-${primaryResult.question_id}`}
            >
              <Stack hasGutter>
                {primaryResult.correct_answers.map((answer, i) => (
                  <StackItem key={`answer-${primaryResult.question_id}-${i}`}>
                    <Content component={ContentVariants.small}>
                      <strong>Expected answer {i + 1}</strong>
                    </Content>
                    <Content component={ContentVariants.p} className="autorag-pre-wrap">
                      {answer}
                    </Content>
                  </StackItem>
                ))}
              </Stack>
            </ExpandableSection>
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
};

const SampleQATab: React.FC<TabContentProps> = ({
  primaryPattern,
  comparisonPattern,
  onChangeComparisonPattern,
}) => {
  if (
    primaryPattern.isEvaluationLoading ||
    (comparisonPattern && comparisonPattern.isEvaluationLoading)
  ) {
    return <Skeleton screenreaderText="Loading evaluation results" />;
  }

  const primaryResults = primaryPattern.evaluationResults ?? [];

  if (!comparisonPattern) {
    return (
      <Stack hasGutter>
        {primaryResults.map((result, index) => (
          <StackItem key={`qa-${result.question_id || index}`}>
            <SampleQAEntry result={result} />
          </StackItem>
        ))}
      </Stack>
    );
  }

  const comparisonResults = comparisonPattern.evaluationResults ?? [];
  const comparisonByQuestionId = new Map(
    comparisonResults
      .filter((r): r is typeof r & { question_id: string } => !!r.question_id)
      .map((r) => [r.question_id, r]),
  );
  const primaryLabel = formatPatternName(primaryPattern.pattern.name);
  const comparisonLabel = formatPatternName(comparisonPattern.pattern.name);

  return (
    <Stack hasGutter>
      {primaryResults.map((primaryResult, index) => (
        <StackItem key={`qa-${primaryResult.question_id || index}`}>
          <ComparisonQAEntry
            primaryResult={primaryResult}
            comparisonResult={
              primaryResult.question_id
                ? comparisonByQuestionId.get(primaryResult.question_id)
                : comparisonResults[index]
            }
            primaryLabel={primaryLabel}
            comparisonLabel={comparisonLabel}
            onChangeComparisonPattern={onChangeComparisonPattern}
          />
        </StackItem>
      ))}
    </Stack>
  );
};

export default SampleQATab;
