import { Node, Visualization } from '@patternfly/react-topology';

const POSITION_TOLERANCE = 1;
const LINEAGE_NODE_TEST_ID_PREFIX = 'feature-store-lineage-node-';
const LINEAGE_NODE_FOCUS_LABEL_ATTR = 'data-lineage-focus-label';
const LINEAGE_PILL_BACKGROUND_SELECTOR = '[data-testid="lineage-pill-background"]';

export const getLineageNodeSelector = (nodeId: string): string =>
  `[data-testid="${LINEAGE_NODE_TEST_ID_PREFIX}${CSS.escape(nodeId)}"]`;

type LineageNodeFocusTarget = {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
};

/** Left-to-right, top-to-bottom using post-layout graph coordinates. */
const compareLineageNodeTabOrder = (a: Node, b: Node): number => {
  const posA = a.getPosition();
  const posB = b.getPosition();
  const xDiff = posA.x - posB.x;
  if (Math.abs(xDiff) > POSITION_TOLERANCE) {
    return xDiff;
  }
  const yDiff = posA.y - posB.y;
  if (Math.abs(yDiff) > POSITION_TOLERANCE) {
    return yDiff;
  }
  return a.getLabel().localeCompare(b.getLabel());
};

export const measureLineageNodeFocusTargets = (
  controller: Visualization,
  container: HTMLElement,
): LineageNodeFocusTarget[] => {
  const containerRect = container.getBoundingClientRect();

  return [...controller.getGraph().getNodes()]
    .toSorted(compareLineageNodeTabOrder)
    .flatMap((node) => {
      const id = node.getId();
      const nodeElement = container.querySelector(getLineageNodeSelector(id));
      if (!(nodeElement instanceof Element)) {
        return [];
      }

      const pillElement = nodeElement.querySelector(LINEAGE_PILL_BACKGROUND_SELECTOR);
      const focusElement = pillElement instanceof Element ? pillElement : nodeElement;
      const focusRect = focusElement.getBoundingClientRect();
      if (focusRect.width <= 0 || focusRect.height <= 0) {
        return [];
      }

      return [
        {
          id,
          label: nodeElement.getAttribute(LINEAGE_NODE_FOCUS_LABEL_ATTR) ?? node.getLabel(),
          left: focusRect.left - containerRect.left,
          top: focusRect.top - containerRect.top,
          width: focusRect.width,
          height: focusRect.height,
          borderRadius: Math.min(focusRect.width, focusRect.height) / 2,
        },
      ];
    });
};

export const activateLineageNode = (nodeGroup: Element, clientX: number, clientY: number): void => {
  nodeGroup.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  );
};
