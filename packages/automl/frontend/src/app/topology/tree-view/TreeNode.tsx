import * as React from 'react';
import {
  GraphElement,
  observer,
  useHover,
  WithSelectionProps,
  Node,
  isNode,
} from '@patternfly/react-topology';

export type TreeNodeData = {
  label: string;
  nodeType:
    | 'standard'
    | 'model-name'
    | 'final-select'
    | 'in-progress'
    | 'pending'
    | 'failed'
    | 'pipeline-start'
    | 'success';
  pipelineId?: string;
};

type TreeNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

// Node sizes
const STANDARD_RADIUS = 16;
const MODEL_NAME_RADIUS = 20;
const FINAL_SELECT_RADIUS = 32;

// Colors
const COLORS = {
  stroke: '#151515', // Dark stroke for hollow nodes (visible on light background)
  strokeLight: '#FFFFFF', // White stroke for dark mode (not currently used)
  modelFill: '#73C5C5', // Cyan/teal for model names
  finalFill: '#8B5CF6', // Purple for final selection
  pendingStroke: '#6A6E73', // Gray for pending
  failedFill: '#C9190B', // Red for failed
  inProgressStroke: '#0066CC', // Blue for in-progress
};

const HourglassIcon: React.FC<{ size: number }> = ({ size }) => (
  <g transform={`translate(${-size / 2}, ${-size / 2})`}>
    <svg width={size} height={size} viewBox="0 0 16 16" fill={COLORS.pendingStroke}>
      <path d="M8 8.5l3.5 3.5v2h-7v-2L8 8.5zm0-1L4.5 4V2h7v2L8 7.5zM3 1h10v4l-3 3 3 3v4H3v-4l3-3-3-3V1z" />
    </svg>
  </g>
);

const SpinnerIcon: React.FC<{ size: number }> = ({ size }) => (
  <g>
    <circle
      r={size / 2 - 2}
      fill="none"
      stroke={COLORS.inProgressStroke}
      strokeWidth={2}
      strokeDasharray={`${(size - 4) * Math.PI * 0.75} ${(size - 4) * Math.PI * 0.25}`}
      strokeLinecap="round"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  </g>
);

const isTreeNodeData = (data: unknown): data is TreeNodeData => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return (
    'label' in data &&
    'nodeType' in data &&
    typeof data.label === 'string' &&
    typeof data.nodeType === 'string'
  );
};

const getNodeRadius = (nodeType: TreeNodeData['nodeType']): number => {
  switch (nodeType) {
    case 'final-select':
      return FINAL_SELECT_RADIUS;
    case 'model-name':
      return MODEL_NAME_RADIUS;
    default:
      return STANDARD_RADIUS;
  }
};

const TreeNodeInner: React.FC<{
  node: Node;
  onSelect?: (e: React.MouseEvent) => void;
  selected?: boolean;
}> = ({ node, onSelect, selected }) => {
  const [hover, hoverRef] = useHover<SVGGElement>();

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      onSelect?.(e);
    },
    [onSelect],
  );

  const rawData = node.getData();
  const data = isTreeNodeData(rawData) ? rawData : undefined;
  const label = data?.label ?? '';
  const nodeType = data?.nodeType ?? 'standard';

  const radius = getNodeRadius(nodeType);
  const hoverStrokeWidth = selected ? 3 : hover ? 2 : 0;

  const renderNodeContent = () => {
    // Pending state - show hourglass icon
    if (nodeType === 'pending') {
      return <HourglassIcon size={radius * 2} />;
    }

    // In-progress state - show spinning circle
    if (nodeType === 'in-progress') {
      return <SpinnerIcon size={radius * 2} />;
    }

    // Failed state - red filled circle
    if (nodeType === 'failed') {
      return (
        <circle
          r={radius}
          fill={COLORS.failedFill}
          stroke={hoverStrokeWidth > 0 ? COLORS.inProgressStroke : 'none'}
          strokeWidth={hoverStrokeWidth}
        />
      );
    }

    // Model name - filled cyan circle
    if (nodeType === 'model-name') {
      return (
        <circle
          r={radius}
          fill={COLORS.modelFill}
          stroke={hoverStrokeWidth > 0 ? COLORS.inProgressStroke : 'none'}
          strokeWidth={hoverStrokeWidth}
        />
      );
    }

    // Final select - large purple filled circle
    if (nodeType === 'final-select') {
      return (
        <circle
          r={radius}
          fill={COLORS.finalFill}
          stroke={hoverStrokeWidth > 0 ? COLORS.inProgressStroke : 'none'}
          strokeWidth={hoverStrokeWidth}
        />
      );
    }

    // Standard - double hollow circle (two thin strokes with gap)
    const strokeWidth = 1.5;
    const gap = 2;
    const innerRadius = radius - strokeWidth - gap;

    return (
      <g opacity={hover ? 0.8 : 1}>
        {/* Outer circle */}
        <circle r={radius} fill="none" stroke={COLORS.stroke} strokeWidth={strokeWidth} />
        {/* Inner circle */}
        <circle r={innerRadius} fill="none" stroke={COLORS.stroke} strokeWidth={strokeWidth} />
      </g>
    );
  };

  // Calculate label position based on node size
  const labelY = radius + 8;
  const labelWidth = 60;

  return (
    <g
      ref={hoverRef}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      data-testid={`tree-node-${node.getId()}`}
    >
      {renderNodeContent()}

      {/* Label below node - using foreignObject for text wrapping */}
      {label && (
        <foreignObject
          x={-labelWidth / 2}
          y={labelY}
          width={labelWidth}
          height={50}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              color: '#151515',
              fontSize: '11px',
              fontFamily: 'RedHatText, sans-serif',
              lineHeight: '1.3',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

const TreeNode: React.FC<TreeNodeProps> = ({ element, onSelect, selected }) => {
  if (!isNode(element)) {
    return null;
  }

  return <TreeNodeInner node={element} onSelect={onSelect} selected={selected} />;
};

export default observer(TreeNode);
