import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import TreeTopology from '~/app/topology/tree-view/TreeTopology';
import type { TreeTopologyData } from '~/app/topology/tree-view/types';

jest.mock('~/app/topology/tree-view/treeFactories', () => ({
  treeComponentFactory: jest.fn(),
}));

const visualizationInstances: Array<{ fromModel: jest.Mock }> = [];

jest.mock('@patternfly/react-topology', () => ({
  Layout: class Layout {},
  SELECTION_EVENT: 'selection',
  action: (fn: () => void) => fn,
  createTopologyControlButtons: jest.fn(() => []),
  defaultControlButtonsOptions: {},
  TopologyControlBar: () => <div data-testid="topology-control-bar" />,
  TopologyView: ({
    children,
    controlBar,
  }: {
    children: React.ReactNode;
    controlBar?: React.ReactNode;
  }) => (
    <>
      {controlBar}
      {children}
    </>
  ),
  Visualization: jest.fn().mockImplementation(() => {
    const instance = {
      setRenderConstraint: jest.fn(),
      setFitToScreenOnLayout: jest.fn(),
      registerComponentFactory: jest.fn(),
      registerLayoutFactory: jest.fn(),
      fromModel: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getGraph: jest.fn(() => ({
        fit: jest.fn(),
        getPosition: jest.fn(() => ({ x: 0, y: 0 })),
        getScale: jest.fn(() => 1),
        scaleBy: jest.fn(),
        reset: jest.fn(),
        layout: jest.fn(),
      })),
    };
    visualizationInstances.push(instance);
    return instance;
  }),
  VisualizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  VisualizationSurface: ({ state }: { state?: { selectedIds?: string[] } }) => (
    <div
      data-testid="tree-topology-surface"
      data-selected-ids={(state?.selectedIds ?? []).join(',')}
    />
  ),
}));

jest.mock('~/app/components/run-results/PipelinePreparingState', () => ({
  __esModule: true,
  default: ({ mode }: { mode?: string }) => (
    <div data-testid="tree-topology-loading" data-loading-mode={mode} />
  ),
}));

const topology: TreeTopologyData = {
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
  ],
  edges: [],
};

describe('TreeTopology', () => {
  beforeEach(() => {
    visualizationInstances.length = 0;
    jest.clearAllMocks();
  });

  it('should show the loading state instead of the graph while preparing or hydrating', () => {
    render(<TreeTopology topology={topology} loadingMode="hydrating" />);

    expect(screen.getByTestId('tree-topology-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-topology')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tree-topology-surface')).not.toBeInTheDocument();
  });

  it('should render zoom controls with the topology surface', async () => {
    render(<TreeTopology topology={topology} />);

    expect(await screen.findByTestId('tree-topology')).toBeInTheDocument();
    expect(screen.getByTestId('tree-topology-control-bar')).toBeInTheDocument();
    expect(screen.getByTestId('tree-topology-surface')).toBeInTheDocument();
  });

  it('should clear the controller when loading starts so stale graph data cannot render', async () => {
    const { rerender } = render(<TreeTopology topology={topology} />);

    expect(await screen.findByTestId('tree-topology')).toBeInTheDocument();
    expect(visualizationInstances).toHaveLength(1);

    rerender(<TreeTopology topology={topology} loadingMode="preparing" />);

    await waitFor(() => {
      expect(screen.getByTestId('tree-topology-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('tree-topology')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tree-topology-surface')).not.toBeInTheDocument();
    });

    rerender(<TreeTopology topology={topology} />);

    expect(await screen.findByTestId('tree-topology')).toBeInTheDocument();
    await waitFor(() => {
      expect(visualizationInstances).toHaveLength(2);
    });
  });

  it('should drop selected ids that are absent after nodes are replaced', async () => {
    const onSelectionChange = jest.fn();
    const replacementTopology: TreeTopologyData = {
      nodes: [
        {
          id: 'node-b',
          type: 'tree-node',
          label: 'Node B',
          width: 100,
          height: 40,
          x: 0,
          y: 0,
          data: { label: 'Node B', stepState: 'completed' },
        },
      ],
      edges: [],
    };

    const { rerender } = render(
      <TreeTopology
        topology={topology}
        selectedIds={['node-a']}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(await screen.findByTestId('tree-topology')).toBeInTheDocument();
    expect(onSelectionChange).not.toHaveBeenCalled();

    rerender(
      <TreeTopology
        topology={replacementTopology}
        selectedIds={['node-a']}
        onSelectionChange={onSelectionChange}
      />,
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  it('should preserve selected ids that remain present after nodes are replaced', async () => {
    const onSelectionChange = jest.fn();
    const expandedTopology: TreeTopologyData = {
      nodes: [
        ...topology.nodes,
        {
          id: 'node-b',
          type: 'tree-node',
          label: 'Node B',
          width: 100,
          height: 40,
          x: 0,
          y: 40,
          data: { label: 'Node B', stepState: 'pending' },
        },
      ],
      edges: [],
    };

    const { rerender } = render(
      <TreeTopology
        topology={topology}
        selectedIds={['node-a']}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(await screen.findByTestId('tree-topology')).toBeInTheDocument();
    visualizationInstances[0].fromModel.mockClear();

    rerender(
      <TreeTopology
        topology={expandedTopology}
        selectedIds={['node-a']}
        onSelectionChange={onSelectionChange}
      />,
    );

    await waitFor(() => {
      expect(visualizationInstances[0].fromModel).toHaveBeenCalled();
    });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('should pass normalized selected ids to the visualization surface', async () => {
    render(<TreeTopology topology={topology} selectedIds={['tree-graph', 'node-a']} />);

    expect(await screen.findByTestId('tree-topology-surface')).toHaveAttribute(
      'data-selected-ids',
      'node-a',
    );
  });
});
