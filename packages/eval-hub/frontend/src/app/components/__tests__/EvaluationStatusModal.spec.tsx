/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationStatusModal from '~/app/components/EvaluationStatusModal';
import { getEvaluationJobLogs, getEvaluationJobBenchmarkLogs, LogFetchError } from '~/app/api/k8s';
import { EvaluationJob } from '~/app/types';

jest.mock('~/app/api/k8s', () => ({
  ...jest.requireActual('~/app/api/k8s'),
  getEvaluationJobLogs: jest.fn(),
  getEvaluationJobBenchmarkLogs: jest.fn(),
}));

const mockUseEvaluationJobLogs = jest.fn().mockReturnValue({
  logs: '2026-01-01 10:00:00 - main - INFO - Test log entry',
  loaded: true,
  error: undefined,
  refresh: jest.fn(),
});

jest.mock('~/app/hooks/useEvaluationJobLogs', () => ({
  useEvaluationJobLogs: (...args: unknown[]) => mockUseEvaluationJobLogs(...args),
}));

const mockGetEvaluationJobLogs = jest.mocked(getEvaluationJobLogs);
const mockGetEvaluationJobBenchmarkLogs = jest.mocked(getEvaluationJobBenchmarkLogs);

const mockOnClose = jest.fn();

const makeBenchmarks = (
  specs: Array<{ id: string; status: string; benchmark_index?: number; started_at?: string }>,
) => specs;

const renderModal = (
  job: EvaluationJob = mockEvaluationJob({ state: 'running' }),
  polledJobData?: EvaluationJob,
) =>
  render(
    <MemoryRouter>
      <EvaluationStatusModal
        job={job}
        namespace="test-ns"
        polledJobData={polledJobData}
        onClose={mockOnClose}
      />
    </MemoryRouter>,
  );

const switchToEventsLog = () => fireEvent.click(screen.getByTestId('events-log-tab'));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEvaluationJobLogs.mockReturnValue({
    logs: '2026-01-01 10:00:00 - main - INFO - Test log entry',
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  });
});

