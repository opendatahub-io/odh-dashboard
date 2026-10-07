import { isNode, Node } from '@patternfly/react-topology';

/** Returns true when a collapsed ancestor hides the node from keyboard navigation. */
export const isHiddenByCollapsedAncestor = (element: Node): boolean => {
  const graph = element.getGraph();
  let parent = element.getParent();
  while (parent !== graph) {
    if (isNode(parent) && parent.isCollapsed()) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
};
