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
import { getBenchmarkDisplayName } from '~/app/utilities/evaluationUtils';

type BenchmarkResultCardProps = {
  benchmarkId: string;
  benchmarkIndex?: number;
  job: EvaluationJob;
  isSelected?: boolean;
  onClick?: () => void;
};

const BenchmarkResultCard: React.FC<BenchmarkResultCardProps> = ({
  benchmarkId,
  benchmarkIndex,
  job,
  isSelected,
  onClick,
}) => {
  const result = job.results.benchmarks?.find(
    (b) =>
      b.id === benchmarkId &&
      (benchmarkIndex === undefined || b.benchmark_index === benchmarkIndex),
  );
  const passStatus = result?.test?.pass;
  const cardKey = benchmarkIndex !== undefined ? `${benchmarkId}-${benchmarkIndex}` : benchmarkId;

  return (
    <Card
      isSelectable={!!onClick}
      isSelected={isSelected}
      isCompact
      data-testid={`benchmark-result-card-${cardKey}`}
      style={{ minWidth: 200 }}
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
              <Content component="p" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {getBenchmarkDisplayName(benchmarkId)}
              </Content>
            </FlexItem>
            <FlexItem>
              <Content
                component="small"
                style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
              >
                {benchmarkId}
              </Content>
            </FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>
      <CardBody>
        {passStatus != null && (
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
            data-testid={`benchmark-pass-label-${benchmarkId}`}
          >
            {passStatus ? 'Pass' : 'Fail'}
          </Label>
        )}
      </CardBody>
    </Card>
  );
};

export default BenchmarkResultCard;
