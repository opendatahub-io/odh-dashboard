import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { K8sCondition, ProjectKind } from '#~/k8sTypes';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { MetadataStoreServicePromiseClient } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_grpc_web_pb';
import { PipelineAPIs } from '#~/concepts/pipelines/types';

// Mock the usePipelinesAPI hook
jest.mock('../../context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

describe('StartingStatusModal', () => {
  const mockOnClose = jest.fn();

  const createMockConditions = (conditions: K8sCondition[]) => ({
    pipelinesServer: {
      crStatus: {
        conditions,
      },
      initializing: false,
      installed: true,
      compatible: true,
      timedOut: false,
      name: 'test-pipeline',
      isStarting: false,
    },
    namespace: 'test-namespace',
    project: {
      metadata: {
        name: 'test-project',
        annotations: {},
      },
    } as ProjectKind,
    refreshAllAPI: jest.fn(),
    getRecurringRunInformation: jest.fn(),
    metadataStoreServiceClient: new MetadataStoreServicePromiseClient(
      'test-host',
    ) as MetadataStoreServicePromiseClient,
    refreshState: jest.fn(),
    managedPipelines: undefined,
    apiAvailable: true,
    api: {} as PipelineAPIs,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show spinner when no conditions are ready', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
        { type: 'Ready', status: 'False', message: 'Server not ready' },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);

    expect(screen.getByText('Initializing Pipeline Server')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show in progress when APIServerReady is True and ready is Not true', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'True', message: 'API server ready' },
        {
          reason: 'still spinning up.....',
          status: 'False',
          type: 'Ready',
        },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);

    expect(screen.getByTestId('inProgressDescription')).toBeInTheDocument();
  });

  it('should show all ready message when Ready is True', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'True', message: 'API server ready' },
        {
          lastTransitionTime: '2025-06-05T15:08:10Z',
          message: 'All components are ready.',
          reason: 'MinimumReplicasAvailable',
          status: 'True',
          type: 'Ready',
        },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);
    expect(screen.getByTestId('successDescription')).toBeInTheDocument();
  });

  it('should display conditions in the progress tab', () => {
    const conditions = [
      { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
      { type: 'Ready', status: 'False', message: 'Server not ready' },
    ];
    mockUsePipelinesAPI.mockReturnValue(createMockConditions(conditions));

    render(<StartingStatusModal onClose={mockOnClose} />);

    conditions.forEach((condition) => {
      expect(screen.getByText(condition.type)).toBeInTheDocument();
    });
  });

  it('should display conditions in the events log tab', () => {
    const conditions = [
      { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
      {
        lastTransitionTime: '2025-06-05T15:07:33Z',
        message: 'Component [ds-pipeline-dspa] is deploying.',
        reason: 'MinimumReplicasAvailable',
        status: 'False',
        type: 'Ready',
      },
      { type: 'Ready', status: 'False', message: 'Server not ready' },
    ];
    mockUsePipelinesAPI.mockReturnValue(createMockConditions(conditions));

    render(<StartingStatusModal onClose={mockOnClose} />);

    // Switch to events log tab
    fireEvent.click(screen.getByText('Events log'));

    conditions.forEach((condition) => {
      expect(
        screen.getByText(`${condition.type}: ${condition.status} - ${condition.message}`),
      ).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', () => {
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
      ]),
    );

    render(<StartingStatusModal onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
