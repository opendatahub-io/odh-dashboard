/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { AbstractAnchor, Node, Point, ScaleDetailsLevel } from '@patternfly/react-topology';
import { TaskPillDimensions } from '#~/components/lineage/node/LineageTaskPill';

/**
 * Custom source anchor that positions connection points at the right edge of the node
 * Uses calculated dimensions from LineageTaskPill for precise positioning
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

    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high && pillDimensions.pillWidth > 0) {
      const pillRight = x + pillDimensions.offsetX + pillDimensions.pillWidth;
      return new Point(pillRight, y + pillDimensions.height / 2);
    }

    // Use original working logic for all fallbacks
    if (detailsLevel !== ScaleDetailsLevel.high) {
      const statusIconSize = 16;
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize, y + height / 2);
    }

    // High detail level but no pill dimensions yet - use smart estimation
    const label = this.owner.getLabel();
    let estimatedWidth;

    if (bounds.width > 0) {
      estimatedWidth = bounds.width;
    } else if (label && label.length > 10) {
      // Estimate based on label length for large nodes
      estimatedWidth = Math.max(120, Math.min(200, label.length * 6 + 80));
    } else {
      // Small nodes
      estimatedWidth = 60;
    }

    return new Point(x + estimatedWidth, y + height / 2);
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;
    const data = this.owner.getData();
    const pillDimensions = data?.pillDimensions as TaskPillDimensions;
    const detailsLevel = this.owner.getGraph().getDetailsLevel();

    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high) {
      const pillRight = x + pillDimensions.offsetX + pillDimensions.pillWidth;
      return new Point(pillRight + 20, y + pillDimensions.height / 2);
    }

    if (detailsLevel !== ScaleDetailsLevel.high) {
      const statusIconSize = 16;
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize + 20, y + height / 2);
    }

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

    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high && pillDimensions.pillWidth > 0) {
      const pillLeft = x + pillDimensions.offsetX;
      return new Point(pillLeft, y + pillDimensions.height / 2);
    }

    // Use original working logic for all fallbacks
    if (detailsLevel !== ScaleDetailsLevel.high) {
      const statusIconSize = 16;
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize, y + height / 2);
    }

    // High detail level but no pill dimensions yet - target anchor is at left edge
    return new Point(x, y + height / 2);
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;
    const data = this.owner.getData();
    const pillDimensions = data?.pillDimensions as TaskPillDimensions;
    const detailsLevel = this.owner.getGraph().getDetailsLevel();

    if (pillDimensions && detailsLevel === ScaleDetailsLevel.high) {
      const pillLeft = x + pillDimensions.offsetX;
      return new Point(pillLeft - 20, y + pillDimensions.height / 2);
    }

    if (detailsLevel !== ScaleDetailsLevel.high) {
      const statusIconSize = 16;
      const nodeSize = statusIconSize / this.owner.getGraph().getScale();
      return new Point(x + nodeSize - 20, y + height / 2);
    }

    return new Point(x - 20, y + height / 2);
  }
}
