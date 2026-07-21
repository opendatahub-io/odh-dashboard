import * as React from 'react';
import cx from 'classnames';
import {
  t_global_icon_color_status_success_default as iconColorStatusSuccess,
  t_global_icon_color_status_danger_default as iconColorStatusDanger,
  t_global_icon_color_brand_default as iconColorBrand,
  t_global_icon_color_subtle as iconColorSubtle,
} from '@patternfly/react-tokens';
import {
  GraphElement,
  observer,
  WithSelectionProps,
  Node,
  isNode,
} from '@patternfly/react-topology';
import { isTreeNodeData } from './treeStepState';
import './TreeNode.scss';

export type TreeNodeData = {
  label?: string;
  stepState: 'completed' | 'active' | 'pending' | 'failed' | 'unreached';
  activeIconVariant?: 'sync' | 'pulse';
};

type TreeNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

const NODE_RADIUS = 9;

const COLORS = {
  completedIcon: iconColorStatusSuccess.var,
  failedIcon: iconColorStatusDanger.var,
  activeIcon: iconColorBrand.var,
  pendingIcon: iconColorSubtle.var,
};

const CheckIcon: React.FC = () => (
  <path
    d="M8 0.5C12.1355 0.5 15.5 3.8645 15.5 8C15.5 12.1355 12.1355 15.5 8 15.5C3.8645 15.5 0.5 12.1355 0.5 8C0.5 3.8645 3.8645 0.5 8 0.5ZM8 1.5C4.41575 1.5 1.5 4.41575 1.5 8C1.5 11.5842 4.41575 14.5 8 14.5C11.5842 14.5 14.5 11.5842 14.5 8C14.5 4.41575 11.5842 1.5 8 1.5ZM11.1465 5.64648C11.3418 5.45118 11.6582 5.45118 11.8535 5.64648C12.0488 5.84178 12.0488 6.15816 11.8535 6.35352L7.53027 10.6768C7.38402 10.823 7.1921 10.8965 7 10.8965C6.8079 10.8965 6.61593 10.823 6.46973 10.6768L4.14648 8.35352C3.95121 8.15821 3.95119 7.84183 4.14648 7.64648C4.34178 7.45114 4.65816 7.45121 4.85352 7.64648L7 9.79297L11.1465 5.64648Z"
    fill={COLORS.completedIcon}
  />
);

const ExclamationIcon: React.FC = () => (
  <path
    d="M8 0.5C12.1355 0.5 15.5 3.8645 15.5 8C15.5 12.1355 12.1355 15.5 8 15.5C3.8645 15.5 0.5 12.1355 0.5 8C0.5 3.8645 3.8645 0.5 8 0.5ZM8 10.501C7.4477 10.501 7 10.9487 7 11.501C7.00026 12.0531 7.44786 12.501 8 12.501C8.55214 12.501 8.99974 12.0531 9 11.501C9 10.9487 8.5523 10.501 8 10.501ZM8 3.75C7.5857 3.75 7.25 4.0857 7.25 4.5V8C7.25 8.4143 7.5857 8.75 8 8.75C8.4143 8.75 8.75 8.4143 8.75 8V4.5C8.75 4.0857 8.4143 3.75 8 3.75Z"
    fill={COLORS.failedIcon}
  />
);

const HourglassIcon: React.FC = () => (
  <path
    d="M13 0.5C13.2761 0.5 13.5 0.7239 13.5 1C13.5 1.2761 13.2761 1.5 13 1.5H12.5V3.37891C12.4999 3.91296 12.292 4.41533 11.9141 4.79297L8.70703 8L11.9141 11.207C12.292 11.5847 12.4999 12.087 12.5 12.6211V14.5H13C13.2761 14.5 13.5 14.7239 13.5 15C13.5 15.2761 13.2761 15.5 13 15.5H3C2.7239 15.5 2.5 15.2761 2.5 15C2.5 14.7239 2.7239 14.5 3 14.5H3.5V12.6211C3.50007 12.087 3.70805 11.5847 4.08594 11.207L7.29297 8L4.08594 4.79297C3.70805 4.41533 3.50007 3.91301 3.5 3.37891V1.5H3C2.7239 1.5 2.5 1.2761 2.5 1C2.5 0.7239 2.7239 0.5 3 0.5H13ZM4.79297 11.9141C4.60408 12.103 4.50007 12.3541 4.5 12.6211V14.5H11.5V12.6211C11.4999 12.3541 11.3959 12.103 11.207 11.9141L8 8.70703L4.79297 11.9141ZM4.5 1.5V3.37891C4.50003 3.42001 4.50683 3.45979 4.51172 3.5H11.4883C11.4932 3.45979 11.5 3.42001 11.5 3.37891V1.5H4.5Z"
    fill={COLORS.pendingIcon}
  />
);