describe('EvaluationStatusModal tab defaults', () => {
  it('should show the progress tab by default for a running job', () => {
    renderModal(mockEvaluationJob({ state: 'running' }));
    expect(screen.getByTestId('progress-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should show the progress tab by default for a pending job', () => {
    renderModal(mockEvaluationJob({ state: 'pending' }));
    expect(screen.getByTestId('progress-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should show the progress tab by default for a failed job', () => {
    renderModal(mockEvaluationJob({ state: 'failed' }));
    expect(screen.getByTestId('progress-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should show the progress tab by default for a completed job', () => {
    renderModal(mockEvaluationJob({ state: 'completed' }));
    expect(screen.getByTestId('progress-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should not show the failure-info tab for a failed job', () => {
    renderModal(mockEvaluationJob({ state: 'failed' }));
    expect(screen.queryByTestId('failure-info-tab')).not.toBeInTheDocument();
  });

  it('should show the progress tab for a completed job', () => {
    renderModal(mockEvaluationJob({ state: 'completed' }));
    expect(screen.getByTestId('progress-tab')).toBeInTheDocument();
  });
});

describe('EvaluationStatusModal progress tab', () => {
  it('should show a skeleton when polledJobData is not yet available', () => {
    renderModal(mockEvaluationJob({ state: 'running' }));
    expect(screen.queryByTestId('progress-tab-content')).not.toBeInTheDocument();
  });

  it('should show benchmark steps when polledJobData is provided', () => {
    const job = mockEvaluationJob({ state: 'running' });
    const polledJob = mockEvaluationJob({ state: 'running' });
    polledJob.status.benchmarks = makeBenchmarks([
      { id: 'mmlu', status: 'completed', benchmark_index: 0 },
      { id: 'hellaswag', status: 'running', benchmark_index: 1 },
      { id: 'truthfulqa', status: 'pending', benchmark_index: 2 },
    ]);

    renderModal(job, polledJob);

    expect(screen.getByTestId('progress-tab-content')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-step-0')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-step-2')).toBeInTheDocument();
  });

  it('should show the correct completed/total count', () => {
    const job = mockEvaluationJob({ state: 'running' });
    const polledJob = mockEvaluationJob({ state: 'running' });
    polledJob.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', status: 'completed', benchmark_index: 0 },
      { id: 'bm-b', status: 'completed', benchmark_index: 1 },
      { id: 'bm-c', status: 'running', benchmark_index: 2 },
    ]);

    renderModal(job, polledJob);

    expect(screen.getByTestId('benchmark-complete-count')).toHaveTextContent('2/3');
  });

  it('should show elapsed time in the description when polledJobData has a started_at timestamp', () => {
    const job = mockEvaluationJob({
      state: 'running',
      statusMessage: 'Evaluation job is running.',
    });
    const polledJob = mockEvaluationJob({
      state: 'running',
      statusMessage: 'Evaluation job is running.',
    });
    polledJob.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', status: 'running', benchmark_index: 0, started_at: '2026-02-20T08:00:00Z' },
    ]);

    renderModal(job, polledJob);

    expect(screen.getByTestId('status-description')).toHaveTextContent('Elapsed time:');
  });

  it('should show an empty state when benchmarks array is empty', () => {
    const job = mockEvaluationJob({ state: 'running' });
    const polledJob = mockEvaluationJob({ state: 'running' });
    polledJob.status.benchmarks = [];

    renderModal(job, polledJob);

    expect(screen.getByTestId('progress-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Waiting for benchmarks to start')).toBeInTheDocument();
  });

  it('should sort benchmarks by benchmark_index', () => {
    const job = mockEvaluationJob({ state: 'running' });
    const polledJob = mockEvaluationJob({ state: 'running' });
    polledJob.status.benchmarks = makeBenchmarks([
      { id: 'bm-c', status: 'pending', benchmark_index: 2 },
      { id: 'bm-a', status: 'completed', benchmark_index: 0 },
      { id: 'bm-b', status: 'running', benchmark_index: 1 },
    ]);

    renderModal(job, polledJob);

    const steps = screen.getAllByTestId(/^benchmark-step-/);
    expect(steps[0]).toHaveAttribute('data-testid', 'benchmark-step-0');
    expect(steps[1]).toHaveAttribute('data-testid', 'benchmark-step-1');
    expect(steps[2]).toHaveAttribute('data-testid', 'benchmark-step-2');
  });
});

describe('EvaluationStatusModal download', () => {
  it('should render the download button in the events log toolbar', () => {
    renderModal(mockEvaluationJob({ state: 'running' }));
    switchToEventsLog();
    expect(screen.getByTestId('download-logs-button')).toBeInTheDocument();
  });

  it('should download full logs when the download button is clicked', async () => {
    const fullLogs = 'Full log content line 1\nFull log content line 2';
    mockGetEvaluationJobLogs.mockReturnValue(jest.fn().mockResolvedValue(fullLogs));

    renderModal(mockEvaluationJob({ state: 'running', name: 'my-eval' }));
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('download-logs-button'));

    await waitFor(() => {
      expect(mockGetEvaluationJobLogs).toHaveBeenCalledWith('', 'test-ns', 'eval-job-001');
    });
  });

  it('should use benchmark-specific endpoint when a benchmark is selected', async () => {
    const fullLogs = 'Benchmark log content';
    mockGetEvaluationJobBenchmarkLogs.mockReturnValue(jest.fn().mockResolvedValue(fullLogs));

    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', benchmark_index: 0, status: 'completed' },
      { id: 'bm-b', benchmark_index: 1, status: 'running' },
    ]);

    renderModal(job);
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('benchmark-log-selector'));
    fireEvent.click(screen.getByText('bm-a'));
    fireEvent.click(screen.getByTestId('download-logs-button'));

    await waitFor(() => {
      expect(mockGetEvaluationJobBenchmarkLogs).toHaveBeenCalledWith(
        '',
        'test-ns',
        'eval-job-001',
        0,
      );
    });
  });

  it('should show an error alert when download fails', async () => {
    mockGetEvaluationJobLogs.mockReturnValue(
      jest.fn().mockRejectedValue(new Error('Network error')),
    );

    renderModal(mockEvaluationJob({ state: 'running' }));
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('download-logs-button'));

    await waitFor(() => {
      expect(screen.getByTestId('download-error-alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('should dismiss the download error alert when closed', async () => {
    mockGetEvaluationJobLogs.mockReturnValue(
      jest.fn().mockRejectedValue(new Error('Network error')),
    );

    renderModal(mockEvaluationJob({ state: 'running' }));
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('download-logs-button'));

    await waitFor(() => {
      expect(screen.getByTestId('download-error-alert')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Close Warning alert/));

    expect(screen.queryByTestId('download-error-alert')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal benchmark summary', () => {
  it('should show failure summary for multi-benchmark failed jobs', () => {
    const job = mockEvaluationJob({ state: 'partially_failed' });
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err' } },
      { id: 'bm-b', benchmark_index: 1, status: 'completed' },
      { id: 'bm-c', benchmark_index: 2, status: 'failed', error_message: { message: 'err' } },
      { id: 'bm-d', benchmark_index: 3, status: 'completed' },
      { id: 'bm-e', benchmark_index: 4, status: 'completed' },
    ];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('failure-summary-alert')).toHaveTextContent(
      '2 of 5 benchmarks failed',
    );
  });

  it('should not show benchmark summary for single-benchmark jobs', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Job failed' });
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err' } },
    ];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.queryByTestId('benchmark-summary')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal log API unavailable', () => {
  it('should show a permanent info message when the log API returns 404', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '',
      loaded: true,
      error: new LogFetchError(404, 'Not Found'),
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    const alert = screen.getByTestId('logs-unavailable-alert');
    expect(alert).toHaveTextContent('Detailed logs are not available on this server version');
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should show a pending message for server errors when job is in progress', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '',
      loaded: true,
      error: new LogFetchError(500, 'Internal Server Error'),
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    const alert = screen.getByTestId('logs-pending-alert');
    expect(alert).toHaveTextContent('The evaluation pod may still be starting');
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.queryByTestId('logs-error-alert')).not.toBeInTheDocument();
  });

  it('should show a transient error with retry for server errors when job is not in progress', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '',
      loaded: true,
      error: new LogFetchError(500, 'Internal Server Error'),
      refresh: jest.fn(),
    });

    renderModal(mockEvaluationJob({ state: 'completed' }));
    switchToEventsLog();

    const alert = screen.getByTestId('logs-error-alert');
    expect(alert).toHaveTextContent('Internal Server Error');
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show a transient error with retry for non-server failures', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '',
      loaded: true,
      error: new LogFetchError(400, 'Bad Request'),
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    const alert = screen.getByTestId('logs-error-alert');
    expect(alert).toHaveTextContent('Bad Request');
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});

describe('EvaluationStatusModal ANSI stripping', () => {
  it('should strip ANSI escape codes from log entries', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '2026-01-01 10:00:00 - main - INFO - \x1B[31mRed text\x1B[0m normal',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Red text');
    expect(logContent.textContent).toContain('normal');
    expect(logContent.textContent).not.toContain('\x1B');
  });
});

describe('EvaluationStatusModal failure detail labels', () => {
  it('should render message_origin label on the failure-info tab', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.message = {
      message: 'Error occurred',
      message_origin: 'runtime',
    };

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('failure-detail-origin')).toHaveTextContent('runtime');
  });

  it('should render message_code label on the failure-info tab', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.message = {
      message: 'Error occurred',
      message_code: 'quota_exceeded',
    };

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('failure-detail-code')).toHaveTextContent('Quota exceeded');
  });

  it('should render raw code when message_code is unknown', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.message = {
      message: 'Error occurred',
      message_code: 'some_new_code',
    };

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('failure-detail-code')).toHaveTextContent('some_new_code');
  });

  it('should not render origin/code labels when they are absent', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.message = { message: 'Something failed' };

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.queryByTestId('failure-detail-origin')).not.toBeInTheDocument();
    expect(screen.queryByTestId('failure-detail-code')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal running state header', () => {
  it('should show evaluation name and running status in header', () => {
    renderModal(mockEvaluationJob({ state: 'running', name: 'Safety and fairness' }));

    expect(screen.getByTestId('modal-title-name')).toHaveTextContent('Safety and fairness');
    expect(screen.getByTestId('status-label-running')).toBeInTheDocument();
  });

  it('should show "Evaluation job is running." in description', () => {
    renderModal(mockEvaluationJob({ state: 'running' }));

    const description = screen.getByTestId('status-description');
    expect(description.textContent).toContain('Evaluation job is running.');
  });

  it('should show benchmark progress count', () => {
    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'completed' },
      { id: 'bm-b', benchmark_index: 1, status: 'running' },
      { id: 'bm-c', benchmark_index: 2, status: 'pending' },
    ];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const progress = screen.getByTestId('benchmark-complete-count');
    expect(progress).toHaveTextContent('1/3 benchmarks complete');
  });

  it('should not show benchmark progress when there are no status benchmarks', () => {
    renderModal(mockEvaluationJob({ state: 'running' }));

    expect(screen.queryByTestId('benchmark-complete-count')).not.toBeInTheDocument();
  });

  it('should not show running status label for completed jobs', () => {
    renderModal(mockEvaluationJob({ state: 'completed' }));

    expect(screen.queryByTestId('status-label-running')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal description text', () => {
  it('should show success message with total time for completed jobs', () => {
    const job = mockEvaluationJob({ state: 'completed' });
    job.resource.created_at = '2026-02-20T10:00:00Z';
    job.resource.updated_at = '2026-02-20T10:05:12Z';

    render(
      <MemoryRouter>
        <EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />
      </MemoryRouter>,
    );

    const description = screen.getByTestId('status-description');
    expect(description).toHaveTextContent('Evaluation completed successfully. Total time: 5m 12s');
  });

  it('should show success message without total time when timestamps match', () => {
    renderModal(mockEvaluationJob({ state: 'completed' }));

    const description = screen.getByTestId('status-description');
    expect(description).toHaveTextContent('Evaluation completed successfully.');
    expect(description).not.toHaveTextContent('Total time:');
  });

  it('should show elapsed time for failed jobs', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Something went wrong' });
    job.resource.created_at = '2026-02-20T10:00:00Z';
    job.resource.updated_at = '2026-02-20T10:17:23Z';

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const description = screen.getByTestId('status-description');
    expect(description).toHaveTextContent('Elapsed time: 17m 23s');
  });
});

