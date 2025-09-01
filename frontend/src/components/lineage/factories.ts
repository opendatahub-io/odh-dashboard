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
} from '@patternfly/react-topology';
import CurvedEdge from './edge/CurvedEdge';
import LineageNode from './LineageNode';

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

export const lineageComponentFactory: ComponentFactory = (kind: ModelKind, type: string) => {
  switch (type) {
    case 'group':
      return DefaultGroup;
    case 'curved-edge':
      return withSelection()(CurvedEdge);
    case 'lineage-node':
      return withSelection()(LineageNode);
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(withSelection()(GraphComponent));
        case ModelKind.node:
          return withSelection()(LineageNode);
        case ModelKind.edge:
          return withSelection()(CurvedEdge);
        default:
          return undefined;
      }
  }
};
