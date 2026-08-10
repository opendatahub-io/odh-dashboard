import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationStatusModal from '~/app/components/EvaluationStatusModal';
import { getEvaluationJobLogs, getEvaluationJobBenchmarkLogs } from '~/app/api/k8s';

jest.mock('~/app/api/k8s', () => ({
  getEvaluationJobLogs: jest.fn(),
  getEvaluationJobBenchmarkLogs: jest.fn(),
}));

jest.mock('~/app/hooks/useEvaluationJobLogs', () => ({
  useEvaluationJobLogs: jest.fn().mockReturnValue({
    logs: '2026-01-01 10:00:00 - main - INFO - Test log entry',
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  }),
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