describe('EvaluationStatusModal failure summary alert', () => {
  it('should show failure summary alert for multi-benchmark failed jobs', () => {
    const job = mockEvaluationJob({ state: 'partially_failed' });
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err-a' } },
      { id: 'bm-b', benchmark_index: 1, status: 'completed' },
      { id: 'bm-c', benchmark_index: 2, status: 'failed', error_message: { message: 'err-c' } },
    ];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const alert = screen.getByTestId('failure-summary-alert');
    expect(alert).toHaveTextContent('2 of 3 benchmarks failed');
    expect(alert).toHaveTextContent('bm-a: err-a');
    expect(alert).toHaveTextContent('bm-c: err-c');
  });

  it('should show job error message for single-benchmark failed jobs', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Job crashed' });
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err' } },
    ];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const alert = screen.getByTestId('failure-summary-alert');
    expect(alert).toHaveTextContent('Job crashed');
  });

  it('should not show failure summary alert for non-failed jobs', () => {
    renderModal(mockEvaluationJob({ state: 'completed' }));

    expect(screen.queryByTestId('failure-summary-alert')).not.toBeInTheDocument();
  });

  it('should expand and collapse failure details via the toggle button', async () => {
    const origScrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight');
    const origClientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      get() {
        return 200;
      },
      configurable: true,
    });
    Object.defineProperty(Element.prototype, 'clientHeight', {
      get() {
        return 60;
      },
      configurable: true,
    });

    try {
      const job = mockEvaluationJob({ state: 'partially_failed' });
      job.status.benchmarks = [
        {
          id: 'bm-a',
          benchmark_index: 0,
          status: 'failed',
          error_message: { message: 'err-a' },
        },
        { id: 'bm-b', benchmark_index: 1, status: 'completed' },
        {
          id: 'bm-c',
          benchmark_index: 2,
          status: 'failed',
          error_message: { message: 'err-c' },
        },
      ];

      render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

      const toggle = await screen.findByTestId('failure-summary-toggle');
      expect(toggle).toHaveTextContent('Show more');

      const alert = screen.getByTestId('failure-summary-alert');
      expect(alert).toHaveTextContent('bm-a: err-a');

      fireEvent.click(toggle);
      expect(toggle).toHaveTextContent('Show less');
      expect(alert).toHaveTextContent('bm-a: err-a');

      fireEvent.click(toggle);
      expect(toggle).toHaveTextContent('Show more');
      expect(alert).toHaveTextContent('bm-a: err-a');
    } finally {
      if (origScrollHeight) {
        Object.defineProperty(Element.prototype, 'scrollHeight', origScrollHeight);
      }
      if (origClientHeight) {
        Object.defineProperty(Element.prototype, 'clientHeight', origClientHeight);
      }
    }
  });
});

