import * as React from 'react';
import cx from 'classnames';
import { Button } from '@patternfly/react-core';
import {
  t_global_icon_color_status_success_default as iconColorStatusSuccess,
  t_global_icon_color_status_danger_default as iconColorStatusDanger,
  t_global_icon_color_brand_default as iconColorBrand,
  t_global_icon_color_subtle as iconColorSubtle,
} from '@patternfly/react-tokens';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  HourglassHalfIcon,
  StarIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import {
  DEFAULT_DECORATOR_RADIUS,
  DefaultNode,
  Decorator,
  GraphElement,
  getDefaultShapeDecoratorCenter,
  isNode,
  Node,
  observer,
  TopologyQuadrant,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { parseStageMapNodeId } from './stageMapStepMetadata';
import { usePatternsExpand } from './PatternsExpandContext';
import { isTreeNodeData, treeStepStateToNodeStatus } from './treeStepState';
import { resolveTaskIconForNodeId } from './stageTaskIcons';
import './TreeNode.scss';

export type TreeNodeData = {
  label?: string;
  /** Secondary line under the label (e.g. "winner"). */
  labelSubtitle?: string;
  stepState: 'completed' | 'active' | 'pending' | 'failed' | 'unreached';
  activeIconVariant?: 'sync' | 'pulse';
  /** Blue star decorator (upper-right) for the winning pattern terminus. */
  showWinnerStar?: boolean;
  /** Pill toggle under Optimize templates (Show all / Hide patterns). */
  showPatternsToggle?: boolean;
};

type TreeNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

/** Task glyph colors — completed matches design (green icon + green ring). */
const TASK_ICON_COLORS: Record<TreeNodeData['stepState'], string> = {
  completed: iconColorStatusSuccess.var,
  failed: iconColorStatusDanger.var,
  active: iconColorBrand.var,
  pending: iconColorSubtle.var,
  unreached: iconColorSubtle.var,
};

/** Parallel branch steps keep the original status-only circle (no task glyph). */
const isStatusOnlyNode = (nodeId: string): boolean =>
  parseStageMapNodeId(nodeId)?.type === 'branch_step';

const StatusOnlyCenterIcon: React.FC<{
  stepState: TreeNodeData['stepState'];
  size: number;
}> = React.memo(({ stepState, size }) => {
  const common = { width: size, height: size } as const;
  switch (stepState) {
    case 'completed':
      return (
        <CheckCircleIcon className="pf-m-success" color={iconColorStatusSuccess.var} {...common} />
      );
    case 'failed':
      return (
        <ExclamationCircleIcon
          className="pf-m-danger"
          color={iconColorStatusDanger.var}
          {...common}
        />
      );
    case 'active':
      return (
        <SyncAltIcon
          className="pf-m-info autorag-tree-node__status-spinner"
          color={iconColorBrand.var}
          {...common}
        />
      );
    case 'pending':
    case 'unreached':
    default:
      return <HourglassHalfIcon color={iconColorSubtle.var} {...common} />;
  }
});
StatusOnlyCenterIcon.displayName = 'StatusOnlyCenterIcon';

const StatusBadgeDecorator: React.FC<{
  element: Node;
  stepState: TreeNodeData['stepState'];
}> = React.memo(({ element, stepState }) => {
  const { x, y } = getDefaultShapeDecoratorCenter(TopologyQuadrant.upperLeft, element);

  let icon: React.ReactNode;
  switch (stepState) {
    case 'completed':
      icon = <CheckCircleIcon className="pf-m-success" />;
      break;
    case 'failed':
      icon = <ExclamationCircleIcon className="pf-m-danger" />;
      break;
    case 'active':
      icon = <SyncAltIcon className="pf-m-info autorag-tree-node__status-spinner" />;
      break;
    case 'pending':
    case 'unreached':
    default:
      icon = <HourglassHalfIcon style={{ color: iconColorSubtle.var }} />;
      break;
  }

  return (
    <Decorator
      x={x}
      y={y}
      radius={DEFAULT_DECORATOR_RADIUS}
      showBackground
      icon={<g className="pf-topology__node__decorator__status">{icon}</g>}
      ariaLabel={stepState}
    />
  );
});
StatusBadgeDecorator.displayName = 'StatusBadgeDecorator';

const WinnerStarDecorator: React.FC<{ element: Node }> = React.memo(({ element }) => {
  const { x, y } = getDefaultShapeDecoratorCenter(TopologyQuadrant.upperRight, element);
  return (
    <Decorator
      x={x}
      y={y}
      radius={DEFAULT_DECORATOR_RADIUS}
      showBackground
      className="autorag-tree-node__winner-star"
      icon={
        <g className="autorag-tree-node__winner-star-icon">
          <StarIcon />
        </g>
      }
      ariaLabel="Pattern winner"
    />
  );
});
WinnerStarDecorator.displayName = 'WinnerStarDecorator';

const TreeNodeInner: React.FC<{
  node: Node;
  onSelect?: (e: React.MouseEvent) => void;
  selected?: boolean;
}> = observer(({ node, onSelect, selected }) => {
  const patternsExpand = usePatternsExpand();
  const rawData = node.getData();
  const data = isTreeNodeData(rawData) ? rawData : undefined;
  const stepState = data?.stepState ?? 'pending';
  const label = data?.label ?? node.getLabel();
  const labelSubtitle = data?.labelSubtitle;
  const showWinnerStar = data?.showWinnerStar === true;
  const nodeStatus = treeStepStateToNodeStatus(stepState);
  const statusOnly = isStatusOnlyNode(node.getId());
  const TaskIcon = resolveTaskIconForNodeId(node.getId());
  const { width, height } = node.getDimensions();
  const iconSize = Math.min(width, height) * (statusOnly ? 0.55 : 0.4);
  const iconColor = TASK_ICON_COLORS[stepState];
  const showPatternsToggle =
    data?.showPatternsToggle === true && patternsExpand?.showToggle === true;
  const labelWidth = showPatternsToggle ? 140 : 96;
  const labelY = height + 4;
  const captionHeight = showPatternsToggle ? 80 : labelSubtitle ? 40 : 36;

  const attachments = React.useMemo(() => {
    if (statusOnly) {
      return undefined;
    }
    return (
      <>
        <StatusBadgeDecorator element={node} stepState={stepState} />
        {showWinnerStar ? <WinnerStarDecorator element={node} /> : null}
      </>
    );
  }, [node, statusOnly, stepState, showWinnerStar]);

  return (
    <DefaultNode
      className="autorag-tree-node"
      element={node}
      // Status colors the circle stroke only; labels are custom (no PF label boxes).
      nodeStatus={nodeStatus}
      showLabel={false}
      showStatusDecorator={false}
      onSelect={onSelect}
      selected={selected}
      attachments={attachments}
      showStatusBackground={false}
    >
      <g
        data-testid={`tree-node-${node.getId()}`}
        data-step-state={stepState}
        data-status-only={statusOnly ? 'true' : 'false'}
        data-winner-star={showWinnerStar ? 'true' : 'false'}
      >
        <g
          className="autorag-tree-node__task-icon"
          style={{ color: iconColor }}
          transform={`translate(${(width - iconSize) / 2}, ${(height - iconSize) / 2})`}
        >
          {statusOnly ? (
            <StatusOnlyCenterIcon stepState={stepState} size={iconSize} />
          ) : (
            <TaskIcon width={iconSize} height={iconSize} />
          )}
        </g>
        {label || showPatternsToggle ? (
          <foreignObject
            x={(width - labelWidth) / 2}
            y={labelY}
            width={labelWidth}
            height={captionHeight}
            style={{ overflow: 'visible' }}
          >
            <div className="autorag-tree-node__caption">
              {label ? (
                <div
                  className={cx(
                    'autorag-tree-node__label',
                    selected && 'autorag-tree-node__label--selected',
                  )}
                >
                  <div>{label}</div>
                  {labelSubtitle ? (
                    <div className="autorag-tree-node__label-subtitle">{labelSubtitle}</div>
                  ) : null}
                </div>
              ) : null}
              {showPatternsToggle ? (
                <div className="autorag-tree-node__patterns-toggle">
                  <Button
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      patternsExpand.onToggle();
                    }}
                    data-testid="patterns-expand-toggle"
                  >
                    {patternsExpand.patternsExpanded ? 'Hide patterns' : 'Show all patterns'}
                  </Button>
                </div>
              ) : null}
            </div>
          </foreignObject>
        ) : null}
      </g>
    </DefaultNode>
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
