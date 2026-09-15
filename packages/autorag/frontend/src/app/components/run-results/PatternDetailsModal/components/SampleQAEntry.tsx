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
  Stack,
  StackItem,
} from '@patternfly/react-core';
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';
import { formatMetricName, formatMetricValue } from '~/app/utilities/utils';
import ScoreRadarChart from './ScoreRadarChart';
import { metricIdentity } from './radarChartUtils';

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
}> = ({ metrics, testId }) => (
  <Stack hasGutter data-testid={testId}>
    {metrics.map((metric) => (
      <StackItem key={metricIdentity(metric)}>
        <Content component={ContentVariants.small}>
          <strong>
            {formatMetricName(metric.name)} ({metric.evaluator}):{' '}
            {typeof metric.score === 'number' && Number.isFinite(metric.score)
              ? formatMetricValue(metric.score)
              : 'N/A'}
          </strong>
        </Content>
      </StackItem>
    ))}
  </Stack>
);

const SampleQAEntry: React.FC<{
  result: AutoRAGEvaluationResult;
  questionNumber: number;
  allMetricNames: string[];
}> = ({ result, questionNumber, allMetricNames }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card isCompact data-testid={`qa-entry-${result.question_id}`}>
      <CardHeader>
        <CardTitle>Sample question {questionNumber}</CardTitle>
      </CardHeader>
      <CardBody>
        <Flex>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Content component={ContentVariants.small}>
              <strong>Question</strong>
            </Content>
            <Content component={ContentVariants.p} className="autorag-pre-wrap">
              {result.question}
            </Content>
            <ScoreRadarChart metrics={result.metrics} allMetricNames={allMetricNames} />
            <MetricScores
              metrics={result.metrics}
              testId={`qa-metric-scores-${result.question_id}`}
            />
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
      </CardBody>
    </Card>
  );
};

export default SampleQAEntry;