describe('EvaluationStatusModal log parsing', () => {
  it('should parse structured log entries with level and timestamp', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '2026-01-15 09:30:00,123 - evaluator - ERROR - Model connection failed\n2026-01-15 09:30:01,456 - evaluator - INFO - Retrying connection',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Model connection failed');
    expect(logContent.textContent).toContain('Retrying connection');
  });

  it('should render section headers from === delimited lines', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '=== Running benchmark arc_easy ===\n2026-01-15 09:30:00,123 - main - INFO - Starting',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', benchmark_index: 0, status: 'running' },
      { id: 'bm-b', benchmark_index: 1, status: 'running' },
    ]);
    renderModal(job);
    switchToEventsLog();

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('=== Running benchmark arc_easy ===');
  });

  it('should render benchmark_id headers as a benchmark name header row', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '=== pod=abc container=adapter benchmark_id=toxigen ===\n2026-01-15 09:30:00,123 - main - INFO - Starting',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', benchmark_index: 0, status: 'running' },
      { id: 'bm-b', benchmark_index: 1, status: 'running' },
    ]);
    renderModal(job);
    switchToEventsLog();

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('toxigen');
    expect(logContent.textContent).not.toContain('benchmark_id=');
  });

  it('should show empty state when logs have no content', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    expect(screen.getByTestId('logs-empty-alert')).toHaveTextContent(
      'Logs may have expired after pod cleanup',
    );
  });

  it('should show skeleton rows while logs are loading', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '',
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    const logContent = screen.getByTestId('log-content');
    expect(logContent.querySelectorAll('.pf-v6-c-skeleton').length).toBeGreaterThan(0);
  });
});

