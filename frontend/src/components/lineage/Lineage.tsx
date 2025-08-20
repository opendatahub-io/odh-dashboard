import React, { useState, useMemo } from 'react';
import {
  ColaLayout,
  ComponentFactory,
  DefaultGroup,
  DefaultNode,
  EdgeStyle,
  Graph,
  GraphComponent,
  Layout,
  LayoutFactory,
  Model,
  ModelKind,
  NodeShape,
  SELECTION_EVENT,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import CurvedEdge from './CurvedEdge';

const baselineLayoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
  switch (type) {
    case 'Cola':
      return new ColaLayout(graph);
    default:
      return new ColaLayout(graph, { layoutOnDrag: false });
  }
};

const baselineComponentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return DefaultGroup;
    case 'curved-edge':
      return CurvedEdge;
    default:
      switch (kind) {
        case ModelKind.graph:
          return GraphComponent;
        case ModelKind.node:
          return DefaultNode;
        case ModelKind.edge:
          return CurvedEdge; // Use CurvedEdge as default for all edges
        default:
          return undefined;
      }
  }
};

const NODE_SHAPE = NodeShape.ellipse;
const NODE_DIAMETER = 75;

const NODES = [
  {
    id: 'node-0',
    type: 'node',
    label: 'Node 0',
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    shape: NODE_SHAPE,
  },
  {
    id: 'node-1',
    type: 'node',
    label: 'Node 1',
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    shape: NODE_SHAPE,
  },
  {
    id: 'node-2',
    type: 'node',
    label: 'Node 2',
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    shape: NODE_SHAPE,
  },
  {
    id: 'node-3',
    type: 'node',
    label: 'Node 3',
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    shape: NODE_SHAPE,
  },
  {
    id: 'node-4',
    type: 'node',
    label: 'Node 4',
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    shape: NODE_SHAPE,
  },
  {
    id: 'node-5',
    type: 'node',
    label: 'Node 5',
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    shape: NODE_SHAPE,
  },
];

const EDGES = [
  {
    id: 'edge-node-4-node-5',
    type: 'curved-edge',
    source: 'node-4',
    target: 'node-5',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-node-0-node-2',
    type: 'curved-edge',
    source: 'node-0',
    target: 'node-2',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-node-1-node-3',
    type: 'curved-edge',
    source: 'node-1',
    target: 'node-3',
    edgeStyle: EdgeStyle.default,
  },
  {
    id: 'edge-node-2-node-4',
    type: 'curved-edge',
    source: 'node-2',
    target: 'node-4',
    edgeStyle: EdgeStyle.dashed,
  },
  {
    id: 'edge-node-0-node-5',
    type: 'curved-edge',
    source: 'node-0',
    target: 'node-5',
    edgeStyle: EdgeStyle.dotted,
  },
];

export const Lineage: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const controller = useMemo(() => {
    const model: Model = {
      nodes: NODES,
      edges: EDGES,
      graph: {
        id: 'g1',
        type: 'graph',
        layout: 'Cola',
      },
    };

    const newController = new Visualization();
    newController.registerLayoutFactory(baselineLayoutFactory);
    newController.registerComponentFactory(baselineComponentFactory);

    newController.addEventListener(SELECTION_EVENT, setSelectedIds);

    newController.fromModel(model, false);

    return newController;
  }, []);

  return (
    <VisualizationProvider controller={controller}>
      <VisualizationSurface state={{ selectedIds }} />
    </VisualizationProvider>
  );
};
