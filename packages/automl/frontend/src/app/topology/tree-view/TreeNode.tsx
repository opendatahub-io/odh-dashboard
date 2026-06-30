import * as React from 'react';
import {
  GraphElement,
  observer,
  useHover,
  WithSelectionProps,
  Node,
  isNode,
} from '@patternfly/react-topology';
import {
  shouldShowHoverPopover,
  shouldShowNodeLabels,
  usePipelineDisplay,
} from './PipelineDisplayContext';
import './TreeNode.scss';

export type TreeNodeData = {
  label: string;
  stepState: 'completed' | 'active' | 'pending' | 'failed' | 'unreached';
  pathColor?: 'purple' | 'teal' | 'gray';
};

type TreeNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

const NODE_RADIUS = 9;
const SELECTED_STROKE = 2;

const COLORS = {
  completedFill: '#3E8635',
  completedStroke: '#2B6E2B',
  failedFill: '#C9190B',
  failedStroke: '#A30000',
  unreachedFill: '#FFFFFF',
  unreachedStroke: '#8A8D90',
  activeFill: '#B9DAFC',
  activeStroke: '#0066CC',
  activeIcon: '#0066CC',
  pendingFill: '#FFFFFF',
  pendingStroke: '#8A8D90',
  icon: '#FFFFFF',
  pendingIcon: '#151515',
  labelActive: '#151515',
  labelPending: '#8A8D90',
  popoverFill: '#151515',
  popoverText: '#FFFFFF',
  selectionRing: '#151515',
};

const isTreeNodeData = (data: unknown): data is TreeNodeData => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return (
    'label' in data &&
    'stepState' in data &&
    typeof data.label === 'string' &&
    typeof data.stepState === 'string'
  );
};

const CheckIcon: React.FC = () => (
  <path
    d="M -3.5 0 L -0.5 3 L 4 -3"
    fill="none"
    stroke={COLORS.icon}
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const ExclamationIcon: React.FC = () => (
  <>
    <circle cx={0} cy={-2.5} r={1.1} fill={COLORS.icon} />
    <rect x={-1.1} y={0.5} width={2.2} height={5.5} rx={0.6} fill={COLORS.icon} />
  </>
);

const HourglassIcon: React.FC = () => (
  <g
    fill="none"
    stroke={COLORS.pendingIcon}
    strokeWidth={1.15}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M -3 -4 L 3 -4" />
    <path d="M -3 -4 L 0 -0.5" />
    <path d="M 3 -4 L 0 -0.5" />
    <path d="M 0 -0.5 L -3 4" />
    <path d="M 0 -0.5 L 3 4" />
    <path d="M -3 4 L 3 4" />
  </g>
);

const SyncIcon: React.FC = () => (
  <g
    className="automl-tree-node__spinner"
    fill="none"
    stroke={COLORS.activeIcon}
    strokeWidth={1.35}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M 4.2 0.5 A 4 4 0 0 0 0 -3.8" />
    <path d="M 0 -3.8 L -1.2 -2" />
    <path d="M -4.2 -0.5 A 4 4 0 0 0 0 3.8" />
    <path d="M 0 3.8 L 1.2 2" />
  </g>
);

const NodeStatusIcon: React.FC<{ stepState: TreeNodeData['stepState'] }> = ({ stepState }) => {
  switch (stepState) {
    case 'completed':
      return <CheckIcon />;
    case 'failed':
      return <ExclamationIcon />;
    case 'unreached':
    case 'pending':
      return <HourglassIcon />;
    case 'active':
      return <SyncIcon />;
    default:
      return <HourglassIcon />;
  }
};

const getNodeColors = (stepState: TreeNodeData['stepState']) => {
  switch (stepState) {
    case 'completed':
      return { fill: COLORS.completedFill, stroke: COLORS.completedStroke };
    case 'failed':
      return { fill: COLORS.failedFill, stroke: COLORS.failedStroke };
    case 'unreached':
      return { fill: COLORS.unreachedFill, stroke: COLORS.unreachedStroke };
    case 'pending':
      return { fill: COLORS.pendingFill, stroke: COLORS.pendingStroke };
    case 'active':
      return { fill: COLORS.activeFill, stroke: COLORS.activeStroke };
    default:
      return { fill: COLORS.pendingFill, stroke: COLORS.pendingStroke };
  }
};

const HoverPopover: React.FC<{ label: string }> = ({ label }) => {
  const paddingX = 10;
  const textWidth = Math.min(Math.max(label.length * 6.5, 56), 140);
  const width = textWidth + paddingX * 2;
  const height = 24;

  return (
    <g transform={`translate(0, ${-(NODE_RADIUS + height + 6)})`} pointerEvents="none">
      <rect x={-width / 2} y={0} width={width} height={height} rx={4} fill={COLORS.popoverFill} />
      <polygon points={`0,${height + 5} -5,${height} 5,${height}`} fill={COLORS.popoverFill} />
      <text
        x={0}
        y={height / 2 + 4}
        textAnchor="middle"
        fill={COLORS.popoverText}
        fontSize={11}
        fontFamily="RedHatText, sans-serif"
      >
        {label}
      </text>
    </g>
  );
};

const TreeNodeInner: React.FC<{
  node: Node;
  onSelect?: (e: React.MouseEvent) => void;
  selected?: boolean;
}> = ({ node, onSelect, selected }) => {
  const [hover, hoverRef] = useHover<SVGGElement>();
  const displaySettings = usePipelineDisplay();

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      onSelect?.(e);
    },
    [onSelect],
  );

  const rawData = node.getData();
  const data = isTreeNodeData(rawData) ? rawData : undefined;
  const label = data?.label ?? '';
  const stepState = data?.stepState ?? 'pending';
  const { fill, stroke } = getNodeColors(stepState);
  const showLabels = shouldShowNodeLabels(displaySettings);
  const showPopover = shouldShowHoverPopover(displaySettings, hover);

  const labelColor =
    stepState === 'pending' || stepState === 'unreached' ? COLORS.labelPending : COLORS.labelActive;
  const labelY = NODE_RADIUS + 12;
  const labelWidth = 88;

  return (
    <g
      ref={hoverRef}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      data-testid={`tree-node-${node.getId()}`}
    >
      {showPopover && label && <HoverPopover label={label} />}

      <circle
        r={NODE_RADIUS}
        fill={fill}
        stroke={selected ? COLORS.selectionRing : stroke}
        strokeWidth={selected ? SELECTED_STROKE : 1.5}
      />
      <g>
        <NodeStatusIcon stepState={stepState} />
      </g>

      {showLabels && label && (
        <foreignObject
          x={-labelWidth / 2}
          y={labelY}
          width={labelWidth}
          height={56}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              color: labelColor,
              fontSize: '11px',
              fontFamily: 'RedHatText, sans-serif',
              lineHeight: '1.3',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              fontWeight: selected ? 600 : 400,
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
