import * as React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Table, Tbody } from '@patternfly/react-table';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationsTableRow from '~/app/components/EvaluationsTableRow';
import { cancelEvaluationJob, deleteEvaluationJob } from '~/app/api/k8s';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/api/k8s', () => ({
  cancelEvaluationJob: jest.fn(),
  deleteEvaluationJob: jest.fn(),
}));

const mockCancelEvaluationJob = jest.mocked(cancelEvaluationJob);
const mockDeleteEvaluationJob = jest.mocked(deleteEvaluationJob);

const mockOnActionComplete = jest.fn();
const mockOnShowStatus = jest.fn();
const mockOnSelectionChange = jest.fn();

const renderRow = (jobOverrides = {}, rowIndex = 0) => {
  const job = mockEvaluationJob(jobOverrides);
  return render(
    <MemoryRouter>
      <Table aria-label="test">
        <Tbody>
          <EvaluationsTableRow
            job={job}
            rowIndex={rowIndex}
            namespace="test-ns"
            collectionNameMap={{}}
            onActionComplete={mockOnActionComplete}
            onShowStatus={mockOnShowStatus}
            isSelected={false}
            onSelectionChange={mockOnSelectionChange}
          />
        </Tbody>
      </Table>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCancelEvaluationJob.mockReturnValue(() => Promise.resolve(undefined));
  mockDeleteEvaluationJob.mockReturnValue(() => Promise.resolve(undefined));
  mockOnSelectionChange.mockReset();
});

