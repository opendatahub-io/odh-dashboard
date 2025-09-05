/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { AbstractAnchor, Node, Point, ScaleDetailsLevel } from '@patternfly/react-topology';
import { TaskPillDimensions } from '#~/src/components/lineage/node/LineageTaskPill';

/**
 * Custom source anchor that positions connection points at the right edge of the node
 * Uses calculated dimensions from TaskPill for precise positioning
 */
export class LineageSourceAnchor extends AbstractAnchor {
  constructor(node: Node) {
    super(node);
  }

  getLocation(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;
    const data = this.owner.getData();
    const pillDimensions = data?.pillDimensions as TaskPillDimensions;
    const detailsLevel = this.owner.getGraph().getDetailsLevel();

    // If we have pill dimensions, use the calculated pill width for precise positioning
    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high) {
      const pillRight = x + pillDimensions.offsetX + pillDimensions.pillWidth;
      return new Point(pillRight, y + pillDimensions.height / 2);
    }

    // For lower detail levels or when pill dimensions aren't available, use the bounds-based approach
    if (detailsLevel !== ScaleDetailsLevel.high) {
      // Similar to TaskNodeSourceAnchor's low-detail logic
      const statusIconSize = 16; // Default status icon size
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize, y + height / 2);
    }

    // Fallback to bounds-based positioning
    return new Point(x + bounds.width, y + height / 2);
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;
    const data = this.owner.getData();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const pillDimensions = data?.pillDimensions as TaskPillDimensions;
    const detailsLevel = this.owner.getGraph().getDetailsLevel();

    // If we have pill dimensions, use them for more precise reference point
    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high) {
      const pillRight = x + pillDimensions.offsetX + pillDimensions.pillWidth;
      return new Point(pillRight + 20, y + pillDimensions.height / 2);
    }

    // For lower detail levels, adjust reference point based on node size
    if (detailsLevel !== ScaleDetailsLevel.high) {
      const statusIconSize = 16;
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize + 20, y + height / 2);
    }

    // Fallback
    return new Point(x + bounds.width + 20, y + height / 2);
  }
}

/**
 * Custom target anchor that positions connection points at the left edge of the node
 * Uses calculated dimensions from TaskPill for precise positioning
 */
export class LineageTargetAnchor extends AbstractAnchor {
  constructor(node: Node) {
    super(node);
  }

  getLocation(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;
    const data = this.owner.getData();
    const pillDimensions = data?.pillDimensions as TaskPillDimensions;
    const detailsLevel = this.owner.getGraph().getDetailsLevel();

    // If we have pill dimensions, use them for precise positioning
    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high) {
      const pillLeft = x + pillDimensions.offsetX;
      return new Point(pillLeft, y + pillDimensions.height / 2);
    }

    // For lower detail levels, use center of status icon area
    if (detailsLevel !== ScaleDetailsLevel.high) {
      const statusIconSize = 16;
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize, y + height / 2);
    }

    // Fallback to left edge
    return new Point(x, y + height / 2);
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;
    const data = this.owner.getData();
    const pillDimensions = data?.pillDimensions as TaskPillDimensions;
    const detailsLevel = this.owner.getGraph().getDetailsLevel();

    // If we have pill dimensions, use them for reference point
    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high) {
      const pillLeft = x + pillDimensions.offsetX;
      return new Point(pillLeft - 20, y + pillDimensions.height / 2);
    }

    // For lower detail levels
    if (detailsLevel !== ScaleDetailsLevel.high) {
      const statusIconSize = 16;
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize - 20, y + height / 2);
    }

    // Fallback
    return new Point(x - 20, y + height / 2);
  }
}
