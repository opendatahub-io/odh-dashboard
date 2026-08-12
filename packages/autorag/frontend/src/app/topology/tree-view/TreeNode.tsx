import * as React from 'react';
import cx from 'classnames';
import { Button } from '@patternfly/react-core';
import {
  t_global_icon_color_status_success_default as iconColorStatusSuccess,
  t_global_icon_color_status_danger_default as iconColorStatusDanger,
  t_global_icon_color_brand_default as iconColorBrand,
  t_global_icon_color_subtle as iconColorSubtle,
  t_global_color_status_success_default as colorStatusSuccess,
  t_global_color_status_danger_default as colorStatusDanger,
  t_global_border_color_status_success_default as borderColorStatusSuccess,
  t_global_border_color_status_danger_default as borderColorStatusDanger,
  t_global_border_color_100 as borderColorLight,
  t_global_background_color_primary_default as backgroundColorPrimary,
  t_global_icon_color_status_on_success_default as iconColorOnSuccess,
  t_global_icon_color_status_on_danger_default as iconColorOnDanger,
  t_global_icon_color_disabled as iconColorDisabled,
} from '@patternfly/react-tokens';
import { CheckIcon, ExclamationIcon, StarIcon, SyncAltIcon } from '@patternfly/react-icons';
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
import { isStatusOnlyBranchStepNode, isBranchStepNodeId } from './stageMapStepMetadata';
import { usePatternsExpand } from './PatternsExpandContext';
import { isTreeNodeData, treeStepStateToNodeStatus } from './treeStepState';
import PendingHourglassGlyph from './icons/PendingHourglassGlyph';
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

/** Parallel branch steps: pending = gray spine dot; failed/active/completed = task glyph. */
const DECORATOR_STATUS_BADGE_SIZE = (DEFAULT_DECORATOR_RADIUS - 4) * 2;

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
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--completed">
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

/** Pending / unreached stage badge: light gray ring + hourglass on white. */
const StatusOnlyPendingBadge: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  const strokeWidth = Math.max(1.25, size * 0.055);
  const outerR = center - strokeWidth / 2;
  const innerDiameter = 2 * (outerR - strokeWidth);
  const iconSize = innerDiameter * 0.84;
  const white = backgroundColorPrimary.var;
  const ring = borderColorLight.var;
  return (
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--pending">
      <circle cx={center} cy={center} r={center - 0.25} style={{ fill: white }} />
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        style={{ stroke: ring, strokeWidth }}
      />
      <g transform={`translate(${(size - iconSize) / 2}, ${(size - iconSize) / 2})`}>
        <PendingHourglassGlyph size={iconSize} color={iconColorDisabled.var} />
      </g>
    </g>
  );
});
StatusOnlyPendingBadge.displayName = 'StatusOnlyPendingBadge';

/** Pending branch corridor dot (design): outer gray ring, white gap, solid gray core on the spine. */
const StatusOnlyPendingDot: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  const strokeWidth = Math.max(1.5, size * 0.065);
  const outerR = center - strokeWidth / 2;
  const whiteGap = Math.max(2.75, size * 0.155);
  const innerR = Math.max(outerR - strokeWidth / 2 - whiteGap, size * 0.22);
  const white = backgroundColorPrimary.var;
  const gray = iconColorDisabled.var;
  const ring = borderColorLight.var;
  const connectorY = center;
  const leftTangent = center - outerR;
  const rightTangent = center + outerR;
  return (
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--pending-dot">
      <line
        x1={0}
        y1={connectorY}
        x2={leftTangent}
        y2={connectorY}
        style={{ stroke: ring, strokeWidth }}
      />
      <line
        x1={rightTangent}
        y1={connectorY}
        x2={size}
        y2={connectorY}
        style={{ stroke: ring, strokeWidth }}
      />
      <circle cx={center} cy={center} r={center - 0.25} style={{ fill: white }} />
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        style={{ stroke: ring, strokeWidth }}
      />
      <circle cx={center} cy={center} r={innerR} style={{ fill: gray }} />
    </g>
  );
});
StatusOnlyPendingDot.displayName = 'StatusOnlyPendingDot';

/** Failed branch corridor dot (design): outer red ring, white gap, solid red core on the spine. */
const StatusOnlyFailedSectionDot: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  // Match completed-badge ratios so the outer ring and white gap read at branch-step scale.
  const strokeWidth = Math.max(1.5, size * 0.065);
  const outerR = center - strokeWidth / 2;
  const whiteGap = Math.max(2.75, size * 0.155);
  const innerR = Math.max(outerR - strokeWidth / 2 - whiteGap, size * 0.22);
  const white = backgroundColorPrimary.var;
  const red = colorStatusDanger.var;
  const ring = borderColorStatusDanger.var;
  const connectorY = center;
  const leftTangent = center - outerR;
  const rightTangent = center + outerR;
  return (
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--failed-section">
      <line
        x1={0}
        y1={connectorY}
        x2={leftTangent}
        y2={connectorY}
        style={{ stroke: ring, strokeWidth }}
      />
      <line
        x1={rightTangent}
        y1={connectorY}
        x2={size}
        y2={connectorY}
        style={{ stroke: ring, strokeWidth }}
      />
      <circle cx={center} cy={center} r={center - 0.25} style={{ fill: white }} />
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        style={{ stroke: ring, strokeWidth }}
      />
      <circle cx={center} cy={center} r={innerR} style={{ fill: red }} />
    </g>
  );
});
StatusOnlyFailedSectionDot.displayName = 'StatusOnlyFailedSectionDot';