describe('EvaluationStatusModal view benchmark logs', () => {
  it('should switch to events-log tab when "View logs" is clicked for a failed benchmark', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.benchmarks = [
      {
        id: 'bm-a',
        benchmark_index: 0,
        status: 'failed',
        error_message: { message: 'err' },
      },
    ];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    // The dropdown auto-expands for ≤5 benchmarks; progress-view-logs is the testid in Progress tab
    fireEvent.click(screen.getByTestId('progress-view-logs-0'));

    expect(screen.getByTestId('events-log-tab')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('EvaluationStatusModal log level filter', () => {
  const mixedLogs = [
    '2026-01-15 09:30:00,123 - main - INFO - Starting evaluation',
    '2026-01-15 09:30:01,456 - main - WARNING - Low memory available',
    '2026-01-15 09:30:02,789 - main - ERROR - Model connection failed',
    '2026-01-15 09:30:03,012 - main - DEBUG - Retrying connection',
    '2026-01-15 09:30:04,345 - main - INFO - Connection restored',
  ].join('\n');

  beforeEach(() => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: mixedLogs,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should render the log level filter button', () => {
    renderModal();
    switchToEventsLog();

    expect(screen.getByTestId('log-level-filter')).toBeInTheDocument();
  });

  it('should show all log entries by default', () => {
    renderModal();
    switchToEventsLog();

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Starting evaluation');
    expect(logContent.textContent).toContain('Low memory available');
    expect(logContent.textContent).toContain('Model connection failed');
    expect(logContent.textContent).toContain('Retrying connection');
  });

  it('should filter to warnings and errors when "Warnings and errors" is selected', () => {
    renderModal();
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Warnings and errors'));

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Low memory available');
    expect(logContent.textContent).toContain('Model connection failed');
    expect(logContent.textContent).not.toContain('Starting evaluation');
    expect(logContent.textContent).not.toContain('Retrying connection');
  });

  it('should filter to errors only when "Errors only" is selected', () => {
    renderModal();
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Errors only'));

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Model connection failed');
    expect(logContent.textContent).not.toContain('Low memory available');
    expect(logContent.textContent).not.toContain('Starting evaluation');
  });

  it('should show all entries again when switching back to "All messages"', () => {
    renderModal();
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Errors only'));

    expect(screen.getByTestId('log-content').textContent).not.toContain('Starting evaluation');

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('All messages'));

    expect(screen.getByTestId('log-content').textContent).toContain('Starting evaluation');
    expect(screen.getByTestId('log-content').textContent).toContain('Low memory available');
    expect(screen.getByTestId('log-content').textContent).toContain('Model connection failed');
  });

  it('should preserve section headers when filtering', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '=== pod=abc container=adapter benchmark_id=toxigen ===\n2026-01-15 09:30:00,123 - main - INFO - Starting\n2026-01-15 09:30:01,456 - main - ERROR - Failed',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', benchmark_index: 0, status: 'running' },
      { id: 'bm-b', benchmark_index: 1, status: 'running' },
    ]);
    renderModal(job);
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Errors only'));

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('toxigen');
    expect(logContent.textContent).toContain('Failed');
    expect(logContent.textContent).not.toContain('Starting');
  });

  it('should show empty notice per benchmark section when filter removes all entries', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: [
        '=== pod=abc container=adapter benchmark_id=toxigen ===',
        '2026-01-15 09:30:00,123 - main - INFO - Starting toxigen',
        '=== pod=abc container=adapter benchmark_id=arc_easy ===',
        '2026-01-15 09:30:01,456 - main - INFO - Starting arc_easy',
      ].join('\n'),
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'toxigen', benchmark_index: 0, status: 'running' },
      { id: 'arc_easy', benchmark_index: 1, status: 'running' },
    ]);
    renderModal(job);
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Errors only'));

    const notices = screen.getAllByTestId('log-filter-empty-notice');
    expect(notices).toHaveLength(2);
    expect(notices[0]).toHaveTextContent('No error logs in this section.');
    expect(notices[1]).toHaveTextContent('No error logs in this section.');
  });

  it('should show empty notice when no section headers and filter removes all entries', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '2026-01-15 09:30:00,123 - main - INFO - All good here',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Errors only'));

    const notice = screen.getByTestId('log-filter-empty-notice');
    expect(notice).toHaveTextContent('No error logs in this section.');
  });

  it('should use correct empty notice message for warnings filter', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: '2026-01-15 09:30:00,123 - main - INFO - All good here',
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderModal();
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Warnings and errors'));

    const notice = screen.getByTestId('log-filter-empty-notice');
    expect(notice).toHaveTextContent('No warning or error logs in this section.');
  });

  it('should not show empty notice for sections that have matching entries', () => {
    mockUseEvaluationJobLogs.mockReturnValue({
      logs: [
        '=== pod=abc container=adapter benchmark_id=toxigen ===',
        '2026-01-15 09:30:00,123 - main - ERROR - Toxigen failed',
        '=== pod=abc container=adapter benchmark_id=arc_easy ===',
        '2026-01-15 09:30:01,456 - main - INFO - Arc easy passed',
      ].join('\n'),
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'toxigen', benchmark_index: 0, status: 'running' },
      { id: 'arc_easy', benchmark_index: 1, status: 'running' },
    ]);
    renderModal(job);
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Errors only'));

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Toxigen failed');

    const notices = screen.getAllByTestId('log-filter-empty-notice');
    expect(notices).toHaveLength(1);
  });
});

