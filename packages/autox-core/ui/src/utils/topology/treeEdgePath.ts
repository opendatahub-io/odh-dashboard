export type TreeEdgeBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Connect node side-centers so fan-out branches stay vertically aligned with
 * each icon, instead of PF angle-based anchors that drift farther from center.
 */
export const buildTreeEdgePath = (source: TreeEdgeBounds, target: TreeEdgeBounds): string => {
  const startY = source.y + source.height / 2;
  const endY = target.y + target.height / 2;
  const startX = source.x + source.width;
  const endX = target.x;

  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return '';
  }

  const isHorizontal = Math.abs(startY - endY) < 5;

  if (isHorizontal) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const midX = (startX + endX) / 2;
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
};
