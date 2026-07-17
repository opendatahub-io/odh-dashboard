import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AutomlPipelineVisualization from '~/app/components/run-results/AutomlPipelineVisualization';
import type { PipelineVisualizationData } from '~/app/topology/tree-view/types';

jest.mock('~/app/topology/tree-view/TreeTopology', () => ({
  __esModule: true,
  default: ({
    selectedIds,
    onSelectionChange,
  }: {
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
  }) => (
    <div data-testid="tree-topology">
      <button type="button" onClick={() => onSelectionChange?.(['node-a'])}>
        Select node A
      </button>
      <button type="button" onClick={() => onSelectionChange?.(['node-b'])}>
        Select node B
      </button>
      <span data-testid="selected-ids">{(selectedIds ?? []).join(',')}</span>
    </div>
  ),
}));

jest.mock('~/app/components/run-results/StepDetailsPanel', () => ({
  __esModule: true,
  default: ({ selectedNodeId }: { selectedNodeId?: string }) => (
    <div data-testid="step-details-panel">{selectedNodeId ?? 'none'}</div>
  ),
}));

jest.mock('~/app/topology/tree-view/transformPipelineData', () => ({
  transformPipelineData: () => ({ status: 'ok', topology: { nodes: [], edges: [] } }),
  getTreeTopologyFromResult: () => ({
    nodes: [
      {
        id: 'node-a',
        type: 'tree-node',
        label: 'Node A',
        width: 100,
        height: 40,
        x: 0,
        y: 0,
        data: { label: 'Node A', stepState: 'completed' },
      },
      {
        id: 'node-b',
        type: 'tree-node',
        label: 'Node B',
        width: 100,
        height: 40,
        x: 0,
        y: 40,
        data: { label: 'Node B', stepState: 'completed' },
      },
    ],
    edges: [],
  }),
}));

const treeViewData: PipelineVisualizationData = {
  stageMapNodes: [],
};

describe('AutomlPipelineVisualization', () => {
  it('should open the details drawer when selecting a different node while closed', async () => {
    const user = userEvent.setup();
    render(
      <AutomlPipelineVisualization
        runTitle="AutoML pipeline run"
        runState="RUNNING"
        treeViewData={treeViewData}
      />,
    );

    await user.click(screen.getByTestId('hide-details'));
    expect(screen.getByTestId('show-details')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select node A' }));

    expect(screen.getByTestId('hide-details')).toBeInTheDocument();
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('node-a');
    expect(screen.getByTestId('step-details-panel')).toHaveTextContent('node-a');
  });

  it('should keep the drawer closed when re-selecting the same node while closed', async () => {
    const user = userEvent.setup();
    render(
      <AutomlPipelineVisualization
        runTitle="AutoML pipeline run"
        runState="RUNNING"
        treeViewData={treeViewData}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Select node A' }));
    await user.click(screen.getByTestId('hide-details'));
    expect(screen.getByTestId('show-details')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select node A' }));

    expect(screen.getByTestId('show-details')).toBeInTheDocument();
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('node-a');
  });
});
