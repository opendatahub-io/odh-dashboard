import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StepDetailsPanel from '~/app/components/run-results/StepDetailsPanel';
import { STAGE_MAP_UNAVAILABLE_NOTICE } from '~/app/components/run-results/pipelineStatusLabels';
import { AutoragResultsContext } from '~/app/context/AutoragResultsContext';

jest.mock('~/app/topology/stageMapStatus', () => ({
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
    <AutoragResultsContext.Provider value={{ patterns: {} }}>
      <StepDetailsPanel
        statusFilter="error"
        showStageMapUnavailableNotice={showStageMapUnavailableNotice}
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
});
