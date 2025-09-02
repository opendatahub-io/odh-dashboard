import { AbstractAnchor, Node, Point } from '@patternfly/react-topology';

/**
 * Custom source anchor that positions connection points at the right edge of the node
 */
export class LineageSourceAnchor extends AbstractAnchor {
  constructor(node: Node) {
    super(node);
  }

  getLocation(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, width, height } = bounds;

    return new Point(x + width, y + height / 2);
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, width, height } = bounds;

    return new Point(x + width + 20, y + height / 2);
  }
}

/**
 * Custom target anchor that positions connection points at the left edge of the node
 */
export class LineageTargetAnchor extends AbstractAnchor {
  constructor(node: Node) {
    super(node);
  }

  getLocation(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;

    return new Point(x, y + height / 2);
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    const { x, y, height } = bounds;

    return new Point(x - 20, y + height / 2);
  }
}
