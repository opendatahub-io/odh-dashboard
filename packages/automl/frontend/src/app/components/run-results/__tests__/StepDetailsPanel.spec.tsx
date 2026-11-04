import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useTaskExecutorError } from '@odh-dashboard/autox-core/ui/hooks';
import StepDetailsPanel from '~/app/components/run-results/StepDetailsPanel';
import { STAGE_MAP_UNAVAILABLE_NOTICE } from '~/app/components/run-results/pipelineStatusLabels';
import { AutomlResultsContext } from '~/app/context/AutomlResultsContext';
import { getStepMetadata } from '~/app/topology/tree-view/stepMetadata';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';

jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/hooks'),
  useTaskExecutorError: jest.fn(),
}));

jest.mock('~/app/topology/stageMapStatus', () => ({
  getSelectedModels: jest.fn(),
  BRANCHING_STAGE_ID: 'branching',
}));

jest.mock('~/app/topology/tree-view/stepMetadata', () => ({
  getStepMetadata: jest.fn(),
}));

jest.mock('~/app/topology/tree-view/stageMapStepMetadata', () => ({
  parseStageMapNodeId: jest.fn(),
}));

jest.mock('~/app/components/run-results/pipelineSummaryMetadata', () => ({
  getPipelineSummaryDetails: jest.fn().mockReturnValue([]),
}));

const mockUseTaskExecutorError = jest.mocked(useTaskExecutorError);

const renderEmptyPanel = (showStageMapUnavailableNotice = false): void => {
  render(
    <AutomlResultsContext.Provider value={{ models: {} }}>
      <StepDetailsPanel
        statusFilter="error"
        showStageMapUnavailableNotice={showStageMapUnavailableNotice}
      />
    </AutomlResultsContext.Provider>,
  );
};

const renderStep = (nodeData: TreeNodeData, statusFilter: PipelineStatusFilter = 'error'): void => {
  render(
    <AutomlResultsContext.Provider value={{ models: {} }}>
      <StepDetailsPanel
        selectedNodeId="model-training"
        nodeData={nodeData}
        statusFilter={statusFilter}
      />
    </AutomlResultsContext.Provider>,
  );
};

describe('StepDetailsPanel', () => {
  beforeEach(() => {
    mockUseTaskExecutorError.mockReturnValue({ isLoading: false, isError: false });
    jest.mocked(getStepMetadata).mockReturnValue({
      description: 'Trains candidate models on the prepared data.',
      details: [],
    });
  });

  it('should show a stage map unavailable notice in the empty details panel', () => {
    renderEmptyPanel(true);

    expect(screen.getByTestId('stage-map-unavailable-alert')).toHaveClass('pf-m-danger');
    expect(screen.getByText(STAGE_MAP_UNAVAILABLE_NOTICE.title)).toBeInTheDocument();
    expect(screen.getByText(STAGE_MAP_UNAVAILABLE_NOTICE.description)).toBeInTheDocument();
    expect(screen.getByText('Select a step to view its details.')).toBeInTheDocument();
  });

  it('should not show a stage map unavailable notice when the flag is false', () => {
    renderEmptyPanel();

    expect(screen.queryByTestId('stage-map-unavailable-alert')).not.toBeInTheDocument();
    expect(screen.getByText('Select a step to view its details.')).toBeInTheDocument();
  });

  it('should keep the generic failure sentence when no executor error is available', () => {
    renderStep({ label: 'Model training', stepState: 'failed' });

    expect(screen.getByTestId('step-failed-alert')).toBeInTheDocument();
    // Inline (flat, no box-shadow) like the other alerts in the panel.
    expect(screen.getByTestId('step-failed-alert')).toHaveClass('pf-m-inline');
    expect(screen.getByText('The pipeline stopped during Model training.')).toBeInTheDocument();
    expect(screen.queryByTestId('step-failed-error-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-failed-view-logs')).not.toBeInTheDocument();
    // The fallback-topology node id is the KFP task name, so it is the task key.
    expect(mockUseTaskExecutorError).toHaveBeenCalledWith(
      expect.objectContaining({ taskKey: 'model-training', enabled: true }),
    );
  });

  it('should show a loading indicator while retrieving failure details', () => {
    mockUseTaskExecutorError.mockReturnValue({ isLoading: true, isError: false });

    renderStep({ label: 'Model training', stepState: 'failed' });

    expect(screen.getByTestId('step-failed-error-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('step-failed-view-logs')).not.toBeInTheDocument();
  });

  it('should show the executor logs in a tearsheet when View logs is clicked', () => {
    const logText = '[KFP Executor ERROR]: ValueError: Invalid feature columns in training data.';
    mockUseTaskExecutorError.mockReturnValue({
      logText,
      isLoading: false,
      isError: false,
    });

    renderStep({ label: 'Model training', stepState: 'failed' });

    // The log is not rendered inline in the alert — only the button is shown.
    expect(screen.queryByTestId('executor-logs-content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('step-failed-view-logs'));

    expect(screen.getByTestId('executor-logs-content')).toHaveTextContent(logText);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('executor-logs-content')).not.toBeInTheDocument();
  });

  it('should not request executor errors for non-failed steps', () => {
    renderStep({ label: 'Model training', stepState: 'completed' }, 'completed');

    expect(screen.queryByTestId('step-failed-alert')).not.toBeInTheDocument();
    expect(mockUseTaskExecutorError).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
