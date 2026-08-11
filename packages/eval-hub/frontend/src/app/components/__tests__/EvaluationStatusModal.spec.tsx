import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationStatusModal from '~/app/components/EvaluationStatusModal';
import { getEvaluationJobLogs, getEvaluationJobBenchmarkLogs } from '~/app/api/k8s';

jest.mock('~/app/api/k8s', () => ({
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

describe('EvaluationStatusModal show full logs', () => {
  it('should render the full logs switch', () => {
    renderModal();

    expect(screen.getByTestId('show-full-logs-switch')).toBeInTheDocument();
  });

  it('should toggle the switch on and off', () => {
    renderModal();

    const toggle = screen.getByLabelText('Show full log');
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  it('should display a line count in the toolbar', () => {
    renderModal();

    expect(screen.getByTestId('log-line-count')).toHaveTextContent('1 lines');
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
