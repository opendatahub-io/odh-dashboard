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
  nodeType: 'standard' | 'pipeline-start' | 'success' | 'in-progress' | 'pending' | 'failed';
  pipelineId?: string;
};

type TreeNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

const NODE_RADIUS = 8;
const PIPELINE_BADGE_RADIUS = 16;

const getNodeColor = (nodeType: TreeNodeData['nodeType']): string => {
  switch (nodeType) {
    case 'success':
      return '#3E8635'; // PF green
    case 'failed':
      return '#C9190B'; // PF red
    case 'pipeline-start':
      return '#0066CC'; // PF blue
    case 'in-progress':
      return '#0066CC'; // PF blue
    case 'pending':
      return '#6A6E73'; // PF gray
    default:
      return '#151515'; // PF black
  }
};

const HourglassIcon: React.FC<{ size: number }> = ({ size }) => (
  <g transform={`translate(${-size / 2}, ${-size / 2})`}>
    <svg width={size} height={size} viewBox="0 0 16 16" fill="#6A6E73">
      <path d="M8 8.5l3.5 3.5v2h-7v-2L8 8.5zm0-1L4.5 4V2h7v2L8 7.5zM3 1h10v4l-3 3 3 3v4H3v-4l3-3-3-3V1z" />
    </svg>
  </g>
);

const SpinnerIcon: React.FC<{ size: number }> = ({ size }) => (
  <g>
    <circle
      r={size / 2 - 2}
      fill="none"
      stroke="#0066CC"
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
  const pipelineId = data?.pipelineId;

  const radius = pipelineId ? PIPELINE_BADGE_RADIUS : NODE_RADIUS;
  const strokeWidth = selected ? 3 : hover ? 2 : 0;
  const strokeColor = '#0066CC';

  const renderNodeContent = () => {
    // Pending state - show hourglass icon
    if (nodeType === 'pending') {
      return <HourglassIcon size={radius * 2} />;
    }

    // In-progress state - show spinning circle
    if (nodeType === 'in-progress') {
      return <SpinnerIcon size={radius * 2} />;
    }

    // Default - show filled circle
    return (
      <>
        <circle
          r={radius}
          fill={getNodeColor(nodeType)}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        {/* Pipeline badge text (P1, P2, etc.) */}
        {pipelineId && (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#FFFFFF"
            fontSize="12px"
            fontWeight="bold"
            fontFamily="RedHatText, sans-serif"
          >
            {pipelineId}
          </text>
        )}
      </>
    );
  };

  return (
    <g
      ref={hoverRef}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      data-testid={`tree-node-${node.getId()}`}
    >
      {renderNodeContent()}

      {/* Label below node */}
      {label && (
        <text
          y={radius + 14}
          textAnchor="middle"
          fill="#151515"
          fontSize="11px"
          fontFamily="RedHatText, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
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