describe('EvaluationStatusModal useEvaluationJobLogs arguments', () => {
  it('should pass namespace and job ID on the events-log tab', () => {
    renderModal(mockEvaluationJob({ state: 'running' }));
    switchToEventsLog();

    expect(mockUseEvaluationJobLogs).toHaveBeenLastCalledWith(
      'test-ns',
      'eval-job-001',
      undefined,
      1000,
    );
  });

  it('should not call useEvaluationJobLogs on the progress tab', () => {
    mockUseEvaluationJobLogs.mockClear();
    renderModal(mockEvaluationJob({ state: 'failed', statusMessage: 'Something failed' }));

    expect(screen.getByTestId('progress-tab')).toHaveAttribute('aria-selected', 'true');
    expect(mockUseEvaluationJobLogs).not.toHaveBeenCalled();
  });

  it('should pass benchmark index after selecting a benchmark', () => {
    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', benchmark_index: 0, status: 'completed' },
      { id: 'bm-b', benchmark_index: 1, status: 'running' },
    ]);

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);
    switchToEventsLog();

    fireEvent.click(screen.getByTestId('benchmark-log-selector'));
    fireEvent.click(screen.getByText('bm-a'));

    expect(mockUseEvaluationJobLogs).toHaveBeenLastCalledWith('test-ns', 'eval-job-001', 0, 1000);
  });

  it('should hide the benchmark selector when there is only one benchmark', () => {
    const job = mockEvaluationJob({ state: 'running' });
    job.status.benchmarks = makeBenchmarks([
      { id: 'bm-a', benchmark_index: 0, status: 'completed' },
    ]);

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);
    switchToEventsLog();

    expect(screen.queryByTestId('benchmark-log-selector')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal pre-start failure', () => {
  it('should show "Not started" when no benchmark has started_at or error_message', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [{ id: 'bm-a', benchmark_index: 0, status: 'failed' }],
    });

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Not started');
  });

  it('should show "Not started" badge when status.benchmarks is empty', () => {
    const job = mockEvaluationJob({ state: 'failed', benchmarkStatuses: [] });

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Not started');
  });

  it('should show "Failed" badge and heading when at least one benchmark has a started_at', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [
        { id: 'bm-a', benchmark_index: 0, status: 'failed', started_at: '2026-01-01T10:00:00Z' },
      ],
    });

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Failed');
    expect(screen.getByTestId('status-label-failed')).not.toHaveTextContent('Not started');
    expect(screen.getByTestId('status-detail-header')).not.toHaveTextContent('Not started');
  });

  it('should prefer polledJobData benchmarks for pre-start detection when provided', () => {
    const job = mockEvaluationJob({ state: 'failed', benchmarkStatuses: [] });
    const polledJob = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [
        { id: 'bm-a', benchmark_index: 0, status: 'failed', started_at: '2026-01-01T10:00:00Z' },
      ],
    });

    render(
      <EvaluationStatusModal
        job={job}
        namespace="test-ns"
        polledJobData={polledJob}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Failed');
    expect(screen.getByTestId('status-label-failed')).not.toHaveTextContent('Not started');
  });

  it('should show "Not started" when polledJobData has no started_at on any benchmark', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [{ id: 'bm-a', benchmark_index: 0, status: 'failed' }],
    });
    const polledJob = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [{ id: 'bm-a', benchmark_index: 0, status: 'failed' }],
    });

    render(
      <EvaluationStatusModal
        job={job}
        namespace="test-ns"
        polledJobData={polledJob}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Not started');
  });

  it('should show "Failed" when a benchmark has error_message but no started_at — runner reached the benchmark', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [
        {
          id: 'bm-a',
          benchmark_index: 0,
          status: 'failed',
          error_message: { message: 'granite-7b is not a valid model identifier' },
        },
      ],
    });

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('status-label-failed')).toHaveTextContent('Failed');
    expect(screen.getByTestId('status-label-failed')).not.toHaveTextContent('Not started');
    expect(screen.getByTestId('status-detail-header')).not.toHaveTextContent('Not started');
  });
});

