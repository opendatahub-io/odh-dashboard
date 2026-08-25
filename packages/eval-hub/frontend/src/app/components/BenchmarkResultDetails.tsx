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
import { useProvider } from '~/app/hooks/useProvider';
import {
  formatAsPercentage,
  getBenchmarkDisplayName,
  getJobBenchmarks,
} from '~/app/utilities/evaluationUtils';
import AboutBenchmarkResultPopover from '~/app/components/AboutBenchmarkResultPopover';
import { getMetricDisplayName } from './benchmarkUtils';

type BenchmarkResultDetailsProps = {
  benchmarkId: string;
  benchmarkIndex: number;
  job: EvaluationJob;
};

const BenchmarkResultDetails: React.FC<BenchmarkResultDetailsProps> = ({
  benchmarkId,
  benchmarkIndex,
  job,
}) => {
  const result = job.results.benchmarks?.find(
    (b, idx) => b.id === benchmarkId && (b.benchmark_index ?? idx) === benchmarkIndex,
  );
  const benchmarkConfig = getJobBenchmarks(job).find(
    (b, idx) => b.id === benchmarkId && (b.benchmark_index ?? idx) === benchmarkIndex,
  );

  const providerId = benchmarkConfig?.provider_id ?? result?.provider_id;
  const { provider } = useProvider(providerId);

  if (!result) {
    return null;
  }

  const passStatus = result.test?.pass ?? null;
  const metricKeys = result.metrics ? Object.keys(result.metrics).toSorted() : [];
  const primaryMetricName =
    benchmarkConfig?.primary_score?.metric ?? (metricKeys.length > 0 ? metricKeys[0] : '-');
  const threshold =
    benchmarkConfig?.pass_criteria?.threshold ??
    job.pass_criteria?.threshold ??
    result.test?.threshold;

  const rawComplements = provider?.agent?.complements;
  const complements = Array.isArray(rawComplements) ? rawComplements : undefined;

  return (
    <div data-testid={`benchmark-details-${benchmarkId}-${benchmarkIndex}`}>
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
              data-testid={`details-pass-label-${benchmarkId}-${benchmarkIndex}`}
            >
              {passStatus ? 'Pass' : 'Fail'}
            </Label>
          </FlexItem>
        )}
        <FlexItem>
          <AboutBenchmarkResultPopover
            benchmarkId={benchmarkId}
            benchmarkIndex={benchmarkIndex}
            job={job}
            provider={provider}
          />
        </FlexItem>
      </Flex>
      <Content
        component="p"
        className="pf-v6-u-mb-md"
        style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
        data-testid="benchmark-provider-label"
      >
        {benchmarkId}
      </Content>

      <DescriptionList
        isHorizontal
        isCompact
        horizontalTermWidthModifier={{ default: 'max-content' }}
        style={{ rowGap: 'var(--pf-t--global--spacer--sm)' }}
        data-testid="benchmark-details-info"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Primary metric</DescriptionListTerm>
          <DescriptionListDescription>
            {primaryMetricName !== '-' ? getMetricDisplayName(primaryMetricName) : '-'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        {typeof threshold === 'number' && Number.isFinite(threshold) && (
          <DescriptionListGroup>
            <DescriptionListTerm>Benchmark threshold</DescriptionListTerm>
            <DescriptionListDescription>{formatAsPercentage(threshold)}</DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {complements?.length ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Related evaluations</DescriptionListTerm>
            <DescriptionListDescription data-testid="complementary-frameworks">
              {complements.map((c) => getBenchmarkDisplayName(c)).join(', ')}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}
      </DescriptionList>
    </div>
  );
};

export default BenchmarkResultDetails;
