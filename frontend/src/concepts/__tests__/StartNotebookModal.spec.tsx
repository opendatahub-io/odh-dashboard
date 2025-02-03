import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StartNotebookModal from '~/concepts/notebooks/StartNotebookModal';
import {
  mockCompletedStates,
  mockFailedStates,
  mockInitialStates,
  mockInProgressStates,
} from '~/concepts/__tests__/mockNotebookStates';

describe('Start Notebook modal', () => {
  const onCloseMock = jest.fn();

  it('should show initial notebook startup status', async () => {
    const mockData = mockInitialStates;
    render(
      <StartNotebookModal
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        onClose={onCloseMock}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Workbench statusStarting');

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('Waiting for server request to start');

    // Validate the steps
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(13);
    expect(steps[0]).toHaveTextContent('Server requested');
    expect(steps[1]).toHaveTextContent('Pod created');
    expect(steps[2]).toHaveTextContent('Pod assigned');
    expect(steps[3]).toHaveTextContent('PVC attached');
    expect(steps[4]).toHaveTextContent('Interface added');
    expect(steps[5]).toHaveTextContent('Pulling workbench image');
    expect(steps[6]).toHaveTextContent('Workbench image pulled');
    expect(steps[7]).toHaveTextContent('Workbench container created');
    expect(steps[8]).toHaveTextContent('Workbench container started');
    expect(steps[9]).toHaveTextContent('Pulling oauth proxy');
    expect(steps[10]).toHaveTextContent('Oauth proxy pulled');
    expect(steps[11]).toHaveTextContent('Oauth proxy container created');
    expect(steps[12]).toHaveTextContent('Oauth proxy container started');
  });

  it('should show failed notebook startup status', async () => {
    const mockData = mockFailedStates;
    render(
      <StartNotebookModal
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        onClose={onCloseMock}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Workbench statusFailed');

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('Failed to scale-up');
    expect(screen.getByTestId('danger-NotTriggerScaleUp')).toBeTruthy();

    // Validate the steps
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(14);
    expect(steps[1]).toHaveTextContent('Failed to scale-up');
  });

  it('should show in progress notebook startup status', async () => {
    const mockData = mockInProgressStates;
    render(
      <StartNotebookModal
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        onClose={onCloseMock}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Workbench statusStarting');

    const statusLabel = screen.getByTestId('notebook-latest-status');
    expect(statusLabel).toHaveTextContent('Pulling oauth proxy');

    // Validate the steps
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(13);
    expect(screen.getAllByTestId('step-status-Success')).toHaveLength(10);
    expect(screen.getAllByTestId('step-status-Pending')).toHaveLength(3);
  });

  it('should show completed notebook startup status', async () => {
    const mockData = mockCompletedStates;
    render(
      <StartNotebookModal
        notebookStatus={mockData.notebookStatus}
        isStarting={mockData.notebookState.isStarting}
        isStopping={mockData.notebookState.isStopping}
        isRunning={mockData.notebookState.isRunning}
        events={mockData.events}
        onClose={onCloseMock}
        buttons={null}
      />,
    );

    // Validate the header contents
    const header = screen.getByTestId('notebook-status-modal-header');
    expect(header).toHaveTextContent('Workbench statusRunning');

    // Validate the steps
    const stepper = screen.getByTestId('notebook-startup-steps');
    expect(stepper).toBeTruthy();
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(13);
    expect(screen.getAllByTestId('step-status-Success')).toHaveLength(13);
  });
});
