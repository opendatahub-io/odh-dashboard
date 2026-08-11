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
});
/* eslint-enable camelcase */
