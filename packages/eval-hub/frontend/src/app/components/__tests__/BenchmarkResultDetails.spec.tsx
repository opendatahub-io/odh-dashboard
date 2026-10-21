import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import BenchmarkResultDetails from '~/app/components/BenchmarkResultDetails';
import { useProvider } from '~/app/hooks/useProvider';
import { Provider } from '~/app/types';

jest.mock('~/app/hooks/useProvider', () => ({
  useProvider: jest.fn(),
}));

const mockUseProvider = jest.mocked(useProvider);

beforeEach(() => {
  jest.clearAllMocks();
});

/* eslint-disable camelcase */
const renderDetails = (
  jobOverrides = {},
  provider?: Provider,
  benchmarkId = 'default-benchmark',
) => {
  mockUseProvider.mockReturnValue({
    provider,
    loaded: true,
    loadError: undefined,
  });

  const job = mockEvaluationJob({
    score: 0.75,
    scorePass: true,
    benchmarkId,
    providerId: 'lm_evaluation_harness',
    ...jobOverrides,
  });

  return render(
    <MemoryRouter>
      <BenchmarkResultDetails benchmarkId={benchmarkId} benchmarkIndex={0} job={job} />
    </MemoryRouter>,
  );
};

describe('BenchmarkResultDetails', () => {
  it('should render benchmark details with primary metric', () => {
    renderDetails();
    expect(screen.getByTestId('benchmark-details-default-benchmark-0')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-details-info')).toBeInTheDocument();
  });

  it('should render nothing when no result exists for the benchmark', () => {
    mockUseProvider.mockReturnValue({ provider: undefined, loaded: true, loadError: undefined });
    const job = mockEvaluationJob({ benchmarkId: 'other-benchmark' });

    const { container } = render(
      <MemoryRouter>
        <BenchmarkResultDetails benchmarkId="missing-benchmark" benchmarkIndex={0} job={job} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should display complements when provider has agent complements', () => {
    const provider: Provider = {
      resource: { id: 'lm_evaluation_harness' },
      name: 'lm_evaluation_harness',
      benchmarks: [],
      agent: {
        complements: ['safety_eval_suite', 'toxigen'],
      },
    };
    renderDetails({}, provider);

    expect(screen.getByTestId('complementary-frameworks')).toHaveTextContent(
      'Safety Eval Suite, Toxigen',
    );
  });

  it('should not display complements section when provider has no agent metadata', () => {
    renderDetails({}, undefined);
    expect(screen.queryByTestId('complementary-frameworks')).not.toBeInTheDocument();
  });

  it('should not display complements section when complements array is empty', () => {
    const provider: Provider = {
      resource: { id: 'lm_evaluation_harness' },
      name: 'lm_evaluation_harness',
      agent: { complements: [] },
    };
    renderDetails({}, provider);
    expect(screen.queryByTestId('complementary-frameworks')).not.toBeInTheDocument();
  });

  it('should render the AboutBenchmarkResultPopover when primary_score is set', () => {
    mockUseProvider.mockReturnValue({ provider: undefined, loaded: true, loadError: undefined });
    const job = mockEvaluationJob({
      score: 0.75,
      benchmarkId: 'default-benchmark',
      providerId: 'lm_evaluation_harness',
    });
    job.benchmarks = [
      {
        id: 'default-benchmark',
        provider_id: 'lm_evaluation_harness',
        // eslint-disable-next-line camelcase
        primary_score: { metric: 'acc', lower_is_better: false },
      },
    ];

    render(
      <MemoryRouter>
        <BenchmarkResultDetails benchmarkId="default-benchmark" benchmarkIndex={0} job={job} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('about-result-default-benchmark-0')).toBeInTheDocument();
  });

  it('should render a fail label for a failed benchmark run without test results', () => {
    renderDetails({
      resultBenchmarks: [{ id: 'default-benchmark', provider_id: 'lighteval', benchmark_index: 0 }],
      benchmarkStatuses: [{ id: 'default-benchmark', benchmark_index: 0, status: 'failed' }],
    });

    expect(screen.getByTestId('details-pass-label-default-benchmark-0')).toHaveTextContent('Fail');
  });

  it('should render the failure reason for a failed benchmark run', () => {
    renderDetails({
      resultBenchmarks: [{ id: 'default-benchmark', provider_id: 'lighteval', benchmark_index: 0 }],
      benchmarkStatuses: [
        {
          id: 'default-benchmark',
          benchmark_index: 0,
          status: 'failed',
          error_message: { message: 'inspect eval failed (exit 1)', message_code: 'unknown' },
        },
      ],
    });

    expect(screen.getByTestId('benchmark-fail-reason-default-benchmark-0')).toHaveTextContent(
      'inspect eval failed (exit 1)',
    );
  });

  it('should render no pass/fail label when a benchmark without test results did not fail', () => {
    renderDetails({
      resultBenchmarks: [{ id: 'default-benchmark', provider_id: 'lighteval', benchmark_index: 0 }],
      benchmarkStatuses: [{ id: 'default-benchmark', benchmark_index: 0, status: 'completed' }],
    });

    expect(screen.queryByTestId('details-pass-label-default-benchmark-0')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-fail-reason-default-benchmark-0'),
    ).not.toBeInTheDocument();
  });
});
/* eslint-enable camelcase */
