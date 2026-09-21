import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import { cancelEvaluationJob } from '~/app/api/k8s';
import StopEvaluationModal from '~/app/components/StopEvaluationModal';

jest.mock('~/app/api/k8s', () => ({
  cancelEvaluationJob: jest.fn(),
}));

const mockCancelEvaluationJob = jest.mocked(cancelEvaluationJob);

const mockOnClose = jest.fn();
const mockOnComplete = jest.fn();

const renderModal = (jobOverrides = {}, namespace = 'test-ns') => {
  const job = mockEvaluationJob({ state: 'running', ...jobOverrides });
  return render(
    <StopEvaluationModal
      job={job}
      namespace={namespace}
      onClose={mockOnClose}
      onComplete={mockOnComplete}
    />,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCancelEvaluationJob.mockReturnValue(() => Promise.resolve(undefined));
});

describe('StopEvaluationModal', () => {
  it('should render the confirmation title and body text', () => {
    renderModal({ name: 'My Evaluation' });
    expect(screen.getByText('Stop evaluation?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The My Evaluation evaluation will be stopped, and its progress will be lost.',
      ),
    ).toBeInTheDocument();
  });

  it('should show error and not call API when namespace is empty', async () => {
    renderModal({}, '');
    fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

    await waitFor(() => {
      expect(screen.getByText('Namespace is required to perform this action')).toBeInTheDocument();
    });
    expect(mockCancelEvaluationJob).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should call cancelEvaluationJob with correct args when confirmed', async () => {
    renderModal({ id: 'eval-job-001' });
    fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

    await waitFor(() => {
      expect(mockCancelEvaluationJob).toHaveBeenCalledWith('', 'test-ns', 'eval-job-001');
    });
  });

  it('should call onClose and onComplete on successful cancel', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show loading state on the confirm button while submitting', async () => {
    let resolveCancel: () => void;
    const cancelPromise = new Promise<void>((resolve) => {
      resolveCancel = resolve;
    });
    mockCancelEvaluationJob.mockReturnValue(() => cancelPromise);

    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

    expect(screen.getByTestId('evaluation-stop-confirm')).toBeDisabled();

    resolveCancel!();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show error alert when cancel API fails', async () => {
    mockCancelEvaluationJob.mockReturnValue(() => Promise.reject(new Error('Cancel failed')));

    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

    await waitFor(() => {
      expect(screen.getByText('Cancel failed')).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should call onClose when Cancel button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-stop-cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not close when clicking modal backdrop while submitting', async () => {
    let resolveCancel: () => void;
    const cancelPromise = new Promise<void>((resolve) => {
      resolveCancel = resolve;
    });
    mockCancelEvaluationJob.mockReturnValue(() => cancelPromise);

    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-stop-confirm'));

    expect(screen.getByTestId('evaluation-stop-cancel')).toBeDisabled();

    resolveCancel!();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