describe('EvaluationsTableRow', () => {
  it('should render the evaluation name', () => {
    renderRow({ name: 'My Evaluation' });
    expect(screen.getByTestId('evaluation-name')).toHaveTextContent('My Evaluation');
  });

  it('should fall back to tenant when name is not set', () => {
    renderRow({ tenant: 'Tenant Eval' });
    expect(screen.getByTestId('evaluation-name')).toHaveTextContent('Tenant Eval');
  });

  it('should fall back to resource id when neither name nor tenant is set', () => {
    renderRow({ id: 'eval-fallback-id' });
    expect(screen.getByTestId('evaluation-name')).toHaveTextContent('eval-fallback-id');
  });

  it('should render status label', () => {
    renderRow({ state: 'running' });
    expect(screen.getByTestId('evaluation-status-button')).toHaveTextContent('Running');
  });

  it('should disable the compare checkbox when evaluation is not completed', () => {
    renderRow({ state: 'running' });
    expect(screen.getByTestId('evaluation-select-checkbox-0')).toBeDisabled();
  });

  it('should enable the compare checkbox when evaluation is completed', () => {
    renderRow({ state: 'completed' });
    expect(screen.getByTestId('evaluation-select-checkbox-0')).toBeEnabled();
  });

  it('should call onShowStatus when clicking a failed status with a message', () => {
    renderRow({
      state: 'failed',
      statusMessage: 'Benchmark arc_easy failed with message: model not found',
    });

    const label = screen.getByTestId('evaluation-status-button');
    fireEvent.click(within(label).getByRole('button'));

    expect(mockOnShowStatus).toHaveBeenCalledTimes(1);
    expect(mockOnShowStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.objectContaining({ state: 'failed' }),
      }),
    );
  });

  it('should render benchmark name', () => {
    renderRow({ benchmarkId: 'MMLU Finance' });
    expect(screen.getByTestId('evaluation-benchmark')).toHaveTextContent('MMLU Finance');
  });

  it('should render multiple benchmarks with +N more suffix', () => {
    const job = mockEvaluationJob({ benchmarkId: 'arc_easy' });
    /* eslint-disable camelcase */
    job.benchmarks = [
      { id: 'arc_easy', provider_id: 'lm_evaluation_harness' },
      { id: 'hellaswag_ar', provider_id: 'lm_evaluation_harness' },
    ];
    /* eslint-enable camelcase */
    render(
      <MemoryRouter>
        <Table aria-label="test">
          <Tbody>
            <EvaluationsTableRow
              job={job}
              rowIndex={0}
              namespace="test-ns"
              collectionNameMap={{}}
              onActionComplete={mockOnActionComplete}
              onShowStatus={mockOnShowStatus}
              isSelected={false}
              onSelectionChange={mockOnSelectionChange}
            />
          </Tbody>
        </Table>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('evaluation-benchmark')).toHaveTextContent('Arc Easy +1 more');
    expect(screen.getByTestId('evaluation-result')).toHaveTextContent('-');
  });

  it('should render model name in the Type column', () => {
    renderRow({ modelName: 'gpt-4-turbo' });
    expect(screen.getByTestId('evaluation-type')).toHaveTextContent('gpt-4-turbo');
  });

  it('should render formatted run date', () => {
    renderRow({ createdAt: '2026-02-20T10:00:00Z' });
    const dateCell = screen.getByTestId('evaluation-run-date');
    expect(dateCell.textContent).toContain('2026');
  });

  it('should render result percentage when score exists', () => {
    renderRow({ score: 0.85, scorePass: true });
    expect(screen.getByTestId('evaluation-result')).toHaveTextContent('85%');
  });

  it('should render result percentage when metrics exist without pass/fail test', () => {
    // eslint-disable-next-line camelcase
    renderRow({ metrics: { acc: 0.7, acc_norm: 0.6 } });
    expect(screen.getByTestId('evaluation-result')).toHaveTextContent('60%');
  });

  it('should render dash for result when no metrics', () => {
    renderRow({ state: 'running' });
    expect(screen.getByTestId('evaluation-result')).toHaveTextContent('-');
  });

  describe('kebab actions', () => {
    it('should show View evaluation status action', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('View evaluation status')).toBeInTheDocument();
    });

    it('should call onShowStatus when View evaluation status is clicked', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('View evaluation status'));
      expect(mockOnShowStatus).toHaveBeenCalledTimes(1);
    });

    it('should show Stop action for running jobs', () => {
      renderRow({ state: 'running' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show Stop action for pending jobs', () => {
      renderRow({ state: 'pending' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('should not show Stop action for completed jobs', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show Stop action for failed jobs', () => {
      renderRow({ state: 'failed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });

    it('should not show Stop action for stopped jobs', () => {
      renderRow({ state: 'stopped' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    });
  });

  describe('confirmation modals', () => {
    it('should open stop confirmation modal', () => {
      renderRow({ state: 'running' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Stop'));
      expect(screen.getByText('Stop evaluation?')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The eval-job-001 evaluation will be stopped, and its progress will be lost.',
        ),
      ).toBeInTheDocument();
    });

    it('should open delete confirmation modal', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByText('Delete evaluation run?')).toBeInTheDocument();
      expect(
        screen.getByText('The eval-job-001 evaluation run and its results will be deleted.'),
      ).toBeInTheDocument();
    });

    it('should close modal when Cancel is clicked', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByText('Delete evaluation run?')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('evaluation-delete-cancel'));
      expect(screen.queryByText('Delete evaluation run?')).not.toBeInTheDocument();
    });

    it('should call cancelEvaluationJob when stop is confirmed', async () => {
      renderRow({ state: 'running', id: 'eval-job-001' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Stop'));

      fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

      await waitFor(() => {
        expect(mockCancelEvaluationJob).toHaveBeenCalledWith('', 'test-ns', 'eval-job-001');
        expect(mockOnActionComplete).toHaveBeenCalled();
      });
    });

    it('should call deleteEvaluationJob when delete is confirmed', async () => {
      renderRow({ state: 'completed', id: 'eval-job-002' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Delete'));

      fireEvent.click(screen.getByTestId('evaluation-delete-confirm'));

      await waitFor(() => {
        expect(mockDeleteEvaluationJob).toHaveBeenCalledWith('', 'test-ns', 'eval-job-002');
        expect(mockOnActionComplete).toHaveBeenCalled();
      });
    });

    it('should show stopping status after cancel request succeeds', async () => {
      renderRow({ state: 'running', id: 'eval-job-004' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Stop'));
      fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

      await waitFor(() => {
        expect(mockOnActionComplete).toHaveBeenCalled();
        expect(screen.getByTestId('evaluation-status-button')).toHaveTextContent('Canceling');
      });
    });

    it('should show error in stop modal when cancel API fails', async () => {
      mockCancelEvaluationJob.mockReturnValue(() => Promise.reject(new Error('Cancel failed')));

      renderRow({ state: 'running', id: 'eval-job-005' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Stop'));
      fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Cancel failed')).toBeInTheDocument();
      });
      expect(mockOnActionComplete).not.toHaveBeenCalled();
    });

    it('should show error alert when delete API call fails', async () => {
      mockDeleteEvaluationJob.mockReturnValue(() => Promise.reject(new Error('Network error')));

      renderRow({ state: 'completed', id: 'eval-job-003' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Delete'));

      fireEvent.click(screen.getByTestId('evaluation-delete-confirm'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      expect(mockOnActionComplete).not.toHaveBeenCalled();
    });
  });

  describe('retry action', () => {
    it('should show Reconfigure action for failed jobs', () => {
      renderRow({ state: 'failed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Reconfigure')).toBeInTheDocument();
    });

    it('should show Reconfigure action for partially_failed jobs', () => {
      renderRow({ state: 'partially_failed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Reconfigure')).toBeInTheDocument();
    });

    it('should show Reconfigure action for cancelled jobs', () => {
      renderRow({ state: 'cancelled' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Reconfigure')).toBeInTheDocument();
    });

    it('should show Reconfigure action for stopped jobs', () => {
      renderRow({ state: 'stopped' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Reconfigure')).toBeInTheDocument();
    });

    it('should show Reconfigure action for completed jobs', () => {
      renderRow({ state: 'completed' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.getByText('Reconfigure')).toBeInTheDocument();
    });

    it('should not show Reconfigure action for running jobs', () => {
      renderRow({ state: 'running' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Reconfigure')).not.toBeInTheDocument();
    });

    it('should not show Reconfigure action for pending jobs', () => {
      renderRow({ state: 'pending' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      expect(screen.queryByText('Reconfigure')).not.toBeInTheDocument();
    });

    it('should navigate to reconfigure page when Retry is clicked', () => {
      renderRow({ state: 'failed', id: 'eval-job-retry' });
      fireEvent.click(screen.getByTestId('evaluation-kebab').querySelector('button')!);
      fireEvent.click(screen.getByText('Reconfigure'));
      expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-ns/reconfigure/eval-job-retry');
    });
  });
});
