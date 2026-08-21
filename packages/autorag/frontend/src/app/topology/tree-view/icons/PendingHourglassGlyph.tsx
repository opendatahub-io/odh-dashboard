import * as React from 'react';

/** Design hourglass-half: filled caps, partial top sand, outlined bottom chamber. */
const VIEW_WIDTH = 16;
const VIEW_HEIGHT = 16;
const CX = 8;
const LEFT = 3.5;
const RIGHT = 12.5;
const TOP = 2.2;
const CAP_HEIGHT = 1.2;
const TOP_INNER = TOP + CAP_HEIGHT;
const WAIST = 7.8;
const BOTTOM_CAP_TOP = 12;
const SAND_TOP = TOP_INNER + 0.65;
const STROKE = 1.15;

const HOURGLASS_TOP_SAND = `M ${LEFT + 0.15} ${SAND_TOP} H ${RIGHT - 0.15} L ${CX} ${WAIST - 0.35} Z`;

const HOURGLASS_BOTTOM_OUTLINE = `M ${LEFT + 0.15} ${BOTTOM_CAP_TOP} L ${CX} ${WAIST} L ${RIGHT - 0.15} ${BOTTOM_CAP_TOP}`;

const HOURGLASS_TOP_OUTLINE = `M ${LEFT} ${TOP_INNER} L ${CX} ${WAIST} L ${RIGHT} ${TOP_INNER}`;

/**
 * Pending hourglass for topology badges — design hourglass-half with visible bottom
 * chamber outline (not a blank interior from compound-path evenodd fill).
 */
const PendingHourglassGlyph: React.FC<{ size: number; color: string }> = React.memo(
  ({ size, color }) => (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      aria-hidden="true"
      className="autorag-tree-node__pending-hourglass"
    >
      <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={CAP_HEIGHT} fill={color} />
      <rect x={LEFT} y={BOTTOM_CAP_TOP} width={RIGHT - LEFT} height={CAP_HEIGHT} fill={color} />
      <path d={HOURGLASS_TOP_SAND} fill={color} />
      <path
        className="autorag-tree-node__pending-hourglass-outline"
        d={HOURGLASS_TOP_OUTLINE}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <path
        className="autorag-tree-node__pending-hourglass-outline"
        d={HOURGLASS_BOTTOM_OUTLINE}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  ),
);
PendingHourglassGlyph.displayName = 'PendingHourglassGlyph';

export default PendingHourglassGlyph;
