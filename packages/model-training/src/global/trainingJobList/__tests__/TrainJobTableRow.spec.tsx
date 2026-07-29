import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Table, Thead, Tr, Th, Tbody } from '@patternfly/react-table';
import { mockTrainJobK8sResource } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import TrainJobTableRow from '../TrainJobTableRow';
import { TrainingJobState } from '../../../types';

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

const renderRow = (props: Partial<React.ComponentProps<typeof TrainJobTableRow>> = {}) => {
  const defaultJob = mockTrainJobK8sResource({
    name: 'image-classification-job',
    namespace: 'test-project',
    status: TrainingJobState.RUNNING,
    numNodes: 4,
    localQueueName: 'training-queue',
  });

  return render(
    <Table aria-label="test table">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Project</Th>
          <Th>Nodes</Th>
          <Th>Cluster queue</Th>
          <Th>Ray cluster</Th>
          <Th>Type</Th>
          <Th>Created</Th>
          <Th>Status</Th>
          <Th />
          <Th />
        </Tr>
      </Thead>
      <Tbody>
        <TrainJobTableRow
          job={defaultJob}
          jobStatus={TrainingJobState.RUNNING}
          onDelete={jest.fn()}
          onSelectJob={jest.fn()}
          {...props}
        />
      </Tbody>
    </Table>,
  );
};

describe('TrainJobTableRow', () => {
  it('should display correct data in training job table rows', () => {
    renderRow();

    // Name cell
    expect(screen.getByText('image-classification-job')).toBeInTheDocument();

    // Project cell (mocked to show namespace)
    expect(screen.getByText('test-project')).toBeInTheDocument();

    // Nodes cell
    expect(screen.getByText('4')).toBeInTheDocument();

    // Cluster queue cell (mocked to show local queue name)
    expect(screen.getByText('training-queue')).toBeInTheDocument();

    // Type cell
    expect(screen.getByText('TrainJob')).toBeInTheDocument();

    // Ray cluster cell (always "-" for TrainJobs)
    const cells = screen.getAllByRole('cell');
    const rayClusterCell = cells.find((cell) => cell.getAttribute('data-label') === 'Ray cluster');
    expect(rayClusterCell).toHaveTextContent('-');

    // Status cell
    const statusLabel = screen.getByTestId('training-job-status');
    expect(statusLabel).toHaveTextContent('Running');
  });

  it('should display progress bar for running job with progress percentage', () => {
    const job = mockTrainJobK8sResource({
      name: 'image-classification-job',
      namespace: 'test-project',
      status: TrainingJobState.RUNNING,
      numNodes: 4,
      localQueueName: 'training-queue',
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

    renderRow({ job });

    const progressBar = screen.getByTestId('training-job-progress-bar');
    expect(progressBar).toBeInTheDocument();

    // The aria-label is on the inner progressbar role element
    const progressBarInner = screen.getByRole('progressbar');
    expect(progressBarInner).toHaveAttribute('aria-label', 'Training progress: 64%');
  });
});
