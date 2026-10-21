import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StepDetailsPanel from '~/app/components/run-results/StepDetailsPanel';
import { STAGE_MAP_UNAVAILABLE_NOTICE } from '~/app/components/run-results/pipelineStatusLabels';
import { AutoragResultsContext } from '~/app/context/AutoragResultsContext';

jest.mock('~/app/topology/stageMapStatus', () => ({
  ...jest.requireActual('~/app/topology/stageMapStatus'),
  getSelectedPatterns: jest.fn(),
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

const renderEmptyPanel = (showStageMapUnavailableNotice = false): void => {
  render(
    <AutoragResultsContext.Provider
      value={{ patterns: {}, optimizationMetric: { name: 'faithfulness', evaluator: 'unitxt' } }}
    >
      <StepDetailsPanel
        statusFilter="error"
        showStageMapUnavailableNotice={showStageMapUnavailableNotice}
      />
    </AutoragResultsContext.Provider>,
  );
};

const renderBranchPanel = (): void => {
  const { getSelectedPatterns } = jest.requireMock('~/app/topology/stageMapStatus') as {
    getSelectedPatterns: jest.Mock;
  };
  const { parseStageMapNodeId } = jest.requireMock(
    '~/app/topology/tree-view/stageMapStepMetadata',
  ) as { parseStageMapNodeId: jest.Mock };
  const { getStepMetadata } = jest.requireMock('~/app/topology/tree-view/stepMetadata') as {
    getStepMetadata: jest.Mock;
  };
  getSelectedPatterns.mockReturnValue({ patterns: ['Pattern One'], isPlaceholder: false });
  parseStageMapNodeId.mockReturnValue({
    type: 'branch_pattern',
    componentId: 'rag_optimization',
    branchIndex: 0,
  });
  getStepMetadata.mockReturnValue({ description: 'Pattern details', details: [] });

  render(
    <AutoragResultsContext.Provider
      value={{
        patterns: { generatedKey: { name: 'Pattern One' } } as never,
        optimizationMetric: { name: 'faithfulness', evaluator: 'unitxt' },
        bestPatternKey: 'generatedKey',
      }}
    >
      <StepDetailsPanel
        selectedNodeId="rag_optimization__pattern__branch-0"
        nodeData={{ label: 'Pattern One', stepState: 'completed' }}
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

  it('should identify a best pattern when the stage map uses its display name', () => {
    renderBranchPanel();

    expect(screen.getByRole('heading', { name: 'Best pattern' })).toBeInTheDocument();
  });
});
