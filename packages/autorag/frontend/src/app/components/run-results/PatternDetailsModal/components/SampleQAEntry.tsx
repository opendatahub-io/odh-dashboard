import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  ContentVariants,
  ExpandableSection,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import type { AutoRAGEvaluationResult, MetricReference } from '~/app/types/autoragPattern';
import {
  formatMetricValue,
  groupMetricsByKey,
  metricDomSuffix,
  metricKey,
  metricLabel,
} from '~/app/utilities/metricUtils';
import { getMetricDescription, groupMetricsByEvaluator } from '~/app/utilities/metricDisplay';
import InlineTooltip from '~/app/components/InlineTooltip';
import ScoreRadarChart from './ScoreRadarChart';

export const RetrievedContextSection: React.FC<{
  result: AutoRAGEvaluationResult;
  label?: string;
  testId?: string;
}> = ({ result, label, testId = `qa-retrieved-context-${result.question_id}` }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (result.answer_contexts.length === 0) {
    return null;
  }

  return (
    <ExpandableSection
      toggleText={
        label
          ? `Retrieved context (${label}) (${result.answer_contexts.length})`
          : `Retrieved context (${result.answer_contexts.length})`
      }
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
      isIndented
      data-testid={testId}
    >
      <Stack hasGutter>
        {result.answer_contexts.map((context, index) => (
          <StackItem key={`${context.document_key}-${index}`}>
            <Content component={ContentVariants.small}>
              <strong>Context {index + 1}</strong>
            </Content>
            <Content component={ContentVariants.p} className="autorag-pre-wrap">
              {context.text}
            </Content>
            <Content component={ContentVariants.small}>
              <strong>Document key:</strong> {context.document_key}
            </Content>
          </StackItem>
        ))}
      </Stack>
    </ExpandableSection>
  );
};

export const MetricScores: React.FC<{
  metrics: AutoRAGEvaluationResult['metrics'];
  testId?: string;
}> = ({ metrics, testId }) => {
  const groups = groupMetricsByEvaluator(metrics);
  const columnSpan: 4 | 6 | 12 = groups.length >= 3 ? 4 : groups.length === 2 ? 6 : 12;

  return (
    <Grid hasGutter data-testid={testId}>
      {groups.map((group) => (
        <GridItem
          key={group.evaluator}
          span={12}
          md={columnSpan}
          data-testid={`qa-metric-group-${group.evaluator}`}
          className="autorag-qa-metric-group"
        >
          <Content component={ContentVariants.small}>
            <strong>{group.label}</strong>
          </Content>
          <Stack>
            {Array.from(groupMetricsByKey(group.metrics).values()).map((metricGroup) => {
              const metric = metricGroup[0];
              const description = getMetricDescription(metric.name);
              const label = metricLabel({ name: metric.name });
              const rawScore = metricGroup.length === 1 ? metric.score : undefined;
              const score =
                typeof rawScore === 'number' && Number.isFinite(rawScore)
                  ? formatMetricValue(rawScore)
                  : 'N/A';
              return (
                <StackItem key={metricKey(metric)}>
                  <Content component={ContentVariants.small}>
                    <strong>
                      {description ? (
                        <InlineTooltip
                          text={label}
                          tooltip={description}
                          data-testid={`qa-metric-help-${metricDomSuffix(metric)}`}
                        />
                      ) : (
                        label
                      )}
                      {': '}
                      {score}
                    </strong>
                  </Content>
                </StackItem>
              );
            })}
          </Stack>
        </GridItem>
      ))}
    </Grid>
  );
};

const SampleQAEntry: React.FC<{
  result: AutoRAGEvaluationResult;
  questionNumber: number;
  allMetricNames: MetricReference[];
}> = ({ result, questionNumber, allMetricNames }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card isCompact data-testid={`qa-entry-${result.question_id}`}>
      <CardHeader>
        <CardTitle>Sample question {questionNumber}</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Flex>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Content component={ContentVariants.small}>
                  <strong>Question</strong>
                </Content>
                <Content component={ContentVariants.p} className="autorag-pre-wrap">
                  {result.question}
                </Content>
                <ScoreRadarChart metrics={result.metrics} allMetricNames={allMetricNames} />
              </FlexItem>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Content component={ContentVariants.small}>
                  <strong>Answer</strong>
                </Content>
                <Content component={ContentVariants.p} className="autorag-pre-wrap">
                  {result.answer}
                </Content>
                <ExpandableSection
                  toggleText={`View expected answer (${result.correct_answers.length})`}
                  isExpanded={isExpanded}
                  onToggle={(_e, expanded) => setIsExpanded(expanded)}
                  isIndented
                  data-testid={`qa-expected-answers-${result.question_id}`}
                >
                  <Stack hasGutter>
                    {result.correct_answers.map((answer, i) => (
                      <StackItem key={`answer-${result.question_id}-${i}`}>
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
                <RetrievedContextSection result={result} />
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <MetricScores
              metrics={result.metrics}
              testId={`qa-metric-scores-${result.question_id}`}
            />
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default SampleQAEntry;
