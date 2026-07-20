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
import ScoreRadarChart from './ScoreRadarChart';

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
          </FlexItem>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default SampleQAEntry;
