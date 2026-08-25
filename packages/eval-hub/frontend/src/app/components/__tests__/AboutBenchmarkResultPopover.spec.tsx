import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import AboutBenchmarkResultPopover from '~/app/components/AboutBenchmarkResultPopover';
import { Provider } from '~/app/types';

const mockProvider: Provider = {
  resource: { id: 'lm_evaluation_harness' },
  name: 'lm_evaluation_harness',
  benchmarks: [
    {
      id: 'default-benchmark',
      name: 'Default Benchmark',
      agent: {
        // eslint-disable-next-line camelcase
        result_interpretation: 'Length-normalized accuracy on multiple-choice questions.',
      },
    },
  ],
  agent: {
    // eslint-disable-next-line camelcase
    result_interpretation: ['Most benchmarks use accuracy (acc or acc_norm), higher is better.'],
  },
};

const renderPopover = (jobOverrides = {}, providerOverride?: Provider | null) => {
  const provider = providerOverride === undefined ? mockProvider : (providerOverride ?? undefined);

  const job = mockEvaluationJob({
    score: 0.6,
    scorePass: false,
    benchmarkId: 'default-benchmark',
    providerId: 'lm_evaluation_harness',
    ...jobOverrides,
  });

  /* eslint-disable camelcase */
  const benchmarks = job.benchmarks ?? [];
  if (benchmarks.length > 0 && !benchmarks[0].primary_score) {
    benchmarks[0] = {
      ...benchmarks[0],
      primary_score: { metric: 'acc_norm', lower_is_better: false },
      pass_criteria: { threshold: 0.85 },
    };
  }
  /* eslint-enable camelcase */

  return render(
    <MemoryRouter initialEntries={['/evaluations/test-ns/jobs/eval-job-001/results']}>
      <AboutBenchmarkResultPopover
        benchmarkId="default-benchmark"
        benchmarkIndex={0}
        job={job}
        provider={provider}
      />
    </MemoryRouter>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AboutBenchmarkResultPopover', () => {
  it('should render the "About this result" trigger button', () => {
    renderPopover();
    expect(screen.getByTestId('about-result-default-benchmark-0')).toHaveTextContent(
      'About this result',
    );
  });

  it('should show popover with correct header on click', () => {
    renderPopover();
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(screen.getByText('Understanding Default-Benchmark result')).toBeInTheDocument();
  });

  it('should display the primary metric name and direction', () => {
    renderPopover();
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(screen.getByText('Acc Norm · Higher is better')).toBeInTheDocument();
  });

  it('should display the score and threshold', () => {
    renderPopover();
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(
      screen.getByText('This benchmark scored 60% against a threshold of 85%.'),
    ).toBeInTheDocument();
  });

  it('should use benchmark-level result_interpretation when available', () => {
    renderPopover();
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(
      screen.getByText('Length-normalized accuracy on multiple-choice questions.'),
    ).toBeInTheDocument();
  });

  it('should fall back to provider-level result_interpretation', () => {
    const providerWithoutBenchmarkAgent: Provider = {
      ...mockProvider,
      benchmarks: [{ id: 'default-benchmark', name: 'Default Benchmark' }],
    };
    renderPopover({}, providerWithoutBenchmarkAgent);
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(
      screen.getByText('Most benchmarks use accuracy (acc or acc_norm), higher is better.'),
    ).toBeInTheDocument();
  });

  it('should fall back to derived text when no interpretation metadata exists', () => {
    renderPopover({}, null);
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(screen.getByText('Acc Norm; higher is better.')).toBeInTheDocument();
  });

  it('should display "Lower is better" for lower_is_better metrics', () => {
    /* eslint-disable camelcase */
    const job = mockEvaluationJob({
      score: 0.3,
      scorePass: true,
      benchmarkId: 'default-benchmark',
      providerId: 'lm_evaluation_harness',
    });
    job.benchmarks = [
      {
        id: 'default-benchmark',
        provider_id: 'lm_evaluation_harness',
        primary_score: { metric: 'toxicity_score', lower_is_better: true },
        pass_criteria: { threshold: 0.5 },
      },
    ];
    /* eslint-enable camelcase */

    render(
      <MemoryRouter>
        <AboutBenchmarkResultPopover benchmarkId="default-benchmark" benchmarkIndex={0} job={job} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(screen.getByText('Toxicity Score · Lower is better')).toBeInTheDocument();
    expect(screen.getByText('Toxicity Score; lower is better.')).toBeInTheDocument();
  });

  describe('providerDirection fallback logic', () => {
    it('should use provider lower_is_better when provider metric matches the displayed metric', () => {
      // Job says higher is better; provider says lower is better for the same metric — provider wins.
      const provider: Provider = {
        ...mockProvider,
        benchmarks: [
          {
            id: 'default-benchmark',
            name: 'Default Benchmark',
            // eslint-disable-next-line camelcase
            primary_score: { metric: 'acc_norm', lower_is_better: true },
          },
        ],
      };
      renderPopover({}, provider);
      fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
      expect(screen.getByText('Acc Norm · Lower is better')).toBeInTheDocument();
    });

    it('should fall back to job config direction when provider metric does not match', () => {
      // Job displays acc_norm; provider primary_score is for a different metric — job config wins.
      const provider: Provider = {
        ...mockProvider,
        benchmarks: [
          {
            id: 'default-benchmark',
            name: 'Default Benchmark',
            // eslint-disable-next-line camelcase
            primary_score: { metric: 'bias_score', lower_is_better: true },
          },
        ],
      };
      renderPopover({}, provider);
      fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
      // Job benchmarkConfig has lower_is_better: false for acc_norm
      expect(screen.getByText('Acc Norm · Higher is better')).toBeInTheDocument();
    });

    it('should fall back to job config direction when provider benchmark has no primary_score', () => {
      const provider: Provider = {
        ...mockProvider,
        benchmarks: [{ id: 'default-benchmark', name: 'Default Benchmark' }],
      };
      renderPopover({}, provider);
      fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
      expect(screen.getByText('Acc Norm · Higher is better')).toBeInTheDocument();
    });
  });

  it('should render nothing when no primary metric is available', () => {
    const job = mockEvaluationJob({ benchmarkId: 'no-metric-benchmark' });
    job.benchmarks = [{ id: 'no-metric-benchmark' }];

    const { container } = render(
      <MemoryRouter>
        <AboutBenchmarkResultPopover
          benchmarkId="no-metric-benchmark"
          benchmarkIndex={0}
          job={job}
        />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should format threshold > 1 without multiplying by 100', () => {
    /* eslint-disable camelcase */
    const job = mockEvaluationJob({
      score: 0.8,
      benchmarkId: 'default-benchmark',
    });
    job.benchmarks = [
      {
        id: 'default-benchmark',
        primary_score: { metric: 'acc', lower_is_better: false },
        pass_criteria: { threshold: 90 },
      },
    ];
    /* eslint-enable camelcase */

    render(
      <MemoryRouter>
        <AboutBenchmarkResultPopover benchmarkId="default-benchmark" benchmarkIndex={0} job={job} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(
      screen.getByText('This benchmark scored 80% against a threshold of 90%.'),
    ).toBeInTheDocument();
  });

  it('should not render score line when threshold is missing', () => {
    /* eslint-disable camelcase */
    const job = mockEvaluationJob({
      score: 0.7,
      benchmarkId: 'default-benchmark',
    });
    job.benchmarks = [
      {
        id: 'default-benchmark',
        primary_score: { metric: 'acc', lower_is_better: false },
      },
    ];
    job.pass_criteria = undefined;
    /* eslint-enable camelcase */

    render(
      <MemoryRouter>
        <AboutBenchmarkResultPopover benchmarkId="default-benchmark" benchmarkIndex={0} job={job} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('about-result-default-benchmark-0'));
    expect(screen.queryByText(/scored.*against a threshold/)).not.toBeInTheDocument();
  });
});
