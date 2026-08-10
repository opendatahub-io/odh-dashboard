import * as React from 'react';
import cx from 'classnames';
import { Button } from '@patternfly/react-core';
import {
  t_global_icon_color_status_success_default as iconColorStatusSuccess,
  t_global_icon_color_status_danger_default as iconColorStatusDanger,
  t_global_icon_color_brand_default as iconColorBrand,
  t_global_icon_color_subtle as iconColorSubtle,
  t_global_color_status_success_default as colorStatusSuccess,
  t_global_border_color_status_success_default as borderColorStatusSuccess,
  t_global_background_color_primary_default as backgroundColorPrimary,
  t_global_icon_color_status_on_success_default as iconColorOnSuccess,
} from '@patternfly/react-tokens';
import {
  CheckIcon,
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

/**
 * Completed branch-step badge (design): green outer ring, opaque white gap
 * (covers the edge line), filled green disk, white check.
 * Inline styles beat topology `fill: currentColor` inheritance.
 */
const StatusOnlyCompletedBadge: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  // Design ratios (~22px icon): thin ring (~1.5), wide white gap (~3), inner disk (~60%).
  const strokeWidth = Math.max(1.5, size * 0.065);
  const outerR = center - strokeWidth / 2;
  const whiteGap = Math.max(2.75, size * 0.155);
  const innerR = Math.max(outerR - strokeWidth / 2 - whiteGap, size * 0.3);
  const checkSize = innerR * 1.2;
  const white = backgroundColorPrimary.var;
  const green = colorStatusSuccess.var;
  const ring = borderColorStatusSuccess.var;
  return (
    <g className="autorag-tree-node__status-badge">
      {/* Opaque white disk so the pipeline edge does not show through the gap. */}
      <circle cx={center} cy={center} r={center - 0.25} style={{ fill: white }} />
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        style={{ stroke: ring, strokeWidth }}
      />
      <circle cx={center} cy={center} r={innerR} style={{ fill: green }} />
      <g transform={`translate(${(size - checkSize) / 2}, ${(size - checkSize) / 2})`}>
        <CheckIcon
          width={checkSize}
          height={checkSize}
          color={iconColorOnSuccess.var}
          style={{ color: iconColorOnSuccess.var, fill: iconColorOnSuccess.var }}
        />
      </g>
    </g>
  );
});
StatusOnlyCompletedBadge.displayName = 'StatusOnlyCompletedBadge';

/** Branch-step status glyph (no task glyph) — completed uses the ring badge above. */
const StatusOnlyCenterIcon: React.FC<{
  stepState: TreeNodeData['stepState'];
  size: number;
}> = React.memo(({ stepState, size }) => {
  const common = { width: size, height: size } as const;
  switch (stepState) {
    case 'completed':
      return <StatusOnlyCompletedBadge size={size} />;
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
  const iconSize = Math.min(width, height) * (statusOnly ? 0.92 : 0.4);
  const iconColor = TASK_ICON_COLORS[stepState];
  const showPatternsToggle =
    data?.showPatternsToggle === true && patternsExpand?.showToggle === true;
  const labelWidth = showPatternsToggle ? 140 : 96;
  // Status-only nodes are smaller; pad label so it lines up with stage-node labels.
  const labelY = height + 4 + (statusOnly ? (48 - height) / 2 : 0);
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
      className={cx('autorag-tree-node', statusOnly && 'autorag-tree-node--status-only')}
      element={node}
      // Status-only badges own their chrome; skip pf-m-success stroke on DefaultNode.
      nodeStatus={statusOnly ? undefined : nodeStatus}
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
          className={statusOnly ? undefined : 'autorag-tree-node__task-icon'}
          style={statusOnly ? undefined : { color: iconColor }}
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
