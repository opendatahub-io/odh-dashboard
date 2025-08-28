import { Point } from '@patternfly/react-topology/dist/esm/geom';

export interface CurveConfig {
  controlRatio: number;
  maxControlDistance: number;
  minControlDistance: number;
}

export const DEFAULT_CURVE_CONFIG: CurveConfig = {
  controlRatio: 0.4,
  maxControlDistance: 60,
  minControlDistance: 20,
};

/**
 * Creates a curved SVG path between two points that mimics data lineage flow
 * @param startPoint - The starting point
 * @param endPoint - The ending point
 * @param bendpoints - Any intermediate bend points
 * @param curveOffset - How much to curve the line (default: 80)
 * @param config - Configuration for curve parameters
 * @returns SVG path string
 */
export const createCurvedPath = (
  startPoint: Point,
  endPoint: Point,
  bendpoints: Point[] = [],
  curveOffset = 80,
  config: CurveConfig = DEFAULT_CURVE_CONFIG,
): string => {
  // If we have bendpoints, use them to create a multi-segment curved path
  if (bendpoints.length > 0) {
    return createMultiSegmentPath(startPoint, endPoint, bendpoints, curveOffset);
  }

  return createSimpleCurvedPath(startPoint, endPoint, config);
};

/**
 * Creates a multi-segment curved path through bendpoints
 */
const createMultiSegmentPath = (
  startPoint: Point,
  endPoint: Point,
  bendpoints: Point[],
  curveOffset: number,
): string => {
  let path = `M${startPoint.x} ${startPoint.y}`;
  let prevPoint = startPoint;

  bendpoints.forEach((bendpoint) => {
    const dx = bendpoint.x - prevPoint.x;

    // Create horizontal-first flow
    const controlDistance = Math.abs(dx) * 0.5;
    const controlX1 = prevPoint.x + Math.min(controlDistance, curveOffset);
    const controlY1 = prevPoint.y;
    const controlX2 = bendpoint.x - Math.min(controlDistance, curveOffset);
    const controlY2 = bendpoint.y;

    path += ` C${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${bendpoint.x} ${bendpoint.y}`;
    prevPoint = bendpoint;
  });

  // Final curve to end point
  const finalDx = endPoint.x - prevPoint.x;
  const finalControlDistance = Math.abs(finalDx) * 0.5;
  const finalControlX1 = prevPoint.x + Math.min(finalControlDistance, curveOffset);
  const finalControlY1 = prevPoint.y;
  const finalControlX2 = endPoint.x - Math.min(finalControlDistance, curveOffset);
  const finalControlY2 = endPoint.y;

  path += ` C${finalControlX1} ${finalControlY1}, ${finalControlX2} ${finalControlY2}, ${endPoint.x} ${endPoint.y}`;
  return path;
};

/**
 * Creates a simple curved path between two points using horizontal S-curve
 */
const createSimpleCurvedPath = (
  startPoint: Point,
  endPoint: Point,
  config: CurveConfig,
): string => {
  const dx = endPoint.x - startPoint.x;
  const horizontalDistance = Math.abs(dx);

  // Calculate control points for gentle S-curve
  const baseControlDistance = horizontalDistance * config.controlRatio;
  const controlDistance = Math.max(
    config.minControlDistance,
    Math.min(baseControlDistance, config.maxControlDistance),
  );

  // Create horizontal S-curve - control points only move horizontally
  const controlX1 = startPoint.x + (dx > 0 ? controlDistance : -controlDistance);
  const controlY1 = startPoint.y;

  const controlX2 = endPoint.x - (dx > 0 ? controlDistance : -controlDistance);
  const controlY2 = endPoint.y;

  return `M${startPoint.x} ${startPoint.y} C${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endPoint.x} ${endPoint.y}`;
};

/**
 * Calculates background path points for terminal positioning
 */
export const calculateBackgroundPath = (
  startPoint: Point,
  endPoint: Point,
  bendpoints: Point[],
  startTerminalType: string,
  endTerminalType: string,
  startTerminalSize: number,
  endTerminalSize: number,
  curveOffset: number,
  getConnectorStartPoint: (target: Point, source: Point, size: number) => [number, number],
): string => {
  const bgStartPoint =
    startTerminalType === 'none'
      ? [startPoint.x, startPoint.y]
      : getConnectorStartPoint(bendpoints[0] || endPoint, startPoint, startTerminalSize);

  const bgEndPoint =
    endTerminalType === 'none'
      ? [endPoint.x, endPoint.y]
      : getConnectorStartPoint(
          bendpoints[bendpoints.length - 1] || startPoint,
          endPoint,
          endTerminalSize,
        );

  return createCurvedPath(
    new Point(bgStartPoint[0], bgStartPoint[1]),
    new Point(bgEndPoint[0], bgEndPoint[1]),
    bendpoints,
    curveOffset,
  );
};
