import * as React from 'react';
import '@testing-library/jest-dom';
import { screen, fireEvent } from '@testing-library/react';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import type { Deployment, DeploymentCondition } from '../../../../extension-points';
import { ModelDeploymentState } from '../../../shared/types';
import DeploymentStatusModal from '../DeploymentStatusModal';
import { createTrackingRender } from '../../../__tests__/TrackingProvider';

const mockTrackEvent = jest.fn();
const render = createTrackingRender(mockTrackEvent);

const createMockDeployment = (
  conditions: DeploymentCondition[],
  overrides?: Partial<Deployment['status']>,
): Deployment => ({
  modelServingPlatformId: 'kserve',
  model: {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: {
      name: 'test-model',
      namespace: 'test-project',
      annotations: {
        'openshift.io/display-name': 'Test Model',
      },
    },
  },
  status: {
    state: ModelDeploymentState.LOADED,
    conditions,
    ...overrides,
  },
});

describe('DeploymentStatusModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal with deployment name and status', () => {
    const deployment = createMockDeployment([
      {
        type: 'DeploymentRequested',
        label: 'Deployment requested',
        status: 'True',
        lastTransitionTime: '2026-04-22T15:44:32Z',
      },
    ]);

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByText('Test Model status')).toBeInTheDocument();
    expect(screen.getByText('Deployment requested')).toBeInTheDocument();
  });

  it('should render all conditions as progress steps', () => {
    const deployment = createMockDeployment([
      {
        type: 'DeploymentRequested',
        label: 'Deployment requested',
        status: 'True',
        lastTransitionTime: '2026-04-22T15:44:32Z',
      },
      {
        type: 'PredictorReady',
        label: 'Predictor ready',
        status: 'True',
        lastTransitionTime: '2026-05-26T13:49:27Z',
      },
      {
        type: 'IngressReady',
        label: 'Ingress ready',
        status: 'True',
        lastTransitionTime: '2026-05-26T13:49:01Z',
      },
      {
        type: 'LatestDeploymentReady',
        label: 'Deployment ready',
        status: 'True',
        lastTransitionTime: '2026-05-26T13:49:27Z',
      },
    ]);

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByTestId('deployment-condition-DeploymentRequested')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-condition-PredictorReady')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-condition-IngressReady')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-condition-LatestDeploymentReady')).toBeInTheDocument();
  });

  it('should show error message for failed conditions', () => {
    const deployment = createMockDeployment(
      [
        {
          type: 'PredictorReady',
          label: 'Predictor ready',
          status: 'False',
          reason: 'ProgressDeadlineExceeded',
          message: 'ReplicaSet has timed out progressing.',
          lastTransitionTime: '2026-05-25T02:23:56Z',
        },
      ],
      { state: ModelDeploymentState.FAILED_TO_LOAD },
    );

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByText('ReplicaSet has timed out progressing.')).toBeInTheDocument();
  });

  it('should render nested children conditions', () => {
    const deployment = createMockDeployment([
      {
        type: 'RouterReady',
        label: 'Router / scheduler',
        status: 'True',
        lastTransitionTime: '2026-05-26T13:51:21Z',
        children: [
          {
            type: 'HTTPRoutesReady',
            label: 'HTTP routes ready',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'InferencePoolReady',
            label: 'Inference pool ready',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:50:40Z',
          },
        ],
      },
    ]);

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByText('Router / scheduler')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-condition-HTTPRoutesReady')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-condition-InferencePoolReady')).toBeInTheDocument();
  });

  it('should show stop button when onStopDeployment is provided', () => {
    const onStop = jest.fn();
    const deployment = createMockDeployment([]);

    render(
      <DeploymentStatusModal
        deployment={deployment}
        onClose={jest.fn()}
        onStopDeployment={onStop}
      />,
    );

    const stopButton = screen.getByTestId('deployment-status-stop-button');
    expect(stopButton).toBeInTheDocument();
    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('should show edit button when onEditDeployment is provided', () => {
    const onEdit = jest.fn();
    const deployment = createMockDeployment([]);

    render(
      <DeploymentStatusModal
        deployment={deployment}
        onClose={jest.fn()}
        onEditDeployment={onEdit}
      />,
    );

    const editButton = screen.getByTestId('deployment-status-edit-button');
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('should not show stop/edit buttons when callbacks are not provided', () => {
    const deployment = createMockDeployment([]);

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.queryByTestId('deployment-status-stop-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deployment-status-edit-button')).not.toBeInTheDocument();
  });

  it('should call onClose when modal is closed', () => {
    const onClose = jest.fn();
    const deployment = createMockDeployment([]);

    render(<DeploymentStatusModal deployment={deployment} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show progress disclaimer on the Progress tab', () => {
    const deployment = createMockDeployment([
      {
        type: 'DeploymentRequested',
        label: 'Deployment requested',
        status: 'True',
        lastTransitionTime: '2026-04-22T15:44:32Z',
      },
    ]);

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByTestId('deployment-status-progress-disclaimer')).toBeInTheDocument();
    expect(
      screen.getByText('Steps may occur in any order, depending on the deployment type.'),
    ).toBeInTheDocument();
  });

  it('should show the queued Kueue state and position in an inline alert', () => {
    const deployment = createMockDeployment([], {
      kueueStatus: {
        status: KueueWorkloadStatus.Queued,
        queueName: 'constrained-queue',
        queuePosition: 2,
      },
    });

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    const alert = screen.getByTestId('deployment-status-kueue-alert');
    expect(alert).toHaveTextContent('Queued: Waiting for quota in constrained-queue');
    expect(alert).toHaveTextContent('2nd in constrained-queue');
    expect(
      alert.compareDocumentPosition(screen.getByTestId('deployment-status-tabs')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each([
    ['Stopped', { isRunning: false, isStopped: true, isStarting: false, isStopping: false }],
    ['Stopping', { isRunning: false, isStopped: false, isStarting: false, isStopping: true }],
  ])('should not show a queued alert when the deployment is %s', (statusLabel, stoppedStates) => {
    const deployment = createMockDeployment([], {
      state: ModelDeploymentState.UNKNOWN,
      stoppedStates,
      kueueStatus: { status: KueueWorkloadStatus.Queued, queueName: 'constrained-queue' },
    });

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByText(statusLabel)).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-status-kueue-alert')).not.toBeInTheDocument();
  });

  it('should show the admitted Kueue message without a queue position', () => {
    const deployment = createMockDeployment([], {
      state: ModelDeploymentState.LOADING,
      kueueStatus: { status: KueueWorkloadStatus.Admitted, queueName: 'constrained-queue' },
    });

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    const alert = screen.getByTestId('deployment-status-kueue-alert');
    expect(alert).toHaveTextContent(
      'Kueue has admitted this job, looking for available resources to start.',
    );
    expect(alert).not.toHaveTextContent('in constrained-queue');
  });

  it('should not show the starting message for a ready deployment', () => {
    const deployment = createMockDeployment([], {
      kueueStatus: { status: KueueWorkloadStatus.Admitted, queueName: 'constrained-queue' },
    });

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.queryByTestId('deployment-status-kueue-alert')).not.toBeInTheDocument();
  });

  it('should not show the Kueue alert without a waiting or admitted workload', () => {
    render(<DeploymentStatusModal deployment={createMockDeployment([])} onClose={jest.fn()} />);

    expect(screen.queryByTestId('deployment-status-kueue-alert')).not.toBeInTheDocument();
  });

  it('should always show the tab strip with a Progress tab, even when Kueue/Resources is not available', () => {
    const deployment = createMockDeployment([]);

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByTestId('deployment-status-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-status-progress-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-status-resources-tab')).not.toBeInTheDocument();
  });

  it('should handle deployment with no conditions', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'kserve',
      model: {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-model',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'Test Model',
          },
        },
      },
      status: {
        state: ModelDeploymentState.UNKNOWN,
      },
    };

    render(<DeploymentStatusModal deployment={deployment} onClose={jest.fn()} />);

    expect(screen.getByText('Test Model status')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-status-steps')).toBeInTheDocument();
  });
});
