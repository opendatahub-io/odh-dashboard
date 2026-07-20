import {
  ComponentFactory,
  GraphComponent,
  ModelKind,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
import TreeNode from './TreeNode';
import TreeEdge from './TreeEdge';

export const TREE_NODE_TYPE = 'tree-node';
export const TREE_EDGE_TYPE = 'tree-edge';

export const treeComponentFactory: ComponentFactory = (kind) => {
  switch (kind) {
    case ModelKind.graph:
      return withPanZoom()(withSelection()(GraphComponent));
    case ModelKind.node:
      return withSelection()(TreeNode);
    case ModelKind.edge:
      return TreeEdge;
    default:
      return undefined;
  }
};
