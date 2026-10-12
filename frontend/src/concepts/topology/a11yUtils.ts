import { action, Graph, isNode, Node } from '@patternfly/react-topology';

/** The HTML node button supplies the accessible name and keyboard action. */
export const hideSvgTaskLabelsFromKeyboard = (container: SVGElement | null): void => {
  container
    ?.querySelectorAll<SVGTextElement>('.pf-topology-pipelines__pill-text')
    .forEach((label) => {
      label.setAttribute('tabindex', '-1');
      label.setAttribute('aria-hidden', 'true');
    });
};

/** Keep a focused or selected pipeline node visible inside the graph viewport. */
export const panNodeIntoView = (element: Node): void => {
  element.getGraph().panIntoView(element, { offset: 20, minimumVisible: 100 });
};

/** Pan a focused group control into the graph viewport when the group itself is larger. */
export const panGroupControlIntoView = (element: Node, button: HTMLButtonElement): void => {
  const viewport = button.closest('[data-test-id="topology"]');
  if (!viewport) {
    panNodeIntoView(element);
    return;
  }

  const buttonBounds = button.getBoundingClientRect();
  const viewportBounds = viewport.getBoundingClientRect();
  const padding = 20;
  const left = viewportBounds.left + padding;
  const right = viewportBounds.right - padding;
  const top = viewportBounds.top + padding;
  const bottom = viewportBounds.bottom - padding;
  const x =
    buttonBounds.left < left
      ? left - buttonBounds.left
      : buttonBounds.right > right
      ? right - buttonBounds.right
      : 0;
  const y =
    buttonBounds.top < top
      ? top - buttonBounds.top
      : buttonBounds.bottom > bottom
      ? bottom - buttonBounds.bottom
      : 0;

  if (x || y) {
    const graph = element.getGraph();
    graph.setPosition(graph.getPosition().clone().translate(x, y));
  }
};

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
