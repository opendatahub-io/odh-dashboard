import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import BenchmarkResultCard from '~/app/components/BenchmarkResultCard';

/* eslint-disable camelcase */
const renderCard = (jobOverrides = {}, benchmarkId = 'default-benchmark') =>
  render(
    <BenchmarkResultCard
      benchmarkId={benchmarkId}
      occurrenceIndex={0}
      job={mockEvaluationJob({ benchmarkId, ...jobOverrides })}
    />,
  );

describe('BenchmarkResultCard', () => {
  it('should render a pass label when the benchmark test passed', () => {
    renderCard({ score: 0.75, scorePass: true });

    expect(screen.getByTestId('benchmark-pass-label-default-benchmark-0')).toHaveTextContent(
      'Pass',
    );
  });

  it('should render a fail label when the benchmark test failed the threshold', () => {
    renderCard({ score: 0.2, scorePass: false });

    expect(screen.getByTestId('benchmark-pass-label-default-benchmark-0')).toHaveTextContent(
      'Fail',
    );
  });

  it('should render a fail label for a failed benchmark run without test results', () => {
    renderCard({
      resultBenchmarks: [{ id: 'default-benchmark', provider_id: 'lighteval', benchmark_index: 0 }],
      benchmarkStatuses: [{ id: 'default-benchmark', benchmark_index: 0, status: 'failed' }],
    });

    expect(screen.getByTestId('benchmark-pass-label-default-benchmark-0')).toHaveTextContent(
      'Fail',
    );
  });

  it('should render no pass/fail label when a benchmark without test results did not fail', () => {
    renderCard({
      resultBenchmarks: [{ id: 'default-benchmark', provider_id: 'lighteval', benchmark_index: 0 }],
      benchmarkStatuses: [{ id: 'default-benchmark', benchmark_index: 0, status: 'completed' }],
    });

    expect(
      screen.queryByTestId('benchmark-pass-label-default-benchmark-0'),
    ).not.toBeInTheDocument();
  });

  it('should keep the test result label when the status entry contradicts it', () => {
    renderCard({
      score: 0.75,
      scorePass: true,
      benchmarkStatuses: [{ id: 'default-benchmark', benchmark_index: 0, status: 'failed' }],
    });

    expect(screen.getByTestId('benchmark-pass-label-default-benchmark-0')).toHaveTextContent(
      'Pass',
    );
  });
});
/* eslint-enable camelcase */
