import React from 'react';
import { render, screen } from '@testing-library/react';
import { mockTrainJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import TrainingJobStatusModal from '../TrainingJobStatusModal';
import { TrainingJobState } from '../../../types';

jest.mock('../hooks/useWorkloadForTrainJob', () => ({
  useWorkloadForTrainJob: jest.fn(() => [[], true]),
}));

jest.mock('../../../api/events', () => ({
  useWatchTrainJobEvents: jest.fn(() => [[], true]),
}));

const renderModal = (description?: string) => {
  const job = mockTrainJobK8sResource({
    status: TrainingJobState.PAUSED,
    suspend: true,
  });
  job.metadata.annotations = {
    ...job.metadata.annotations,
    ...(description !== undefined && { 'openshift.io/description': description }),
  };
  return render(
    <TrainingJobStatusModal job={job} jobStatus={TrainingJobState.PAUSED} onClose={jest.fn()} />,
  );
};

describe('TrainingJobStatusModal', () => {
  it('should display the training job display name in the modal title', () => {
    const job = mockTrainJobK8sResource({
      status: TrainingJobState.PAUSED,
      suspend: true,
    });
    job.metadata.annotations = {
      ...job.metadata.annotations,
      'openshift.io/display-name': 'Friendly training job',
    };

    render(
      <TrainingJobStatusModal job={job} jobStatus={TrainingJobState.PAUSED} onClose={jest.fn()} />,
    );

    expect(screen.getByText('Friendly training job status')).toBeInTheDocument();
  });

  it.each([
    {
      descriptionCase: 'a populated description',
      description: 'Train an image classification model.',
    },
    { descriptionCase: 'a whitespace description', description: '   ' },
    { descriptionCase: 'no description', description: undefined },
  ])(
    'should display the resource type when the training job has $descriptionCase',
    ({ description }) => {
      renderModal(description);

      expect(screen.getByTestId('training-job-status-modal-description')).toHaveTextContent(
        /^Job status$/,
      );
    },
  );
});