const SyncIcon: React.FC = () => (
  <path
    className="automl-tree-node__spinner"
    d="M15.0176 8.00098C15.2929 8.02003 15.501 8.25976 15.4814 8.53516C15.2058 12.4409 11.9194 15.5 8 15.5C5.30819 15.5 2.8241 14.0276 1.5 11.7402V15C1.5 15.2764 1.2761 15.5 1 15.5C0.7239 15.5 0.5 15.2764 0.5 15V10.75C0.5 10.3364 0.83645 10 1.25 10H5.5C5.7761 10 6 10.2236 6 10.5C6 10.7764 5.7761 11 5.5 11H2.23828C3.34699 13.1185 5.57448 14.5 8 14.5C11.397 14.5 14.2446 11.8491 14.4834 8.46484C14.5029 8.18946 14.7449 7.98246 15.0176 8.00098ZM15 0.5C15.2761 0.5 15.5 0.72365 15.5 1V5.25C15.5 5.66355 15.1636 6 14.75 6H10.5C10.2239 6 10 5.77635 10 5.5C10 5.22365 10.2239 5 10.5 5H13.7617C12.653 2.88149 10.4255 1.5 8 1.5C4.60305 1.5 1.75541 4.15091 1.5166 7.53516C1.49805 7.79881 1.27758 8 1.01758 8C1.00605 7.99999 0.994192 7.99996 0.982422 7.99902C0.707026 7.97997 0.499011 7.74024 0.518555 7.46484C0.794205 3.55909 4.08055 0.5 8 0.5C10.6918 0.5 13.1759 1.97237 14.5 4.25977V1C14.5 0.72365 14.7239 0.5 15 0.5Z"
    fill={COLORS.activeIcon}
  />
);

const PULSE_ICON_CENTER = 8;
const PULSE_ICON_INNER_RADIUS = 5;
const PULSE_ICON_OUTER_RADIUS = 7.25;

const PulseIcon: React.FC = () => (
  <g className="automl-tree-node__pulse">
    <circle
      cx={PULSE_ICON_CENTER}
      cy={PULSE_ICON_CENTER}
      r={PULSE_ICON_INNER_RADIUS}
      fill={COLORS.activeIcon}
    />
    <circle
      className="automl-tree-node__pulse-ring"
      cx={PULSE_ICON_CENTER}
      cy={PULSE_ICON_CENTER}
      r={PULSE_ICON_OUTER_RADIUS}
      fill="none"
      stroke={COLORS.activeIcon}
      strokeWidth={1.5}
    />
  </g>
);

const NodeStatusIcon: React.FC<{
  stepState: TreeNodeData['stepState'];
  activeIconVariant?: TreeNodeData['activeIconVariant'];
}> = React.memo(({ stepState, activeIconVariant }) => {
  switch (stepState) {
    case 'completed':
      return <CheckIcon />;
    case 'failed':
      return <ExclamationIcon />;
    case 'unreached':
    case 'pending':
      return <HourglassIcon />;
    case 'active':
      return activeIconVariant === 'pulse' ? <PulseIcon /> : <SyncIcon />;
    default:
      return <HourglassIcon />;
  }
});
NodeStatusIcon.displayName = 'NodeStatusIcon';

const TreeNodeIcon: React.FC<{
  stepState: TreeNodeData['stepState'];
  activeIconVariant?: TreeNodeData['activeIconVariant'];
}> = ({ stepState, activeIconVariant }) => (
  <g transform="translate(-4, -8)">
    <NodeStatusIcon stepState={stepState} activeIconVariant={activeIconVariant} />
  </g>
);

const TreeNodeInner: React.FC<{
  node: Node;
  onSelect?: (e: React.MouseEvent) => void;
  selected?: boolean;
}> = observer(({ node, onSelect, selected }) => {
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
  const activeIconVariant = data?.activeIconVariant;

  const labelY = NODE_RADIUS + 12;
  const labelWidth = 88;

  return (
    <g
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      data-testid={`tree-node-${node.getId()}`}
    >
      <circle r={NODE_RADIUS} fill="transparent" transform="translate(4, 0)" />
      <TreeNodeIcon stepState={stepState} activeIconVariant={activeIconVariant} />

      {label && (
        <foreignObject
          x={-labelWidth / 2 + 4}
          y={labelY}
          width={labelWidth}
          height={56}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div
            className={cx(
              'automl-tree-node__label',
              selected && 'automl-tree-node__label--selected',
            )}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </g>
  );
});
TreeNodeInner.displayName = 'TreeNodeInner';

const TreeNode: React.FC<TreeNodeProps> = ({ element, onSelect, selected }) => {
  if (!isNode(element)) {
    return null;
  }

  return <TreeNodeInner node={element} onSelect={onSelect} selected={selected} />;
};

export default TreeNode;