/** Failed branch-step badge: red ring + filled disk + white exclamation (matches completed). */
const StatusOnlyFailedBadge: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  const strokeWidth = Math.max(1.5, size * 0.065);
  const outerR = center - strokeWidth / 2;
  const whiteGap = Math.max(2.75, size * 0.155);
  const innerR = Math.max(outerR - strokeWidth / 2 - whiteGap, size * 0.3);
  const iconSize = innerR * 1.2;
  const white = backgroundColorPrimary.var;
  const red = colorStatusDanger.var;
  const ring = borderColorStatusDanger.var;
  return (
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--failed">
      <circle cx={center} cy={center} r={center - 0.25} style={{ fill: white }} />
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        style={{ stroke: ring, strokeWidth }}
      />
      <circle cx={center} cy={center} r={innerR} style={{ fill: red }} />
      <g transform={`translate(${(size - iconSize) / 2}, ${(size - iconSize) / 2})`}>
        <ExclamationIcon
          width={iconSize}
          height={iconSize}
          color={iconColorOnDanger.var}
          style={{ color: iconColorOnDanger.var, fill: iconColorOnDanger.var }}
        />
      </g>
    </g>
  );
});
StatusOnlyFailedBadge.displayName = 'StatusOnlyFailedBadge';

const StatusBadgeDecorator: React.FC<{
  element: Node;
  stepState: TreeNodeData['stepState'];
}> = React.memo(({ element, stepState }) => {
  const { x: decoratorX, y: decoratorY } = getDefaultShapeDecoratorCenter(
    TopologyQuadrant.upperLeft,
    element,
  );
  const x = stepState === 'active' ? decoratorX - 3 : decoratorX;
  const y = stepState === 'active' ? decoratorY - 3 : decoratorY;

  if (stepState === 'active') {
    return (
      <Decorator
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS - 2}
        showBackground
        className="autorag-tree-node__status-decorator-active"
        icon={
          <g className="pf-topology__node__decorator__status autorag-tree-node__status-spinner autorag-tree-node__status-decorator-active-icon">
            <SyncAltIcon />
          </g>
        }
        ariaLabel={stepState}
      />
    );
  }

  if (stepState === 'completed') {
    return (
      <Decorator
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground={false}
        icon={<StatusOnlyCompletedBadge size={DECORATOR_STATUS_BADGE_SIZE} />}
        ariaLabel={stepState}
      />
    );
  }

  if (stepState === 'failed') {
    return (
      <Decorator
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground={false}
        icon={<StatusOnlyFailedBadge size={DECORATOR_STATUS_BADGE_SIZE} />}
        ariaLabel={stepState}
      />
    );
  }

  return (
    <Decorator
      x={x}
      y={y}
      radius={DEFAULT_DECORATOR_RADIUS}
      showBackground={false}
      icon={<StatusOnlyPendingBadge size={DECORATOR_STATUS_BADGE_SIZE} />}
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
      radius={DEFAULT_DECORATOR_RADIUS - 4}
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
  const branchStep = isBranchStepNodeId(node.getId());
  const statusOnlyDot = isStatusOnlyBranchStepNode(node.getId(), stepState);
  const showsTaskIcon = !statusOnlyDot;
  const TaskIcon = resolveTaskIconForNodeId(node.getId());
  const { width, height } = node.getDimensions();
  const iconSize = Math.min(width, height) * (statusOnlyDot ? 0.92 : branchStep ? 0.52 : 0.4);
  const iconColor = TASK_ICON_COLORS[stepState];
  const showPatternsToggle =
    data?.showPatternsToggle === true && patternsExpand?.showToggle === true;
  const labelWidth = showPatternsToggle ? 140 : 96;
  // Branch corridor nodes are smaller; pad label so it lines up with stage-node labels.
  const labelY = height + 4 + (branchStep ? (48 - height) / 2 : 0);
  const captionHeight = showPatternsToggle ? 80 : labelSubtitle ? 40 : 36;

  const attachments = React.useMemo(() => {
    if (!showsTaskIcon) {
      return undefined;
    }
    return (
      <>
        <StatusBadgeDecorator element={node} stepState={stepState} />
        {showWinnerStar ? <WinnerStarDecorator element={node} /> : null}
      </>
    );
  }, [node, showsTaskIcon, stepState, showWinnerStar]);

  return (
    <DefaultNode
      className={cx(
        'autorag-tree-node',
        statusOnlyDot && 'autorag-tree-node--status-only',
        branchStep && showsTaskIcon && 'autorag-tree-node--branch-step',
      )}
      element={node}
      // Status-only dots own their chrome; branch task icons use decorator + ring stroke.
      nodeStatus={showsTaskIcon ? nodeStatus : undefined}
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
        data-branch-step={branchStep ? 'true' : 'false'}
        data-status-only={statusOnlyDot ? 'true' : 'false'}
        data-winner-star={showWinnerStar ? 'true' : 'false'}
      >
        <g
          className={showsTaskIcon ? 'autorag-tree-node__task-icon' : undefined}
          style={showsTaskIcon ? { color: iconColor } : undefined}
          transform={`translate(${(width - iconSize) / 2}, ${(height - iconSize) / 2})`}
        >
          {statusOnlyDot ? (
            stepState === 'failed' ? (
              <StatusOnlyFailedSectionDot size={iconSize} />
            ) : (
              <StatusOnlyPendingDot size={iconSize} />
            )
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