describe('EvaluationStatusModal stop button', () => {
  const mockOnRequestStop = jest.fn();

  const renderModalWithStop = (jobOverrides = {}) => {
    const job = mockEvaluationJob({ state: 'running', ...jobOverrides });
    return render(
      <MemoryRouter>
        <EvaluationStatusModal
          job={job}
          namespace="test-ns"
          onClose={mockOnClose}
          onRequestStop={mockOnRequestStop}
        />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    mockOnRequestStop.mockReset();
  });

  it('should show stop button for running jobs when onRequestStop is provided', () => {
    renderModalWithStop({ state: 'running' });
    expect(screen.getByTestId('status-modal-stop-button')).toBeInTheDocument();
  });

  it('should show stop button for pending jobs when onRequestStop is provided', () => {
    renderModalWithStop({ state: 'pending' });
    expect(screen.getByTestId('status-modal-stop-button')).toBeInTheDocument();
  });

  it('should not show stop button for completed jobs', () => {
    renderModalWithStop({ state: 'completed' });
    expect(screen.queryByTestId('status-modal-stop-button')).not.toBeInTheDocument();
  });

  it('should not show stop button for failed jobs', () => {
    renderModalWithStop({ state: 'failed' });
    expect(screen.queryByTestId('status-modal-stop-button')).not.toBeInTheDocument();
  });

  it('should not show stop button for stopping jobs', () => {
    renderModalWithStop({ state: 'stopping' });
    expect(screen.queryByTestId('status-modal-stop-button')).not.toBeInTheDocument();
  });

  it('should not show stop button for stopped jobs', () => {
    renderModalWithStop({ state: 'stopped' });
    expect(screen.queryByTestId('status-modal-stop-button')).not.toBeInTheDocument();
  });

  it('should not show stop button when onRequestStop is not provided', () => {
    const job = mockEvaluationJob({ state: 'running' });
    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);
    expect(screen.queryByTestId('status-modal-stop-button')).not.toBeInTheDocument();
  });

  it('should call onRequestStop with the job when stop button is clicked', () => {
    const job = mockEvaluationJob({ state: 'running' });
    render(
      <EvaluationStatusModal
        job={job}
        namespace="test-ns"
        onClose={mockOnClose}
        onRequestStop={mockOnRequestStop}
      />,
    );

    fireEvent.click(screen.getByTestId('status-modal-stop-button'));
    expect(mockOnRequestStop).toHaveBeenCalledWith(job);
  });
});

