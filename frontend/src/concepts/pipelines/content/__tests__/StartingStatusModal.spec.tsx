import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { K8sCondition, ProjectKind } from '#~/k8sTypes';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { MetadataStoreServicePromiseClient } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_service_grpc_web_pb';
import { PipelineAPIs } from '#~/concepts/pipelines/types';
import {
  useWatchPodsForPipelineServerEvents,
  useWatchMultiplePodEvents,
} from '#~/concepts/pipelines/context/usePipelineEvents.ts';

const fullMessage1 =
  '2025-06-20T20:15:44Z [AddedInterface] [Normal] Add eth0 [10.129.2.134/23] from ovn-kubernetes';
const fullMessage2 =
  '2025-06-20T20:15:44Z [Pulling] [Normal] Pulling image "quay.io/opendatahub/ds-pipelines-frontend:latest"';
const fullMessage3 =
  '2025-06-20T20:15:44.409955Z [Scheduled] [Normal] Successfully assigned brand-new-one/ds-pipeline-ui-dspa-dbb65fdf6-fnsz7 to ip-10-0-6-114.ec2.internal';

const mockEvents = [
  {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: {
      uid: 'f74a4da1-2b46-45f0-98e1-d7e844974a19',
    },
    involvedObject: {
      name: 'ds-pipeline-ui-dspa-dbb65fdf6-fnsz7',
    },
    lastTimestamp: '2025-06-20T20:15:44Z',
    eventTime: '2025-06-20T20:15:44Z',
    type: 'Normal' as const,
    reason: 'AddedInterface',
    message: 'Add eth0 [10.129.2.134/23] from ovn-kubernetes',
  },
  {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: {
      uid: '7cf5c6de-802a-41c2-81de-d007a1a1fdb5',
    },
    involvedObject: {
      name: 'ds-pipeline-ui-dspa-dbb65fdf6-fnsz7',
    },
    lastTimestamp: '2025-06-20T20:15:44Z',
    eventTime: '2025-06-20T20:15:44Z',
    type: 'Normal' as const,
    reason: 'Pulling',
    message: 'Pulling image "quay.io/opendatahub/ds-pipelines-frontend:latest"',
  },
  {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: {
      uid: 'a73aa9ca-628f-4ff9-9087-fc5afdbdfd2e',
    },
    involvedObject: {
      name: 'ds-pipeline-ui-dspa-dbb65fdf6-fnsz7',
    },
    eventTime: '2025-06-20T20:15:44.409955Z',
    type: 'Normal' as const,
    reason: 'Scheduled',
    message:
      'Successfully assigned brand-new-one/ds-pipeline-ui-dspa-dbb65fdf6-fnsz7 to ip-10-0-6-114.ec2.internal',
  },
];

// Mock the usePipelinesAPI hook
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

// Mock the pipeline events hooks that use useK8sWatchResource
jest.mock('#~/concepts/pipelines/context/usePipelineEvents.ts', () => ({
  useWatchPodsForPipelineServerEvents: jest.fn(),
  useWatchMultiplePodEvents: jest.fn(),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);
const mockUseWatchPodsForPipelineServerEvents = jest.mocked(useWatchPodsForPipelineServerEvents);
const mockUseWatchMultiplePodEvents = jest.mocked(useWatchMultiplePodEvents);

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
    // Mock the pipeline events hooks to return empty arrays
    mockUseWatchPodsForPipelineServerEvents.mockReturnValue([[], false, undefined]);
    mockUseWatchMultiplePodEvents.mockReturnValue(mockEvents);

    // Set up default mock for usePipelinesAPI
    mockUsePipelinesAPI.mockReturnValue(
      createMockConditions([
        { type: 'APIServerReady', status: 'False', message: 'API server not ready' },
        { type: 'Ready', status: 'False', message: 'Server not ready' },
      ]),
    );
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

    // Progress tab is the default tab, so conditions should be visible
    conditions.forEach((condition) => {
      expect(screen.getByText(condition.type)).toBeInTheDocument();
    });
  });

  it('should display events in the events log tab', () => {
    render(<StartingStatusModal onClose={mockOnClose} />);

    // Switch to events log tab
    fireEvent.click(screen.getByText('Events log'));

    // const fullMessages = [ack, ack2, ack3];
    // the messages should be in the screen
    expect(screen.getByText(fullMessage1)).toBeInTheDocument();
    expect(screen.getByText(fullMessage2)).toBeInTheDocument();
    expect(screen.getByText(fullMessage3)).toBeInTheDocument();
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
