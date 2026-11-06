import React from 'react';
import { render, screen } from '@testing-library/react';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { mockTrainJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { useWorkloadForTrainJob } from '../hooks/useWorkloadForTrainJob';
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
  beforeEach(() => {
    jest.mocked(useWorkloadForTrainJob).mockReturnValue([[], true, undefined]);
  });

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

  it.each(['Train an image classification model.', '   ', undefined])(
    'should always display Job status in the header (annotation: %s)',
    (description) => {
      renderModal(description);
      expect(screen.getByTestId('training-job-status-modal-description')).toHaveTextContent(
        /^Job status$/,
      );
    },
  );

  it.each([
    [WorkloadStatusType.Pending, undefined, 'Waiting for quota in user-queue'],
    [WorkloadStatusType.Inadmissible, undefined, 'The workload is inadmissible'],
    [WorkloadStatusType.Evicted, 'Preempted', 'Paused by higher-priority job'],
    [WorkloadStatusType.Evicted, 'ClusterQueueStopped', 'The workload is evicted'],
    [
      WorkloadStatusType.Evicted,
      'PodsReadyTimeout',
      'Waiting for resources in user-queue (attempt 2)',
    ],
  ] as const)(
    'should show the Workbench queue message without pods (%s, %s)',
    (mockStatus, evictionReason, expected) => {
      const workload = mockWorkloadK8sResource({
        mockStatus,
        evictionReason,
        requeueState: { count: 2 },
      });
      jest.mocked(useWorkloadForTrainJob).mockReturnValue([[workload], true, undefined]);
      renderModal();
      expect(screen.getByTestId('training-job-status-summary')).toHaveTextContent(expected);
      expect(screen.getByTestId('training-job-status')).toHaveTextContent('Paused');
      expect(
        screen.queryByText(
          'Depending on the size and resources requested, this can take several minutes.',
        ),
      ).not.toBeInTheDocument();
    },
  );

  it('should update the summary and clear it when admitted or when the job finishes', () => {
    const job = mockTrainJobK8sResource({ status: TrainingJobState.QUEUED });
    const workload = mockWorkloadK8sResource({ mockStatus: WorkloadStatusType.Pending });
    jest.mocked(useWorkloadForTrainJob).mockReturnValue([[workload], true, undefined]);
    const { rerender } = render(
      <TrainingJobStatusModal job={job} jobStatus={TrainingJobState.QUEUED} />,
    );
    expect(screen.getByTestId('training-job-status-summary')).toHaveTextContent(
      'Waiting for quota in user-queue',
    );

    const inadmissible = mockWorkloadK8sResource({ mockStatus: WorkloadStatusType.Inadmissible });
    jest.mocked(useWorkloadForTrainJob).mockReturnValue([[inadmissible], true, undefined]);
    rerender(<TrainingJobStatusModal job={job} jobStatus={TrainingJobState.QUEUED} />);
    expect(screen.getByTestId('training-job-status-summary')).toHaveTextContent(
      'The workload is inadmissible',
    );
    jest
      .mocked(useWorkloadForTrainJob)
      .mockReturnValue([
        [mockWorkloadK8sResource({ mockStatus: WorkloadStatusType.Admitted })],
        true,
        undefined,
      ]);
    rerender(<TrainingJobStatusModal job={job} jobStatus={TrainingJobState.QUEUED} />);
    expect(screen.queryByTestId('training-job-status-summary')).not.toBeInTheDocument();
    jest
      .mocked(useWorkloadForTrainJob)
      .mockReturnValue([
        [mockWorkloadK8sResource({ mockStatus: WorkloadStatusType.Failed })],
        true,
        undefined,
      ]);
    rerender(<TrainingJobStatusModal job={job} jobStatus={TrainingJobState.QUEUED} />);
    expect(screen.getByTestId('training-job-status-summary')).toHaveTextContent(
      'There was an error',
    );
    jest.mocked(useWorkloadForTrainJob).mockReturnValue([[workload], true, undefined]);
    [TrainingJobState.SUCCEEDED, TrainingJobState.FAILED, TrainingJobState.DELETING].forEach(
      (status) => {
        rerender(<TrainingJobStatusModal job={job} jobStatus={status} />);
        expect(screen.queryByTestId('training-job-status-summary')).not.toBeInTheDocument();
      },
    );
  });

  it('should omit missing, inaccessible, empty and stale queue data', () => {
    const job = mockTrainJobK8sResource({ status: TrainingJobState.QUEUED });
    const workload = mockWorkloadK8sResource({ mockStatus: WorkloadStatusType.Pending });
    const { rerender } = render(<TrainingJobStatusModal job={job} />);
    const sources: ReturnType<typeof useWorkloadForTrainJob>[] = [
      [[], true, undefined],
      [[workload], false, undefined],
      [[workload], true, new Error('Forbidden')],
      [[{ ...workload, status: { conditions: [] } }], true, undefined],
      [
        [
          {
            ...workload,
            status: {
              conditions: workload.status?.conditions?.map((condition) => ({
                ...condition,
                observedGeneration: 1,
              })),
            },
          },
        ],
        true,
        undefined,
      ],
    ];
    sources.forEach((source) => {
      jest.mocked(useWorkloadForTrainJob).mockReturnValue(source);
      rerender(<TrainingJobStatusModal job={job} />);
      expect(screen.queryByTestId('training-job-status-summary')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