describe('EvaluationStatusModal reconfigure button', () => {
  const mockOnReconfigure = jest.fn();

  const renderModalWithReconfigure = (jobOverrides = {}) => {
    const job = mockEvaluationJob({ ...jobOverrides });
    return render(
      <MemoryRouter>
        <EvaluationStatusModal
          job={job}
          namespace="test-ns"
          onClose={mockOnClose}
          onRequestReconfigure={mockOnReconfigure}
        />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    mockOnReconfigure.mockReset();
  });

  it('should show reconfigure button for failed jobs when onRequestReconfigure is provided', () => {
    renderModalWithReconfigure({ state: 'failed', statusMessage: 'Something failed' });
    expect(screen.getByTestId('status-modal-reconfigure-button')).toBeInTheDocument();
  });

  it('should show reconfigure button for partially_failed jobs when onRequestReconfigure is provided', () => {
    renderModalWithReconfigure({ state: 'partially_failed' });
    expect(screen.getByTestId('status-modal-reconfigure-button')).toBeInTheDocument();
  });

  it('should show reconfigure button for cancelled jobs when onRequestReconfigure is provided', () => {
    renderModalWithReconfigure({ state: 'cancelled' });
    expect(screen.getByTestId('status-modal-reconfigure-button')).toBeInTheDocument();
  });

  it('should show reconfigure button for stopped jobs when onRequestReconfigure is provided', () => {
    renderModalWithReconfigure({ state: 'stopped' });
    expect(screen.getByTestId('status-modal-reconfigure-button')).toBeInTheDocument();
  });

  it('should show view results button instead of reconfigure for completed jobs', () => {
    renderModalWithReconfigure({ state: 'completed' });
    expect(screen.getByTestId('status-modal-view-results-button')).toBeInTheDocument();
    expect(screen.queryByTestId('status-modal-reconfigure-button')).not.toBeInTheDocument();
  });

  it('should show view results button for completed jobs without onRequestReconfigure', () => {
    const job = mockEvaluationJob({ state: 'completed' });
    render(
      <MemoryRouter>
        <EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('status-modal-view-results-button')).toBeInTheDocument();
  });

  it('should not show reconfigure button for running jobs', () => {
    renderModalWithReconfigure({ state: 'running' });
    expect(screen.queryByTestId('status-modal-reconfigure-button')).not.toBeInTheDocument();
  });

  it('should not show reconfigure button when onRequestReconfigure is not provided', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Something failed' });
    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);
    expect(screen.queryByTestId('status-modal-reconfigure-button')).not.toBeInTheDocument();
  });

  it('should call onRequestReconfigure with the job when reconfigure button is clicked', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Something failed' });
    render(
      <MemoryRouter>
        <EvaluationStatusModal
          job={job}
          namespace="test-ns"
          onClose={mockOnClose}
          onRequestReconfigure={mockOnReconfigure}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('status-modal-reconfigure-button'));
    expect(mockOnReconfigure).toHaveBeenCalledWith(job);
  });
});
