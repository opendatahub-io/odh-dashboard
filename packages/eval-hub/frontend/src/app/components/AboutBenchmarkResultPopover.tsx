import * as React from 'react';
import { Button, Content, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { EvaluationJob, Provider } from '~/app/types';
import {
  formatBenchmarkScore,
  formatThresholdValue,
  getBenchmarkDisplayName,
  getJobBenchmarks,
} from '~/app/utilities/evaluationUtils';
import { getMetricDisplayName } from '~/app/components/benchmarkUtils';

type AboutBenchmarkResultPopoverProps = {
  benchmarkId: string;
  benchmarkIndex: number;
  job: EvaluationJob;
  provider?: Provider;
};

const AboutBenchmarkResultPopover: React.FC<AboutBenchmarkResultPopoverProps> = ({
  benchmarkId,
  benchmarkIndex,
  job,
  provider,
}) => {
  const result = job.results.benchmarks?.find(
    (b) => b.id === benchmarkId && (b.benchmark_index ?? 0) === benchmarkIndex,
  );
  const benchmarkConfig = getJobBenchmarks(job).find(
    (b) => b.id === benchmarkId && (b.benchmark_index ?? 0) === benchmarkIndex,
  );

  const metricKeys = result?.metrics ? Object.keys(result.metrics).toSorted() : [];
  const primaryMetricName =
    benchmarkConfig?.primary_score?.metric ?? (metricKeys.length > 0 ? metricKeys[0] : undefined);

  const providerBenchmark = provider?.benchmarks?.find((b) => b.id === benchmarkId);

  if (!primaryMetricName) {
    return null;
  }

  // Use the provider's direction only when its primary metric matches the displayed metric,
  // otherwise fall back to the job configuration direction.
  const providerDirection =
    providerBenchmark?.primary_score?.metric === primaryMetricName
      ? providerBenchmark.primary_score.lower_is_better
      : undefined;
  const lowerIsBetter =
    providerDirection ?? benchmarkConfig?.primary_score?.lower_is_better ?? false;
  const directionLabel = lowerIsBetter ? 'Lower is better' : 'Higher is better';
  const benchmarkInterpretation = providerBenchmark?.agent?.result_interpretation;
  const providerInterpretation = provider?.agent?.result_interpretation;
  const primaryMetricDisplayName = getMetricDisplayName(primaryMetricName);

  let bodyText: string;
  if (benchmarkInterpretation) {
    bodyText = benchmarkInterpretation;
  } else if (providerInterpretation?.length) {
    bodyText = providerInterpretation.join(' ');
  } else {
    bodyText = `${primaryMetricDisplayName}; ${lowerIsBetter ? 'lower' : 'higher'} is better.`;
  }

  const score = result ? formatBenchmarkScore(result, primaryMetricName) : undefined;
  const threshold =
    benchmarkConfig?.pass_criteria?.threshold ??
    job.pass_criteria?.threshold ??
    result?.test?.threshold;

  const displayName = getBenchmarkDisplayName(benchmarkId);

  return (
    <Popover
      headerContent={`Understanding ${displayName} result`}
      bodyContent={
        <>
          <Content component="p">
            <strong>
              {primaryMetricDisplayName} · {directionLabel}
            </strong>
          </Content>
          <Content component="p" className="pf-v6-u-mt-sm">
            {bodyText}
          </Content>
          {score != null && threshold != null && (
            <Content component="p" className="pf-v6-u-mt-sm">
              This benchmark scored {score} against a threshold of{' '}
              {formatThresholdValue(threshold, primaryMetricName)}.
            </Content>
          )}
        </>
      }
    >
      <Button
        variant="link"
        isInline
        icon={<OutlinedQuestionCircleIcon />}
        aria-label={`About ${displayName} result`}
        data-testid={`about-result-${benchmarkId}-${benchmarkIndex}`}
      >
        About this result
      </Button>
    </Popover>
  );
};

export default AboutBenchmarkResultPopover;
