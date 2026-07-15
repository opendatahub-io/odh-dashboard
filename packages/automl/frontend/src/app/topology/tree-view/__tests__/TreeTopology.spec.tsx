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
      })),
    };
    visualizationInstances.push(instance);
    return instance;
  }),
  VisualizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  VisualizationSurface: () => <div data-testid="tree-topology-surface" />,
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
});
