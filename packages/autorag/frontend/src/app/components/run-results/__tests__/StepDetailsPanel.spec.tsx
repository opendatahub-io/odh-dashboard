import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useTaskExecutorError } from '@odh-dashboard/autox-core/ui/hooks';
import StepDetailsPanel from '~/app/components/run-results/StepDetailsPanel';
import { STAGE_MAP_UNAVAILABLE_NOTICE } from '~/app/components/run-results/pipelineStatusLabels';
import { AutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { getStepMetadata } from '~/app/topology/tree-view/stepMetadata';
import { parseStageMapNodeId } from '~/app/topology/tree-view/stageMapStepMetadata';
import type { TreeNodeData } from '~/app/topology/tree-view/TreeNode';
import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';

jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/hooks'),
  useTaskExecutorError: jest.fn(),
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
const mockParseStageMapNodeId = jest.mocked(parseStageMapNodeId);

const resultsContextValue = {
  patterns: {},
  optimizationMetric: { name: 'faithfulness', evaluator: 'unitxt' },
};

const renderEmptyPanel = (showStageMapUnavailableNotice = false): void => {
  render(
    <AutoragResultsContext.Provider value={resultsContextValue}>
      <StepDetailsPanel
        statusFilter="error"
        showStageMapUnavailableNotice={showStageMapUnavailableNotice}
      />
    </AutoragResultsContext.Provider>,
  );
};

const renderStep = (nodeData: TreeNodeData, statusFilter: PipelineStatusFilter = 'error'): void => {
  render(
    <AutoragResultsContext.Provider value={resultsContextValue}>
      <StepDetailsPanel
        selectedNodeId="documents-discovery"
        nodeData={nodeData}
        statusFilter={statusFilter}
      />
    </AutoragResultsContext.Provider>,
  );
};

const renderBranchPanel = (): void => {
  const { getStepMetadata: getStepMetadataMock } = jest.requireMock(
    '~/app/topology/tree-view/stepMetadata',
  ) as { getStepMetadata: jest.Mock };
  mockParseStageMapNodeId.mockReturnValue({
    type: 'branch_pattern',
    componentId: 'rag_optimization',
    branchIndex: 0,
  });
  getStepMetadataMock.mockReturnValue({ description: 'Pattern details', details: [] });

  render(
    <AutoragResultsContext.Provider
      value={{
        patterns: { generatedKey: { name: 'Pattern One' } } as never,
        optimizationMetric: { name: 'faithfulness', evaluator: 'unitxt' },
        patternRankMap: { generatedKey: 1 },
        rankOnePatternKey: 'generatedKey',
        patternRanksAuthoritative: false,
      }}
    >
      <StepDetailsPanel
        selectedNodeId="rag_optimization__pattern__branch-0"
        nodeData={{ label: 'Pattern One', patternKey: 'generatedKey', stepState: 'completed' }}
        selectedPattern="generatedKey"
        statusFilter="completed"
        componentStageMap={
          {
            components: [
              {
                id: 'rag_optimization',
                description: 'RAG optimization',
                stages: [{ id: 'optimize_templates', description: 'Optimize' }],
              },
            ],
          } as never
        }
      />
    </AutoragResultsContext.Provider>,
  );
};

describe('StepDetailsPanel', () => {
  beforeEach(() => {
    mockUseTaskExecutorError.mockReturnValue({ isLoading: false, isError: false });
    mockParseStageMapNodeId.mockReturnValue(undefined);
    jest.mocked(getStepMetadata).mockReturnValue({
      description: 'Discovers documents in the connected storage.',
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

  it('should use the rank-one pattern record when backend ranks are authoritative', () => {
    jest.mocked(getStepMetadata).mockReturnValue({
      description: 'Leaderboard details',
      details: [{ label: 'Best pattern', value: 'Legacy winner' }],
    });
    mockParseStageMapNodeId.mockReturnValue({
      type: 'stage',
      componentId: 'leaderboard',
      stageId: 'build_leaderboard',
    });

    render(
      <AutoragResultsContext.Provider
        value={{
          patterns: {
            'record-key': {
              name: 'Display Pattern',
              evaluation: { metrics: [] },
            },
          } as never,
          optimizationMetric: { name: 'faithfulness', evaluator: 'unitxt' },
          patternRankMap: { 'record-key': 1 },
          rankOnePatternKey: 'record-key',
          patternRanksAuthoritative: true,
        }}
      >
        <StepDetailsPanel
          selectedNodeId="leaderboard__build_leaderboard"
          nodeData={{ label: 'Build leaderboard', stepState: 'completed' }}
          statusFilter="completed"
          componentStageMap={{ components: [] } as never}
        />
      </AutoragResultsContext.Provider>,
    );

    expect(screen.getByText('Display Pattern')).toBeInTheDocument();
    expect(screen.queryByText('Legacy winner')).not.toBeInTheDocument();
  });

  it('should not show a stage map unavailable notice when the flag is false', () => {
    renderEmptyPanel();

    expect(screen.queryByTestId('stage-map-unavailable-alert')).not.toBeInTheDocument();
    expect(screen.getByText('Select a step to view its details.')).toBeInTheDocument();
  });

  it('should keep the generic failure sentence when no executor error is available', () => {
    renderStep({ label: 'Documents discovery', stepState: 'failed' });

    expect(screen.getByTestId('step-failed-alert')).toBeInTheDocument();
    // Inline (flat, no box-shadow) like the other alerts in the panel.
    expect(screen.getByTestId('step-failed-alert')).toHaveClass('pf-m-inline');
    expect(
      screen.getByText('The pipeline stopped during Documents discovery.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('step-failed-error-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-failed-view-logs')).not.toBeInTheDocument();
    // The fallback-topology node id is the KFP task name, so it is the task key.
    expect(mockUseTaskExecutorError).toHaveBeenCalledWith(
      expect.objectContaining({ taskKey: 'documents-discovery', enabled: true }),
    );
  });

  it('should show a loading indicator while retrieving failure details', () => {
    mockUseTaskExecutorError.mockReturnValue({ isLoading: true, isError: false });

    renderStep({ label: 'Documents discovery', stepState: 'failed' });

    expect(screen.getByTestId('step-failed-error-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('step-failed-view-logs')).not.toBeInTheDocument();
  });

  it('should show the executor logs in a tearsheet when View logs is clicked', () => {
    const logText =
      '[KFP Executor ERROR]: TestDataLoaderError: Incorrect or incomplete keys in test data record.';
    mockUseTaskExecutorError.mockReturnValue({
      logText,
      isLoading: false,
      isError: false,
    });

    renderStep({ label: 'Documents discovery', stepState: 'failed' });

    // The log is not rendered inline in the alert — only the button is shown.
    expect(screen.queryByTestId('executor-logs-content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('step-failed-view-logs'));

    expect(screen.getByTestId('executor-logs-content')).toHaveTextContent(logText);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('executor-logs-content')).not.toBeInTheDocument();
  });

  it('should not request executor errors for non-failed steps', () => {
    renderStep({ label: 'Documents discovery', stepState: 'completed' }, 'completed');

    expect(screen.queryByTestId('step-failed-alert')).not.toBeInTheDocument();
    expect(mockUseTaskExecutorError).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('should identify the best pattern from the selected node pattern key', () => {
    renderBranchPanel();

    expect(screen.getByRole('heading', { name: 'Best pattern' })).toBeInTheDocument();
  });
});
