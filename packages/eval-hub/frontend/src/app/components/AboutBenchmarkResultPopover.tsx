import * as React from 'react';
import { Button, Content, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { EvaluationJob, Provider } from '~/app/types';
import {
  formatBenchmarkScore,
  getBenchmarkDisplayName,
  getJobBenchmarks,
  normalizeThreshold,
} from '~/app/utilities/evaluationUtils';

type AboutBenchmarkResultPopoverProps = {
  benchmarkId: string;
  benchmarkIndex: number;
  job: EvaluationJob;
  provider?: Provider;
};

const formatThreshold = (threshold: number): string => `${normalizeThreshold(threshold)}%`;

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

  if (!primaryMetricName) {
    return null;
  }

  const lowerIsBetter = benchmarkConfig?.primary_score?.lower_is_better ?? false;
  const directionLabel = lowerIsBetter ? 'Lower is better' : 'Higher is better';

  const providerBenchmark = provider?.benchmarks?.find((b) => b.id === benchmarkId);
  const benchmarkInterpretation = providerBenchmark?.agent?.result_interpretation;
  const providerInterpretation = provider?.agent?.result_interpretation;

  let bodyText: string;
  if (benchmarkInterpretation) {
    bodyText = benchmarkInterpretation;
  } else if (providerInterpretation?.length) {
    bodyText = providerInterpretation.join(' ');
  } else {
    bodyText = `${getBenchmarkDisplayName(primaryMetricName)}; ${lowerIsBetter ? 'lower' : 'higher'} is better.`;
  }

  const score = result ? formatBenchmarkScore(result) : undefined;
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
              {getBenchmarkDisplayName(primaryMetricName)} · {directionLabel}
            </strong>
          </Content>
          <Content component="p" className="pf-v6-u-mt-sm">
            {bodyText}
          </Content>
          {score != null && threshold != null && (
            <Content component="p" className="pf-v6-u-mt-sm">
              This benchmark scored {score} against a threshold of {formatThreshold(threshold)}.
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
