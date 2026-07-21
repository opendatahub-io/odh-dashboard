import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StartNotebookModal from '#~/concepts/notebooks/StartNotebookModal';
import {
  mockCompletedStates,
  mockFailedStates,
  mockInitialStates,
  mockInProgressStates,
} from '#~/concepts/__tests__/mockNotebookStates';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import { EventStatus } from '#~/types';

describe('Start Notebook modal', () => {
  it('should show initial notebook startup status', async () => {
    const mockData = mockInitialStates;
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
    expect(statusLabel).toHaveTextContent('Re-queued (attempt 2');
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
});
