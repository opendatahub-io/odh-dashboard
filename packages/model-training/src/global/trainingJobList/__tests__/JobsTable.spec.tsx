import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockTrainJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { mockRayJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import JobsTable from '../JobsTable';
import {
  TrainingJobState,
  RayJobDeploymentStatus,
  RayJobStatusValue,
  UnifiedJobKind,
} from '../../../types';

jest.mock('../JobProject', () => {
  const MockJobProject: React.FC<{ job: { metadata: { namespace: string } } }> = ({ job }) => (
    <>{job.metadata.namespace}</>
  );
  return { __esModule: true, default: MockJobProject };
});

jest.mock('../TrainingJobClusterQueue', () => {
  const MockTrainingJobClusterQueue: React.FC<{ localQueueName?: string }> = ({
    localQueueName,
  }) => <>{localQueueName || '-'}</>;
  return { __esModule: true, default: MockTrainingJobClusterQueue };
});

jest.mock('../../../hooks/useTrainingJobNodeScaling', () => ({
  useTrainingJobNodeScaling: jest.fn().mockReturnValue({
    nodesCount: 4,
    canScaleNodes: false,
    isScaling: false,
    scaleNodesModalOpen: false,
    setScaleNodesModalOpen: jest.fn(),
    handleScaleNodes: jest.fn(),
  }),
}));

jest.mock('../hooks/useTrainingJobPauseResume', () => ({
  useTrainingJobPauseResume: jest.fn().mockReturnValue({
    isToggling: false,
    pauseModalOpen: false,
    closePauseModal: jest.fn(),
    onPauseClick: jest.fn(),
    handlePause: jest.fn(),
    handleResume: jest.fn(),
    dontShowModalValue: false,
    setDontShowModalValue: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useRayJobNodeScaling', () => ({
  useRayJobNodeScaling: jest.fn().mockReturnValue({
    workerGroupReplicas: [],
    setWorkerGroupReplicas: jest.fn(),
    hasChanges: false,
    canEditNodes: false,
    isScaling: false,
    modalOpen: false,
    setModalOpen: jest.fn(),
    handleSave: jest.fn(),
  }),
}));

jest.mock('../hooks/useRayJobPauseResume', () => ({
  useRayJobPauseResume: jest.fn().mockReturnValue({
    isSubmitting: false,
    pauseModalOpen: false,
    closePauseModal: jest.fn(),
    onPauseClick: jest.fn(),
    handlePause: jest.fn(),
    handleResume: jest.fn(),
    dontShowModalValue: false,
    setDontShowModalValue: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useRayClusterDashboardURL', () => ({
  useRayClusterDashboardURL: jest.fn().mockReturnValue({
    url: null,
    loaded: true,
  }),
}));

const projectName = 'test-model-training-project';

const mockTrainJob = mockTrainJobK8sResource({
  name: 'image-classification-job',
  namespace: projectName,
  status: TrainingJobState.RUNNING,
  numNodes: 4,
  localQueueName: 'training-queue',
});

const mockRayJob = mockRayJobK8sResource({
  name: 'ray-data-processing',
  namespace: projectName,
  jobStatus: RayJobStatusValue.RUNNING,
  jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
  entrypoint: 'python process_data.py',
});

const defaultProps = {
  onStatusUpdate: jest.fn(),
  onSelectJob: jest.fn(),
  onDelete: jest.fn(),
  onClearFilters: jest.fn(),
};

describe('JobsTable', () => {
  it('should display RayJobs alongside TrainJobs in the table', () => {
    const allJobs: UnifiedJobKind[] = [mockTrainJob, mockRayJob];
    const trainUid = mockTrainJob.metadata.uid ?? '';
    const rayUid = mockRayJob.metadata.uid ?? '';
    const jobStatuses = new Map([
      [trainUid, TrainingJobState.RUNNING],
      [rayUid, TrainingJobState.RUNNING],
    ]);
    const nodeCountMap = new Map([
      [trainUid, 4],
      [rayUid, 2],
    ]);

    render(
      <JobsTable
        jobs={allJobs}
        jobStatuses={jobStatuses}
        nodeCountMap={nodeCountMap}
        {...defaultProps}
      />,
    );

    const table = screen.getByTestId('training-job-table');
    expect(table).toBeInTheDocument();

    // Both job names should appear in the table
    expect(within(table).getByText('image-classification-job')).toBeInTheDocument();
    expect(within(table).getByText('ray-data-processing')).toBeInTheDocument();

    // Both types should appear
    expect(within(table).getByText('TrainJob')).toBeInTheDocument();
    expect(within(table).getByText('RayJob')).toBeInTheDocument();
  });

  it('should show empty state when no jobs exist', () => {
    const emptyJobs: UnifiedJobKind[] = [];
    const emptyStatuses = new Map();
    const emptyNodeCountMap = new Map();

    render(
      <JobsTable
        jobs={emptyJobs}
        jobStatuses={emptyStatuses}
        nodeCountMap={emptyNodeCountMap}
        {...defaultProps}
        clearFilters={jest.fn()}
      />,
    );

    // The DashboardEmptyTableView shows "No results found" by default
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });
});
