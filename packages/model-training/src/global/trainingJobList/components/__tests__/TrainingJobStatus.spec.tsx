import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockTrainJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import TrainingJobStatus from '../TrainingJobStatus';
import { TrainingJobState } from '../../../../types';

describe('TrainingJobStatus', () => {
  it('should show Running status for a running TrainJob', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.RUNNING,
    });

    render(<TrainingJobStatus job={job} jobStatus={TrainingJobState.RUNNING} />);

    const statusLabel = screen.getByTestId('training-job-status');
    expect(statusLabel).toBeInTheDocument();
    expect(statusLabel).toHaveTextContent('Running');
  });

  it('should show Complete status for a succeeded TrainJob', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.SUCCEEDED,
    });

    render(<TrainingJobStatus job={job} jobStatus={TrainingJobState.SUCCEEDED} />);

    const statusLabel = screen.getByTestId('training-job-status');
    expect(statusLabel).toHaveTextContent('Complete');
  });

  it('should show Failed status for a failed TrainJob', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.FAILED,
    });

    render(<TrainingJobStatus job={job} jobStatus={TrainingJobState.FAILED} />);

    const statusLabel = screen.getByTestId('training-job-status');
    expect(statusLabel).toHaveTextContent('Failed');
  });

  it('should show Paused status for a paused TrainJob', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.PAUSED,
      suspend: true,
    });

    render(<TrainingJobStatus job={job} jobStatus={TrainingJobState.PAUSED} />);

    const statusLabel = screen.getByTestId('training-job-status');
    expect(statusLabel).toHaveTextContent('Paused');
  });

  it('should display progress bar for running job with progress percentage', () => {
    const job = mockTrainJobK8sResource({
      name: 'image-classification-job',
      status: TrainingJobState.RUNNING,
      trainerStatus: {
        progressPercentage: 64,
        estimatedRemainingSeconds: 1800,
        currentStep: 3000,
        totalSteps: 4690,
        currentEpoch: 3,
        totalEpochs: 5,
        trainMetrics: {
          loss: 0.2344,
          accuracy: 0.8993774,
          total_batches: 854, // eslint-disable-line camelcase
          total_samples: 4000, // eslint-disable-line camelcase
        },
        evalMetrics: null,
        lastUpdatedTime: '2024-01-15T10:45:00Z',
      },
    });

    render(<TrainingJobStatus job={job} jobStatus={TrainingJobState.RUNNING} />);

    const progressBar = screen.getByTestId('training-job-progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Training progress: 64%');
  });

  it('should not display progress bar when showProgressBar is false', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.RUNNING,
    });

    render(
      <TrainingJobStatus job={job} jobStatus={TrainingJobState.RUNNING} showProgressBar={false} />,
    );

    expect(screen.queryByTestId('training-job-progress-bar')).not.toBeInTheDocument();
  });

  it('should not display progress bar for completed jobs', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.SUCCEEDED,
    });

    render(<TrainingJobStatus job={job} jobStatus={TrainingJobState.SUCCEEDED} />);

    expect(screen.queryByTestId('training-job-progress-bar')).not.toBeInTheDocument();
  });

  it('should show loading skeleton when jobStatus is undefined', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.RUNNING,
    });

    const { container } = render(<TrainingJobStatus job={job} />);

    // When jobStatus is undefined, isLoadingStatus is true and Skeleton is shown
    expect(screen.queryByTestId('training-job-status')).not.toBeInTheDocument();
    // PF Skeleton renders as a div with class pf-v6-c-skeleton
    expect(container.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
  });
});
