import { action, Graph, isNode, Node } from '@patternfly/react-topology';

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

/** Keep the graph's DOM order aligned with the laid-out pipeline, including nested groups. */
export const orderNodesForKeyboard = action((parent: Graph | Node): void => {
  const nodes = parent.getNodes();
  const orderedNodes = nodes.toSorted((a, b) => {
    const aBounds = a.getBounds();
    const bBounds = b.getBounds();
    return aBounds.y - bBounds.y || aBounds.x - bBounds.x || a.getId().localeCompare(b.getId());
  });

  if (nodes.some((node, index) => node !== orderedNodes[index])) {
    orderedNodes.forEach((node) => parent.appendChild(node));
  }
  orderedNodes.filter((node) => node.isGroup()).forEach(orderNodesForKeyboard);
});
