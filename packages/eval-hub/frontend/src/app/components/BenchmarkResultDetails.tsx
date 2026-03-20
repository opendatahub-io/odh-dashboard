import * as React from 'react';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
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

  const benchmarkStatus = job.status.benchmarks?.find((b) => b.id === benchmarkId);
  const passStatus =
    result.test?.pass ??
    (benchmarkStatus?.status == null ? null : benchmarkStatus.status === 'completed');
  const metricKeys = result.metrics ? Object.keys(result.metrics).toSorted() : [];
  const primaryMetricName =
    benchmarkConfig?.primary_score?.metric ?? (metricKeys.length > 0 ? metricKeys[0] : '-');
  const threshold = benchmarkConfig?.pass_criteria?.threshold ?? job.pass_criteria?.threshold;
  const providerLabel = result.provider_id ?? benchmarkConfig?.provider_id;

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
              variant="outline"
              color={passStatus ? 'green' : 'red'}
              icon={
                passStatus ? (
                  <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
                ) : (
                  <TimesCircleIcon color="var(--pf-t--global--color--status--danger--default)" />
                )
              }
              data-testid={`details-pass-label-${benchmarkId}`}
            >
              {passStatus ? 'Pass' : 'Fail'}
            </Label>
          </FlexItem>
        )}
      </Flex>
      {providerLabel && (
        <Content
          component="small"
          className="pf-v6-u-mb-sm"
          style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
          data-testid="benchmark-provider-label"
        >
          {providerLabel}
        </Content>
      )}

      <DescriptionList
        isHorizontal
        isCompact
        horizontalTermWidthModifier={{ default: '12ch', lg: '20ch' }}
        className="pf-v6-u-mt-md pf-v6-u-mb-lg"
        data-testid="benchmark-details-info"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Primary metric</DescriptionListTerm>
          <DescriptionListDescription>{primaryMetricName}</DescriptionListDescription>
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
