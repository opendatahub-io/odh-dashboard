import * as React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import { EvaluationJob } from '~/app/types';
import { getBenchmarkDisplayName, getBenchmarkResultScore } from '~/app/utilities/evaluationUtils';
import './BenchmarkResultCard.scss';

type BenchmarkResultCardProps = {
  benchmarkId: string;
  benchmarkIndex?: number;
  occurrenceIndex: number;
  job: EvaluationJob;
  isSelected?: boolean;
  onClick?: () => void;
};

const BenchmarkResultCard: React.FC<BenchmarkResultCardProps> = ({
  benchmarkId,
  benchmarkIndex,
  occurrenceIndex,
  job,
  isSelected,
  onClick,
}) => {
  const resolvedIndex = benchmarkIndex ?? occurrenceIndex;
  const result = job.results.benchmarks?.find(
    (b, idx) => b.id === benchmarkId && (b.benchmark_index ?? idx) === resolvedIndex,
  );
  const score = getBenchmarkResultScore(job, benchmarkId, resolvedIndex);
  const passStatus = result?.test?.pass;
  const cardKey = `${benchmarkId}-${resolvedIndex}`;

  return (
    <Card
      className="evalhub-benchmark-result-card"
      isSelectable={!!onClick}
      isSelected={isSelected}
      isCompact
      data-testid={`benchmark-result-card-${cardKey}`}
    >
      <CardHeader
        selectableActions={
          onClick
            ? {
                selectableActionId: `benchmark-select-${cardKey}`,
                selectableActionAriaLabelledby: `benchmark-label-${cardKey}`,
                name: 'benchmark-selection',
                variant: 'single',
                isChecked: isSelected,
                onChange: onClick,
              }
            : undefined
        }
      >
        <CardTitle id={`benchmark-label-${cardKey}`}>
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
            <FlexItem>
              <Content component="p" className="pf-v6-u-font-weight-bold">
                {getBenchmarkDisplayName(benchmarkId)}
              </Content>
            </FlexItem>
            <FlexItem>
              <Content component="p" className="evalhub-benchmark-result-card__subtitle">
                {benchmarkId}
              </Content>
            </FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
          {score !== '-' && (
            <FlexItem>
              <Content
                component="p"
                className="pf-v6-u-font-size-xl pf-v6-u-font-weight-bold"
                data-testid={`benchmark-score-${cardKey}`}
              >
                {score}
              </Content>
            </FlexItem>
          )}
          {passStatus != null && (
            <FlexItem>
              <Label
                variant="outline"
                color={passStatus ? 'green' : 'red'}
                icon={
                  passStatus ? (
                    <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
                  ) : (
                    <TimesCircleIcon color="var(--pf-t--global--color--status--danger--default)" />
                  )
                }
                data-testid={`benchmark-pass-label-${cardKey}`}
              >
                {passStatus ? 'Pass' : 'Fail'}
              </Label>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
};

export default BenchmarkResultCard;
