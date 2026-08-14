import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import { createEvaluationJob } from '~/app/api/k8s';
import RetryEvaluationModal from '~/app/components/RetryEvaluationModal';

jest.mock('~/app/api/k8s', () => ({
  createEvaluationJob: jest.fn(),
}));

const mockCreateEvaluationJob = jest.mocked(createEvaluationJob) as jest.Mock;

const mockOnClose = jest.fn();
const mockOnComplete = jest.fn();

const renderModal = (jobOverrides = {}) => {
  const job = mockEvaluationJob({ state: 'failed', ...jobOverrides });
  return render(
    <RetryEvaluationModal
      job={job}
      namespace="test-ns"
      onClose={mockOnClose}
      onComplete={mockOnComplete}
    />,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateEvaluationJob.mockReturnValue(() => Promise.resolve(undefined));
});

describe('RetryEvaluationModal', () => {
  it('should render the confirmation title and body text', () => {
    renderModal({ name: 'My Evaluation' });
    expect(screen.getByText('Retry evaluation?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The My Evaluation evaluation will be resubmitted with the same configuration.',
      ),
    ).toBeInTheDocument();
  });

  it('should call createEvaluationJob with correct args when confirmed', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-retry-confirm'));

    await waitFor(() => {
      expect(mockCreateEvaluationJob).toHaveBeenCalledWith(
        '',
        'test-ns',
        expect.objectContaining({ name: expect.any(String) }),
      );
    });
  });

  it('should call onClose and onComplete on successful retry', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-retry-confirm'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show loading state on the confirm button while submitting', async () => {
    let resolveRetry: () => void;
    const retryPromise = new Promise<void>((resolve) => {
      resolveRetry = resolve;
    });
    mockCreateEvaluationJob.mockReturnValue(() => retryPromise);

    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-retry-confirm'));

    expect(screen.getByTestId('evaluation-retry-confirm')).toBeDisabled();

    resolveRetry!();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show error alert when retry API fails', async () => {
    mockCreateEvaluationJob.mockReturnValue(() => Promise.reject(new Error('Retry failed')));

    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-retry-confirm'));

    await waitFor(() => {
      expect(screen.getByText('Retry failed')).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should call onClose when Cancel button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('evaluation-retry-cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
