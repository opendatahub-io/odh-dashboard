export type TreeEdgeBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Row-label column — keep in sync with transformStageMapNodesToTree placement. */
export const ROW_LABEL_WIDTH = 68;
export const ROW_LABEL_GAP = 24;

export type TreeEdgePathOptions = {
  /**
   * X range reserved for model row labels. Fan-out curves flatten at `start`
   * and resume after `end` so the path does not cross the text.
   */
  clearX?: { start: number; end: number };
};

/**
 * Horizontal x-range occupied by a row label sitting to the left of a branch node.
 */
export const fanOutLabelClearX = (targetLeft: number): { start: number; end: number } => ({
  start: targetLeft - ROW_LABEL_GAP - ROW_LABEL_WIDTH,
  end: targetLeft - ROW_LABEL_GAP,
});

/**
 * Connect node side-centers with a smooth cubic fan. Fan-out into the model
 * table flattens before the row-label column and skips that column.
 */
export const buildTreeEdgePath = (
  source: TreeEdgeBounds,
  target: TreeEdgeBounds,
  options?: TreeEdgePathOptions,
): string => {
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

  const clearX = options?.clearX;
  const flattenX =
    clearX && clearX.start > startX && clearX.start < endX ? clearX.start : (startX + endX) / 2;
  const midX = (startX + flattenX) / 2;
  const curve = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${flattenX} ${endY}`;

  if (clearX && flattenX === clearX.start && clearX.end < endX) {
    return `${curve} M ${clearX.end} ${endY} L ${endX} ${endY}`;
  }

  if (flattenX < endX) {
    return `${curve} L ${endX} ${endY}`;
  }

  return curve;
};
