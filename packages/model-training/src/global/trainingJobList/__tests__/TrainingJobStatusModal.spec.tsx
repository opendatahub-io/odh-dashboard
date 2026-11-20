import React from 'react';
import { render, screen } from '@testing-library/react';
import { PodKind } from '@odh-dashboard/k8s-core';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { mockTrainJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { useWorkloadForTrainJob } from '../hooks/useWorkloadForTrainJob';
import TrainingJobStatusModal from '../TrainingJobStatusModal';
import { TrainingJobState } from '../../../types';
import useTrainJobPods from '../../../hooks/useTrainJobPods';

jest.mock('../../../hooks/useTrainJobPods');

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

const mockWorkerPods = (training: PodKind[]) => {
  const result: ReturnType<typeof useTrainJobPods> = {
    pods: training,
    training,
    initializers: [],
    loaded: true,
    error: undefined,
  };
  jest.mocked(useTrainJobPods).mockReturnValue(result);
  return result;
};

describe('TrainingJobStatusModal', () => {
  beforeEach(() => {
    jest.mocked(useWorkloadForTrainJob).mockReturnValue([[], true, undefined]);
    mockWorkerPods([]);
  });

  it.each([
    ['Unschedulable', undefined, 'Unable to schedule a worker.'],
    [
      'Unschedulable',
      '0/2 nodes are available: 2 Insufficient cpu.',
      'Unable to schedule a worker: insufficient CPU.',
    ],
    ['Unschedulable', 'Insufficient amd.com/gpu', 'Unable to schedule a worker: insufficient GPU.'],
    [
      'Unschedulable',
      'Insufficient example.com/device, Insufficient example.com/device',
      'Unable to schedule a worker: insufficient example.com/device.',
    ],
    [
      'Unschedulable',
      'Insufficient cpu, Insufficient memory, Insufficient nvidia.com/gpu',
      'Unable to schedule a worker: insufficient CPU, memory, and GPU.',
    ],
    ['Unschedulable', 'Insufficient memory', 'Unable to schedule a worker: insufficient memory.'],
    [
      'Unschedulable',
      '0/2 nodes are available: 2 Insufficient cpu, 2 Insufficient nvidia.com/gpu.',
      'Unable to schedule a worker: insufficient CPU and GPU.',
    ],
    [
      'Unschedulable',
      "0/2 nodes are available: 2 node(s) didn't match Pod's node affinity/selector.",
      'Unable to schedule a worker: node restrictions.',
    ],
    [
      'Unschedulable',
      '0/8 nodes are available: 3 Insufficient cpu, 5 node(s) had untolerated taint(s). preemption: 0/8 nodes are available: 8 Preemption is not helpful for scheduling.',
      'Unable to schedule a worker: insufficient CPU; node restrictions.',
    ],
    ['Unschedulable', 'Scheduling failed for an unknown reason.', 'Unable to schedule a worker.'],
    ['ErrImagePull', undefined, 'Unable to pull the container image.'],
    ['ImagePullBackOff', undefined, 'Unable to pull the container image.'],
    ['InvalidImageName', undefined, 'The container image name is invalid.'],
    ['CrashLoopBackOff', undefined, 'The container failed and is waiting to restart.'],
  ] as const)(
    'should show the current worker blocker (%s, %s) without Kueue',
    (reason, message, expected) => {
      const pod = mockPodK8sResource({ isPending: reason === 'Unschedulable' });
      pod.status = {
        phase: 'Pending',
        ...(reason === 'Unschedulable'
          ? { conditions: pod.status?.conditions?.map((condition) => ({ ...condition, message })) }
          : {
              containerStatuses: [{ name: 'node', ready: false, state: { waiting: { reason } } }],
            }),
      };
      mockWorkerPods([pod]);
      const job = mockTrainJobK8sResource({ status: TrainingJobState.RUNNING });
      render(<TrainingJobStatusModal job={job} jobStatus={TrainingJobState.RUNNING} />);
      expect(screen.getByTestId('training-job-pod-summary').textContent.trim()).toBe(expected);
    },
  );

  it('should hide a worker blocker while paused and show it again after resume', () => {
    const pod = mockPodK8sResource({});
    pod.status = {
      phase: 'Pending',
      containerStatuses: [
        { name: 'node', ready: false, state: { waiting: { reason: 'ImagePullBackOff' } } },
      ],
    };
    mockWorkerPods([pod]);
    const job = mockTrainJobK8sResource({ status: TrainingJobState.RUNNING });
    const { rerender } = render(
      <TrainingJobStatusModal job={job} jobStatus={TrainingJobState.RUNNING} />,
    );
    expect(screen.getByTestId('training-job-status-modal-description')).toHaveTextContent(
      /^Job status$/,
    );
    expect(screen.getByTestId('training-job-pod-summary')).toHaveTextContent(
      'Unable to pull the container image.',
    );

    rerender(<TrainingJobStatusModal job={job} jobStatus={TrainingJobState.PAUSED} />);
    expect(screen.getByTestId('training-job-status')).toHaveTextContent('Paused');
    expect(screen.queryByTestId('training-job-pod-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('training-job-status-modal-description')).not.toBeInTheDocument();

    rerender(<TrainingJobStatusModal job={job} jobStatus={TrainingJobState.RUNNING} />);
    expect(screen.getByTestId('training-job-status')).toHaveTextContent('Running');
    expect(screen.getByTestId('training-job-pod-summary')).toHaveTextContent(
      'Unable to pull the container image.',
    );
  });

  it('should keep a duplicate blocker until the last affected worker recovers', () => {
    const workers: PodKind[] = ['worker-0', 'worker-1'].map((name, index) => ({
      ...mockPodK8sResource({ name }),
      status: {
        phase: 'Running',
        [index === 0 ? 'initContainerStatuses' : 'containerStatuses']: [
          {
            name: 'node',
            ready: false,
            state: { waiting: { reason: index === 0 ? 'ErrImagePull' : 'ImagePullBackOff' } },
          },
        ],
      },
    }));
    const job = mockTrainJobK8sResource({ status: TrainingJobState.RUNNING });
    const workload = mockWorkloadK8sResource({ mockStatus: WorkloadStatusType.Pending });
    jest.mocked(useWorkloadForTrainJob).mockReturnValue([[workload], true, undefined]);
    mockWorkerPods(workers);
    const { rerender } = render(<TrainingJobStatusModal job={job} />);
    expect(screen.getAllByTestId('training-job-pod-summary')).toHaveLength(1);
    expect(screen.getByTestId('training-job-pod-summary')).toHaveTextContent(
      'Unable to pull the container image.',
    );
    [1, 0].forEach((workerIndex, index) => {
      workers[workerIndex] = mockPodK8sResource({ name: workers[workerIndex].metadata.name });
      mockWorkerPods([...workers]);
      rerender(<TrainingJobStatusModal job={job} />);
      expect(screen.queryAllByTestId('training-job-pod-summary')).toHaveLength(index === 0 ? 1 : 0);
      if (index === 0) {
        expect(screen.getByTestId('training-job-pod-summary')).toBeVisible();
      }
      expect(screen.getByTestId('training-job-status-summary')).toHaveTextContent(
        'Waiting for quota in user-queue',
      );
    });
  });

  it('should omit unavailable pod data, past failures, and blockers on terminal jobs', () => {
    const pod = mockPodK8sResource({});
    pod.status = {
      phase: 'Running',
      containerStatuses: [
        { name: 'node', ready: false, state: { waiting: { reason: 'CrashLoopBackOff' } } },
      ],
    };
    const blocked = mockWorkerPods([pod]);
    const job = mockTrainJobK8sResource({ status: TrainingJobState.RUNNING });
    const { rerender } = render(<TrainingJobStatusModal job={job} />);
    expect(screen.getByTestId('training-job-pod-summary')).toBeInTheDocument();
    const recovered = {
      ...mockPodK8sResource({}),
      status: {
        phase: 'Running',
        containerStatuses: [
          {
            name: 'node',
            ready: true,
            state: { running: true },
            restartCount: 3,
            lastState: { terminated: { reason: 'Error', exitCode: 1 } },
          },
        ],
      },
    };
    const sources: ReturnType<typeof useTrainJobPods>[] = [
      { ...blocked, loaded: false },
      { ...blocked, error: new Error('Forbidden') },
      { ...blocked, training: [] },
      { ...blocked, training: [{ ...pod, status: undefined }] },
      { ...blocked, training: [{ ...pod, status: { ...pod.status, phase: 'Succeeded' } }] },
      { ...blocked, training: [recovered] },
    ];
    sources.forEach((source) => {
      jest.mocked(useTrainJobPods).mockReturnValue(source);
      rerender(<TrainingJobStatusModal job={job} />);
      expect(screen.queryByTestId('training-job-pod-summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('danger-Job Failed')).not.toBeInTheDocument();
    });
    mockWorkerPods([pod]);
    [TrainingJobState.SUCCEEDED, TrainingJobState.FAILED, TrainingJobState.DELETING].forEach(
      (status) => {
        rerender(<TrainingJobStatusModal job={job} jobStatus={status} />);
        expect(screen.queryByTestId('training-job-pod-summary')).not.toBeInTheDocument();
        if (status === TrainingJobState.FAILED) {
          expect(screen.getByTestId('danger-Job Failed')).toBeInTheDocument();
        }
      },
    );
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
    'should omit Job status without a live summary (annotation: %s)',
    (description) => {
      renderModal(description);
      expect(screen.queryByTestId('training-job-status-modal-description')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('training-job-status-modal-description')).toHaveTextContent(
      /^Job status$/,
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
    expect(screen.queryByTestId('training-job-status-modal-description')).not.toBeInTheDocument();
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
