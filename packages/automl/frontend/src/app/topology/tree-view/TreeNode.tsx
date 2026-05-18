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
  nodeType: 'standard' | 'pipeline-start' | 'success' | 'in-progress' | 'failed';
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
      return '#0066CC';
    default:
      return '#151515'; // PF black
  }
};

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

  return (
    <g
      ref={hoverRef}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      data-testid={`tree-node-${node.getId()}`}
    >
      {/* Node circle */}
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
