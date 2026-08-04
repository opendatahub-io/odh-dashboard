import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Deployment, DeploymentCondition } from '../../../../extension-points';
import { ModelDeploymentState } from '../../../shared/types';
import DeploymentStatusModal from '../DeploymentStatusModal';

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

    expect(screen.getByText('Deployment status')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
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

    expect(screen.getByText('Deployment status')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-status-steps')).toBeInTheDocument();
  });
});
