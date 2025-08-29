import { Edge, isNode } from '@patternfly/react-topology';
import { getClosestVisibleParent } from '@patternfly/react-topology/dist/esm/utils';

/**
 * Checks if an edge should be rendered based on its source and target visibility
 * @param element - The edge element to check
 * @returns true if the edge should be rendered, false if it should be hidden
 */
export const shouldRenderEdge = (element: Edge): boolean => {
  // If the edge connects to nodes in a collapsed group, don't draw
  const sourceParent = getClosestVisibleParent(element.getSource());
  const targetParent = getClosestVisibleParent(element.getTarget());

  if (
    sourceParent &&
    isNode(sourceParent) &&
    sourceParent.isCollapsed() &&
    sourceParent === targetParent
  ) {
    return false;
  }

  return true;
};

/**
 * Checks if an edge is a positioning edge (used for layout only)
 * @param element - The edge element to check
 * @returns true if this is a positioning edge
 */
export const isPositioningEdge = (element: Edge): boolean => {
  return element.getData()?.isPositioningEdge === true;
};

/**
 * Gets the effective opacity for an edge based on its type and visibility
 * @param element - The edge element
 * @returns opacity value (0 for hidden, undefined for normal)
 */
export const getEdgeOpacity = (element: Edge): number | undefined => {
  return isPositioningEdge(element) ? 0 : undefined;
};

/**
 * Comprehensive edge visibility check
 * @param element - The edge element to check
 * @returns visibility configuration object
 */
export const getEdgeVisibilityConfig = (
  element: Edge,
): {
  shouldRender: boolean;
  isPositioning: boolean;
  opacity: number | undefined;
} => {
  const shouldRender = shouldRenderEdge(element);
  const isPositioning = isPositioningEdge(element);
  const opacity = getEdgeOpacity(element);

  return {
    shouldRender,
    isPositioning,
    opacity,
  };
};
