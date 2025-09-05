import React from 'react';
import {
  ComponentFactory,
  DefaultGroup,
  Graph,
  GraphComponent,
  Layout,
  LayoutFactory,
  ModelKind,
  DagreLayout,
  withPanZoom,
  withSelection,
  WithSelectionProps,
  GraphElement,
} from '@patternfly/react-topology';
import LineageEdge from './edge/LineageEdge';

export const lineageLayoutFactory: LayoutFactory = (
  type: string,
  graph: Graph,
): Layout | undefined => {
  return new DagreLayout(graph, {
    rankdir: 'LR',
    nodesep: 20,
    ranksep: 80,
    marginx: 10,
    marginy: 10,
    edgesep: 15,
    ranker: 'network-simplex',
    layoutOnDrag: false,
  });
};

type NodeComponentType = React.ComponentType<{ element: GraphElement } & WithSelectionProps>;

export const createLineageComponentFactory =
  (customNodeComponent?: NodeComponentType): ComponentFactory =>
  (kind: ModelKind, type: string) => {
    switch (type) {
      case 'group':
        return DefaultGroup;
      case 'curved-edge':
        return withSelection()(LineageEdge);
      case 'lineage-node':
        return customNodeComponent ? withSelection()(customNodeComponent) : undefined;
      default:
        switch (kind) {
          case ModelKind.graph:
            return withPanZoom()(withSelection()(GraphComponent));
          case ModelKind.node:
            return customNodeComponent ? withSelection()(customNodeComponent) : undefined;
          case ModelKind.edge:
            return withSelection()(LineageEdge);
          default:
            return undefined;
        }
    }
  };

// Default component factory for backward compatibility
export const lineageComponentFactory: ComponentFactory = createLineageComponentFactory();
