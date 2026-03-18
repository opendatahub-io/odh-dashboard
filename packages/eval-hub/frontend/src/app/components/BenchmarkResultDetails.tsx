import * as React from 'react';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Icon,
  Label,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import { EvaluationJob } from '~/app/types';
import { getBenchmarkDisplayName } from '~/app/utilities/evaluationUtils';

type BenchmarkResultDetailsProps = {
  benchmarkId: string;
  job: EvaluationJob;
};

const BenchmarkResultDetails: React.FC<BenchmarkResultDetailsProps> = ({ benchmarkId, job }) => {
  const result = job.results.benchmarks?.find((b) => b.id === benchmarkId);
  const benchmarkConfig = job.benchmarks?.find((b) => b.id === benchmarkId);

  if (!result) {
    return null;
  }

  const passStatus = result.test?.pass;
  const primaryMetric = benchmarkConfig?.primary_score?.metric ?? '-';
  const threshold = benchmarkConfig?.pass_criteria?.threshold ?? job.pass_criteria?.threshold;

  return (
    <div data-testid={`benchmark-details-${benchmarkId}`}>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapSm' }}
        className="pf-v6-u-mb-xs"
      >
        <FlexItem>
          <Title headingLevel="h3">{getBenchmarkDisplayName(benchmarkId)}</Title>
        </FlexItem>
        {passStatus != null && (
          <FlexItem>
            <Label
              color={passStatus ? 'green' : 'red'}
              icon={<Icon isInline>{passStatus ? <CheckCircleIcon /> : <TimesCircleIcon />}</Icon>}
              data-testid={`details-pass-label-${benchmarkId}`}
            >
              {passStatus ? 'Pass' : 'Fail'}
            </Label>
          </FlexItem>
        )}
      </Flex>
      <Content
        component="small"
        className="pf-v6-u-mb-sm"
        style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
      >
        {benchmarkId}
      </Content>

      <DescriptionList
        isHorizontal
        isCompact
        horizontalTermWidthModifier={{ default: '12ch', lg: '20ch' }}
        className="pf-v6-u-mt-md pf-v6-u-mb-lg"
        data-testid="benchmark-details-info"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Primary metric</DescriptionListTerm>
          <DescriptionListDescription>{primaryMetric}</DescriptionListDescription>
        </DescriptionListGroup>
        {threshold != null && (
          <DescriptionListGroup>
            <DescriptionListTerm>Benchmark threshold</DescriptionListTerm>
            <DescriptionListDescription>{threshold}</DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
    </div>
  );
};

export default BenchmarkResultDetails;
