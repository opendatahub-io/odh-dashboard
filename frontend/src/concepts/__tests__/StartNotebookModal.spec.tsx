import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { KUEUE_QUEUE_LABEL } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import useClusterQueue from '@odh-dashboard/ui-core/hooks/useClusterQueue';
import useAssignedFlavor from '@odh-dashboard/ui-core/hooks/useAssignedFlavor';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import StartNotebookModal from '#~/concepts/notebooks/StartNotebookModal';
import {
  ProjectDetailsContext,
  type ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import {
  KueueFilteringState,
  useKueueConfiguration,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import {
  mockCompletedStates,
  mockFailedStates,
  mockInitialStates,
  mockInProgressStates,
} from '#~/concepts/__tests__/mockNotebookStates';
import { EventStatus } from '#~/types';

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/hooks/useClusterQueue', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/hooks/useAssignedFlavor', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  useAccessReview: jest.fn(),
}));

const mockUseKueueConfiguration = jest.mocked(useKueueConfiguration);
const mockUseClusterQueue = jest.mocked(useClusterQueue);
const mockUseAssignedFlavor = jest.mocked(useAssignedFlavor);
const mockUseAccessReview = jest.mocked(useAccessReview);

const kueueEnabledConfig = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: true,
  kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
};

const kueueDisabledConfig = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: false,
  isProjectKueueEnabled: false,
  kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
};

const project = mockProjectK8sResource({ k8sName: 'test-project', enableKueue: true });

const renderResourcesModal = ({
  clusterQueueName,
  currentProject = project,
  localQueues = [],
}: {
  clusterQueueName?: string;
  currentProject?: typeof project;
  localQueues?: ReturnType<typeof mockLocalQueueK8sResource>[];
}) => {
  const notebook = structuredClone(mockInitialStates.notebookState.notebook);
  notebook.metadata.labels = {
    ...notebook.metadata.labels,
    [KUEUE_QUEUE_LABEL]: 'user-queue',
  };

  return render(
    <ProjectDetailsContext.Provider
      value={
        {
          currentProject,
          localQueues: { data: localQueues, loaded: true, error: undefined, refresh: jest.fn() },
        } as unknown as ProjectDetailsContextType
      }
    >
      <StartNotebookModal
        notebook={notebook}
        notebookStatus={mockInitialStates.notebookStatus}
        isStarting={false}
        isStopping={false}
        isRunning={false}
        events={[]}
        buttons={null}
        infrastructureWorkloadProject={currentProject}
        infrastructureWorkloadClusterQueueName={clusterQueueName}
      />
    </ProjectDetailsContext.Provider>,
  );
};

const getNotebookWithDescription = (description: string) => {
  const notebook = structuredClone(mockInitialStates.notebookState.notebook);
  notebook.metadata.annotations ??= {};
  notebook.metadata.annotations['openshift.io/description'] = description;
  return notebook;
};

