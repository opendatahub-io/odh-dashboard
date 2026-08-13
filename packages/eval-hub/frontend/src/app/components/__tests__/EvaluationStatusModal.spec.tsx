import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationStatusModal from '~/app/components/EvaluationStatusModal';
import { getEvaluationJobLogs, getEvaluationJobBenchmarkLogs, LogFetchError } from '~/app/api/k8s';

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

const renderModal = (jobOverrides = {}) => {
  const job = mockEvaluationJob({ state: 'running', ...jobOverrides });
  return render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEvaluationJobLogs.mockReturnValue({
    logs: '2026-01-01 10:00:00 - main - INFO - Test log entry',
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  });
});

describe('EvaluationStatusModal download', () => {
  it('should render the download button in the events log toolbar', () => {
    renderModal();
    expect(screen.getByTestId('download-logs-button')).toBeInTheDocument();
  });

  it('should download full logs when the download button is clicked', async () => {
    const fullLogs = 'Full log content line 1\nFull log content line 2';
    mockGetEvaluationJobLogs.mockReturnValue(jest.fn().mockResolvedValue(fullLogs));

    renderModal({ name: 'my-eval' });

    fireEvent.click(screen.getByTestId('download-logs-button'));

    await waitFor(() => {
      expect(mockGetEvaluationJobLogs).toHaveBeenCalledWith('', 'test-ns', 'eval-job-001');
    });
  });

  it('should use benchmark-specific endpoint when a benchmark is selected', async () => {
    const fullLogs = 'Benchmark log content';
    mockGetEvaluationJobBenchmarkLogs.mockReturnValue(jest.fn().mockResolvedValue(fullLogs));

    const job = mockEvaluationJob({
      state: 'running',
    });
    // eslint-disable-next-line camelcase
    job.status.benchmarks = [{ id: 'bm-a', benchmark_index: 0, status: 'completed' }];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

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

    renderModal();

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

    renderModal();

    fireEvent.click(screen.getByTestId('download-logs-button'));

    await waitFor(() => {
      expect(screen.getByTestId('download-error-alert')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Close Warning alert/));

    expect(screen.queryByTestId('download-error-alert')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal benchmark summary', () => {
  it('should show benchmark summary for multi-benchmark failed jobs', () => {
    const job = mockEvaluationJob({ state: 'partially_failed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err' } },
      { id: 'bm-b', benchmark_index: 1, status: 'completed' },
      { id: 'bm-c', benchmark_index: 2, status: 'failed', error_message: { message: 'err' } },
      { id: 'bm-d', benchmark_index: 3, status: 'completed' },
      { id: 'bm-e', benchmark_index: 4, status: 'completed' },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const summary = screen.getByTestId('benchmark-summary');
    expect(summary).toHaveTextContent('2 of 5');
    expect(summary).toHaveTextContent('benchmarks failed');
  });

  it('should not show benchmark summary for single-benchmark jobs', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Job failed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err' } },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.queryByTestId('benchmark-summary')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal benchmark warnings', () => {
  it('should display warning_message on a completed benchmark', () => {
    const job = mockEvaluationJob({ state: 'partially_failed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      {
        id: 'bm-ok',
        benchmark_index: 0,
        status: 'completed',
        warning_message: { message: 'Quota nearing limit', message_code: 'quota_exceeded' },
      },
      { id: 'bm-fail', benchmark_index: 1, status: 'failed', error_message: { message: 'err' } },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const warning = screen.getByTestId('benchmark-warning-bm-ok');
    expect(warning).toHaveTextContent('Quota nearing limit');
  });

  it('should display both error and warning on a failed benchmark', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      {
        id: 'bm-both',
        benchmark_index: 0,
        status: 'failed',
        error_message: { message: 'Job crashed' },
        warning_message: { message: 'High memory usage' },
      },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByText('Job crashed')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-warning-bm-both')).toHaveTextContent('High memory usage');
  });

  it('should not display warning block when warning_message is absent', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Failed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      {
        id: 'bm-nowarning',
        benchmark_index: 0,
        status: 'failed',
        error_message: { message: 'err' },
      },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.queryByTestId('benchmark-warning-bm-nowarning')).not.toBeInTheDocument();
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

    renderModal({ state: 'completed' });

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

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Red text');
    expect(logContent.textContent).toContain('normal');
    expect(logContent.textContent).not.toContain('\x1B');
  });
});

describe('EvaluationStatusModal auto tab selection', () => {
  it('should default to failure-info tab for failed jobs', () => {
    renderModal({ state: 'failed', statusMessage: 'Something went wrong' });

    expect(screen.getByTestId('failure-info-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should default to failure-info tab for partially_failed jobs', () => {
    renderModal({ state: 'partially_failed', statusMessage: 'Some benchmarks failed' });

    expect(screen.getByTestId('failure-info-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should default to events-log tab for running jobs', () => {
    renderModal({ state: 'running' });

    expect(screen.getByTestId('events-log-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should default to events-log tab for completed jobs', () => {
    renderModal({ state: 'completed' });

    expect(screen.getByTestId('events-log-tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('should not render the failure-info tab for non-failed jobs', () => {
    renderModal({ state: 'running' });

    expect(screen.queryByTestId('failure-info-tab')).not.toBeInTheDocument();
  });
});

describe('EvaluationStatusModal failure detail labels', () => {
  it('should render message_origin label on the failure-info tab', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.message = {
      message: 'Error occurred',
      // eslint-disable-next-line camelcase
      message_origin: 'lm_evaluation_harness',
    };

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('failure-detail-origin')).toHaveTextContent('lm_evaluation_harness');
  });

  it('should render message_code label on the failure-info tab', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.message = {
      message: 'Error occurred',
      // eslint-disable-next-line camelcase
      message_code: 'quota_exceeded',
    };

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    expect(screen.getByTestId('failure-detail-code')).toHaveTextContent('Quota exceeded');
  });

  it('should render raw code when message_code is unknown', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    job.status.message = {
      message: 'Error occurred',
      // eslint-disable-next-line camelcase
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
  it('should show running header with evaluation name', () => {
    renderModal({ state: 'running', name: 'Safety and fairness' });

    const header = screen.getByTestId('evaluation-header');
    expect(header).toHaveTextContent('Running Safety and fairness');
  });

  it('should show "Evaluation job is running." in description', () => {
    renderModal({ state: 'running' });

    const description = screen.getByTestId('status-description');
    expect(description.textContent).toContain('Evaluation job is running.');
  });

  it('should show benchmark progress count', () => {
    const job = mockEvaluationJob({ state: 'running' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'completed' },
      { id: 'bm-b', benchmark_index: 1, status: 'running' },
      { id: 'bm-c', benchmark_index: 2, status: 'pending' },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const progress = screen.getByTestId('benchmark-progress');
    expect(progress).toHaveTextContent('1/3 benchmarks complete');
  });

  it('should not show benchmark progress when there are no status benchmarks', () => {
    renderModal({ state: 'running' });

    expect(screen.queryByTestId('benchmark-progress')).not.toBeInTheDocument();
  });

  it('should show evaluation name without state prefix for completed jobs', () => {
    renderModal({ state: 'completed', name: 'Safety and fairness' });

    const header = screen.getByTestId('evaluation-header');
    expect(header).toHaveTextContent('Safety and fairness');
    expect(header).not.toHaveTextContent('Running');
  });
});

describe('EvaluationStatusModal description text', () => {
  it('should show success message with total time for completed jobs', () => {
    const job = mockEvaluationJob({ state: 'completed' });
    /* eslint-disable camelcase */
    job.resource.created_at = '2026-02-20T10:00:00Z';
    job.resource.updated_at = '2026-02-20T10:05:12Z';
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const description = screen.getByTestId('status-description');
    expect(description).toHaveTextContent('Evaluation completed successfully. Total time: 5m 12s');
  });

  it('should show success message without total time when timestamps match', () => {
    renderModal({ state: 'completed' });

    const description = screen.getByTestId('status-description');
    expect(description).toHaveTextContent('Evaluation completed successfully.');
    expect(description).not.toHaveTextContent('Total time:');
  });

  it('should show elapsed time for failed jobs', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Something went wrong' });
    /* eslint-disable camelcase */
    job.resource.created_at = '2026-02-20T10:00:00Z';
    job.resource.updated_at = '2026-02-20T10:17:23Z';
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const description = screen.getByTestId('status-description');
    expect(description).toHaveTextContent('Elapsed time: 17m 23s');
  });
});

describe('EvaluationStatusModal failure summary alert', () => {
  it('should show failure summary alert for multi-benchmark failed jobs', () => {
    const job = mockEvaluationJob({ state: 'partially_failed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err-a' } },
      { id: 'bm-b', benchmark_index: 1, status: 'completed' },
      { id: 'bm-c', benchmark_index: 2, status: 'failed', error_message: { message: 'err-c' } },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const alert = screen.getByTestId('failure-summary-alert');
    expect(alert).toHaveTextContent('2 of 3 benchmarks failed');
    expect(alert).toHaveTextContent('bm-a: err-a');
    expect(alert).toHaveTextContent('bm-c: err-c');
  });

  it('should show job error message for single-benchmark failed jobs', () => {
    const job = mockEvaluationJob({ state: 'failed', statusMessage: 'Job crashed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      { id: 'bm-a', benchmark_index: 0, status: 'failed', error_message: { message: 'err' } },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    const alert = screen.getByTestId('failure-summary-alert');
    expect(alert).toHaveTextContent('Job crashed');
  });

  it('should not show failure summary alert for non-failed jobs', () => {
    renderModal({ state: 'completed' });

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
      /* eslint-disable camelcase */
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
      /* eslint-enable camelcase */

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

    renderModal();

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

    renderModal();

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

    const logContent = screen.getByTestId('log-content');
    expect(logContent.querySelectorAll('.pf-v6-c-skeleton').length).toBeGreaterThan(0);
  });
});

describe('EvaluationStatusModal view benchmark logs', () => {
  it('should switch to events-log tab when "View logs" is clicked for a failed benchmark', () => {
    const job = mockEvaluationJob({ state: 'failed' });
    /* eslint-disable camelcase */
    job.status.benchmarks = [
      {
        id: 'bm-a',
        benchmark_index: 0,
        status: 'failed',
        error_message: { message: 'err' },
      },
    ];
    /* eslint-enable camelcase */

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId('view-logs-bm-a'));

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

    expect(screen.getByTestId('log-level-filter')).toBeInTheDocument();
  });

  it('should show all log entries by default', () => {
    renderModal();

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Starting evaluation');
    expect(logContent.textContent).toContain('Low memory available');
    expect(logContent.textContent).toContain('Model connection failed');
    expect(logContent.textContent).toContain('Retrying connection');
  });

  it('should filter to warnings and errors when "Warnings and errors" is selected', () => {
    renderModal();

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

    fireEvent.click(screen.getByTestId('log-level-filter'));
    fireEvent.click(screen.getByText('Errors only'));

    const logContent = screen.getByTestId('log-content');
    expect(logContent.textContent).toContain('Model connection failed');
    expect(logContent.textContent).not.toContain('Low memory available');
    expect(logContent.textContent).not.toContain('Starting evaluation');
  });

  it('should show all entries again when switching back to "All messages"', () => {
    renderModal();

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

    renderModal();

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

    renderModal();

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

    renderModal();

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
    renderModal({ state: 'running' });

    expect(mockUseEvaluationJobLogs).toHaveBeenLastCalledWith(
      'test-ns',
      'eval-job-001',
      undefined,
      1000,
    );
  });

  it('should pass undefined namespace and job ID on the failure-info tab', () => {
    renderModal({ state: 'failed', statusMessage: 'Something failed' });

    expect(screen.getByTestId('failure-info-tab')).toHaveAttribute('aria-selected', 'true');
    expect(mockUseEvaluationJobLogs).toHaveBeenLastCalledWith(
      undefined,
      undefined,
      undefined,
      1000,
    );
  });

  it('should pass benchmark index after selecting a benchmark', () => {
    const job = mockEvaluationJob({ state: 'running' });
    // eslint-disable-next-line camelcase
    job.status.benchmarks = [{ id: 'bm-a', benchmark_index: 0, status: 'completed' }];

    render(<EvaluationStatusModal job={job} namespace="test-ns" onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId('benchmark-log-selector'));
    fireEvent.click(screen.getByText('bm-a'));

    expect(mockUseEvaluationJobLogs).toHaveBeenLastCalledWith('test-ns', 'eval-job-001', 0, 1000);
  });
});