describe('Start Notebook modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKueueConfiguration.mockReturnValue(kueueDisabledConfig);
    mockUseClusterQueue.mockReturnValue({ clusterQueue: null, loaded: true, error: undefined });
    mockUseAssignedFlavor.mockReturnValue(undefined);
    mockUseAccessReview.mockReturnValue([false, false]);
  });

  it('should show initial notebook startup status', async () => {
    const mockData = mockInitialStates;
    const workbenchDescription = 'Workbench for testing model development';
    const notebookWithDescription = getNotebookWithDescription(workbenchDescription);
    render(
      <StartNotebookModal
        notebook={notebookWithDescription}
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Test Workbench statusStarting');
    expect(within(header).getByTestId('notebook-status-modal-description')).toHaveTextContent(
      workbenchDescription,
    );

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('Waiting for server request to start');

    // 7 top-level steps; pulling/pulled/created are collapsed sub-steps; optional problem steps filtered.
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('treeitem');
    expect(steps).toHaveLength(7);
    expect(steps[0]).toHaveTextContent('Workbench requested');
    expect(steps[1]).toHaveTextContent('Pod created');
    expect(steps[2]).toHaveTextContent('Pod assigned');
    expect(steps[3]).toHaveTextContent('Interface added');
    expect(steps[4]).toHaveTextContent('Starting Workbench container');
    expect(steps[5]).toHaveTextContent('Starting Auth proxy container');
    expect(steps[6]).toHaveTextContent('Workbench started');
  });

  it('should not show a description for a whitespace-only workbench description', () => {
    const mockData = mockInitialStates;
    render(
      <StartNotebookModal
        notebook={getNotebookWithDescription('   ')}
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        buttons={null}
      />,
    );

    expect(screen.queryByTestId('notebook-status-modal-description')).not.toBeInTheDocument();
  });

  it('should show failed notebook startup status', async () => {
    const mockData = mockFailedStates;
    render(
      <StartNotebookModal
        notebook={mockData.notebookState.notebook}
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Test Workbench statusFailed');

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('Failed to scale-up');
    expect(screen.getByTestId('danger-NotTriggerScaleUp')).toBeTruthy();

    // pod_problem is not filtered (ERROR state), so 8 top-level steps.
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('treeitem');
    expect(steps).toHaveLength(8);
    expect(steps[1]).toHaveTextContent('There was a problem with the pod');
  });

  it('should show in progress notebook startup status', async () => {
    const mockData = mockInProgressStates;
    render(
      <StartNotebookModal
        notebook={mockData.notebookState.notebook}
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Test Workbench statusStarting');

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('Pulling auth proxy');

    // 8 top-level + 3 kube-rbac-proxy sub-steps (auto-expanded) = 11 visible items.
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    expect(screen.getAllByRole('treeitem')).toHaveLength(11);
    expect(screen.getAllByTestId('step-status-Success')).toHaveLength(7);
    expect(screen.getAllByTestId('step-status-Pending')).toHaveLength(3);
  });

  it('should show completed notebook startup status', async () => {
    const mockData = mockCompletedStates;
    render(
      <StartNotebookModal
        notebook={mockData.notebookState.notebook}
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Test Workbench statusReady');

    // 8 top-level steps (pvc_attached surfaced by event); sub-steps collapsed, all SUCCESS.
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('treeitem');
    expect(steps).toHaveLength(8);
    expect(screen.getAllByTestId('step-status-Success')).toHaveLength(8);
  });

  it('should show completed notebook startup status for standalone notebooks', async () => {
    const mockData = mockCompletedStates;
    render(
      <StartNotebookModal
        notebook={mockData.notebookState.notebook}
        notebookStatus={mockData.notebookStatus}
        isStarting
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Test Workbench statusReady');

    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('treeitem');
    expect(steps).toHaveLength(8);
    expect(screen.getAllByTestId('step-status-Success')).toHaveLength(8);
  });

  it('should show Kueue Requeued message in modal header even when isRunning is true', () => {
    // Regression: renderLastUpdate() must not short-circuit when a Kueue override is active.
    const mockData = mockInitialStates;
    render(
      <StartNotebookModal
        notebook={mockData.notebookState.notebook}
        notebookStatus={mockData.notebookStatus}
        isStarting={false}
        isStopping={false}
        isRunning // ← pod still appears running
        events={[]}
        kueueStatus={{
          status: KueueWorkloadStatus.Requeued,
          message: 'Evicted due to timeout',
          requeueInfo: { count: 2, requeueAt: '2026-07-15T10:05:00Z' },
        }}
        buttons={null}
      />,
    );

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('attempt 2');
  });

  it.each([
    { label: 'no kueueStatus (null)', kueueStatus: null },
    { label: 'no kueueStatus (undefined)', kueueStatus: undefined },
  ])('should NOT show status label when isRunning=true and $label', ({ kueueStatus }) => {
    const mockData = mockInitialStates;
    render(
      <StartNotebookModal
        notebook={mockData.notebookState.notebook}
        notebookStatus={mockData.notebookStatus}
        isStarting={false}
        isStopping={false}
        isRunning
        events={[]}
        kueueStatus={kueueStatus}
        buttons={null}
      />,
    );

    expect(screen.queryByTestId('notebook-latest-status')).toBeNull();
  });

  it('should NOT show spinner or helper text in error race condition (isError=true, no active spawn)', () => {
    // Regression: error state with no active spawn should not show spinner or helper text.
    render(
      <StartNotebookModal
        notebook={mockInitialStates.notebookState.notebook}
        notebookStatus={{
          currentStatus: EventStatus.ERROR,
          currentEvent: 'Pod failed to start',
          currentEventReason: 'SomeReason',
          currentEventDescription: 'Some description',
        }}
        isStarting={false}
        isStopping={false}
        isRunning={false}
        events={[]}
        buttons={null}
      />,
    );

    expect(screen.queryByTestId('notebook-latest-status')).toBeNull();
    expect(screen.queryByText(/several minutes/i)).toBeNull();
  });

  it('should show stopping notebook status', async () => {
    render(
      <StartNotebookModal
        notebookStatus={null}
        isStarting={false}
        isStopping
        isRunning={false}
        events={[]}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Workbench statusStopping');

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('Shutting down the server');

    // No notebook → no container steps; optional steps filtered → 5 total.
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('treeitem');
    expect(steps).toHaveLength(5);
    expect(screen.getAllByTestId('step-status-Pending')).toHaveLength(5);
  });

  it.each([
    {
      name: 'explicit infrastructure ClusterQueue name',
      renderCase: () => renderResourcesModal({ clusterQueueName: 'explicit-cluster-queue' }),
      expectedClusterQueue: 'explicit-cluster-queue',
      expectedQueueValue: 'explicit-cluster-queue',
    },
    {
      name: 'project LocalQueues fallback',
      renderCase: () =>
        renderResourcesModal({
          localQueues: [
            {
              ...mockLocalQueueK8sResource({ name: 'user-queue' }),
              spec: { clusterQueue: 'fallback-cluster-queue' },
            },
          ],
        }),
      expectedClusterQueue: 'fallback-cluster-queue',
      expectedQueueValue: 'fallback-cluster-queue',
    },
    {
      name: 'missing project queue data',
      renderCase: () => renderResourcesModal({ currentProject: undefined }),
      expectedClusterQueue: undefined,
    },
  ])(
    'should handle $name for Resources',
    async ({ renderCase, expectedClusterQueue, expectedQueueValue }) => {
      mockUseKueueConfiguration.mockReturnValue(kueueEnabledConfig);
      mockUseAccessReview.mockReturnValue([true, false]);

      const user = userEvent.setup();
      renderCase();

      await user.click(screen.getByTestId('expand-resources'));

      expect(mockUseClusterQueue).toHaveBeenCalledWith(expectedClusterQueue);
      if (expectedQueueValue) {
        expect(screen.getByTestId('queue-value')).toHaveTextContent(expectedQueueValue);
      } else {
        expect(screen.getByTestId('resources-no-queue')).toHaveTextContent(
          'No cluster queue information for this workbench.',
        );
      }
    },
  );
});
