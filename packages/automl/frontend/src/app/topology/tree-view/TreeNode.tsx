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
import { useModelsExpand } from './ModelsExpandContext';
import { isTreeNodeData, treeStepStateToNodeStatus } from './treeStepState';
import PendingHourglassGlyph from './icons/PendingHourglassGlyph';
import { resolveTaskIconForNodeId } from './stageTaskIcons';
import './TreeNode.scss';

export type TreeNodeData = {
  label?: string;
  /** Secondary line under the label (e.g. "Winner"). */
  labelSubtitle?: string;
  stepState: 'completed' | 'active' | 'pending' | 'failed' | 'unreached';
  activeIconVariant?: 'sync' | 'pulse';
  /** Blue star decorator (upper-right) for the winning model terminus. */
  showWinnerStar?: boolean;
  /** Pill toggle under Select models (Show all / Hide all models). */
  showModelsToggle?: boolean;
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

/** Branch corridor steps always use spine status glyphs (design). */
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
    <g className="automl-tree-node__status-badge automl-tree-node__status-badge--completed">
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
    <g className="automl-tree-node__status-badge automl-tree-node__status-badge--pending-dot">
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

/** Completed branch corridor dot (design): green check badge on the spine. */
const StatusOnlyCompletedDot: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  const strokeWidth = Math.max(1.5, size * 0.065);
  const outerR = center - strokeWidth / 2;
  const whiteGap = Math.max(2.75, size * 0.155);
  const innerR = Math.max(outerR - strokeWidth / 2 - whiteGap, size * 0.22);
  const checkSize = innerR * 1.2;
  const white = backgroundColorPrimary.var;
  const green = colorStatusSuccess.var;
  const ring = borderColorStatusSuccess.var;
  const connectorY = center;
  const leftTangent = center - outerR;
  const rightTangent = center + outerR;
  return (
    <g className="automl-tree-node__status-badge automl-tree-node__status-badge--completed-dot">
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
StatusOnlyCompletedDot.displayName = 'StatusOnlyCompletedDot';

/** Active branch corridor dot (design): blue pulse on the spine while the section runs. */
const StatusOnlyActiveDot: React.FC<{
  size: number;
  activeIconVariant?: TreeNodeData['activeIconVariant'];
}> = React.memo(({ size, activeIconVariant = 'pulse' }) => {
  const center = size / 2;
  const strokeWidth = Math.max(1.25, size * 0.055);
  const outerR = center - strokeWidth / 2;
  const ring = borderColorLight.var;
  const connectorY = center;
  const leftTangent = center - outerR;
  const rightTangent = center + outerR;
  const pulseInnerRadius = Math.max(2.5, size * 0.2);
  const pulseOuterRadius = Math.max(pulseInnerRadius + 1.25, size * 0.28);
  const syncSize = size * 0.84;
  const isPulse = activeIconVariant === 'pulse';
  return (
    <g className="automl-tree-node__status-badge automl-tree-node__status-badge--active-dot">
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
      <circle
        cx={center}
        cy={center}
        r={center - 0.25}
        style={{ fill: backgroundColorPrimary.var }}
      />
      {isPulse ? (
        <g className="automl-tree-node__status-pulse">
          <circle
            cx={center}
            cy={center}
            r={pulseInnerRadius}
            style={{ fill: iconColorBrand.var }}
          />
          <circle
            className="automl-tree-node__status-pulse-ring"
            cx={center}
            cy={center}
            r={pulseOuterRadius}
            fill="none"
            style={{ stroke: iconColorBrand.var, strokeWidth: 1.4 }}
          />
        </g>
      ) : (
        <g transform={`translate(${(size - syncSize) / 2}, ${(size - syncSize) / 2})`}>
          <g className="automl-tree-node__status-spinner">
            <SyncAltIcon
              width={syncSize}
              height={syncSize}
              color={iconColorBrand.var}
              style={{ color: iconColorBrand.var, fill: iconColorBrand.var }}
            />
          </g>
        </g>
      )}
    </g>
  );
});
StatusOnlyActiveDot.displayName = 'StatusOnlyActiveDot';

/** Failed branch corridor dot (design): outer red ring, white gap, solid red core on the spine. */
const StatusOnlyFailedSectionDot: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
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
    <g className="automl-tree-node__status-badge automl-tree-node__status-badge--failed-section">
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
    <g className="automl-tree-node__status-badge automl-tree-node__status-badge--pending">
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
    <g className="automl-tree-node__status-badge automl-tree-node__status-badge--failed">
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
        className="automl-tree-node__status-decorator-active"
        icon={
          <g className="pf-topology__node__decorator__status automl-tree-node__status-spinner automl-tree-node__status-decorator-active-icon">
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
      className="automl-tree-node__winner-star"
      icon={
        <g className="automl-tree-node__winner-star-icon">
          <StarIcon />
        </g>
      }
      ariaLabel="Model winner"
    />
  );
});
WinnerStarDecorator.displayName = 'WinnerStarDecorator';

const TreeNodeInner: React.FC<{
  node: Node;
  onSelect?: (e: React.MouseEvent) => void;
  selected?: boolean;
}> = observer(({ node, onSelect, selected }) => {
  const modelsExpand = useModelsExpand();
  const rawData = node.getData();
  const data = isTreeNodeData(rawData) ? rawData : undefined;
  const stepState = data?.stepState ?? 'pending';
  const activeIconVariant = data?.activeIconVariant;
  const label = data?.label ?? node.getLabel();
  const labelSubtitle = data?.labelSubtitle;
  const showWinnerStar = data?.showWinnerStar === true;
  const nodeStatus = treeStepStateToNodeStatus(stepState);
  const branchStep = isBranchStepNodeId(node.getId());
  const statusOnlyDot = isStatusOnlyBranchStepNode(node.getId());
  const showsTaskIcon = !statusOnlyDot;
  const TaskIcon = resolveTaskIconForNodeId(node.getId());
  const { width, height } = node.getDimensions();
  const iconSize = Math.min(width, height) * (statusOnlyDot ? 0.92 : branchStep ? 0.52 : 0.4);
  const iconColor = TASK_ICON_COLORS[stepState];
  const showModelsToggle = data?.showModelsToggle === true && modelsExpand?.showToggle === true;
  const labelWidth = showModelsToggle ? 140 : 96;
  const labelY = height + 4 + (branchStep ? (48 - height) / 2 : 0);
  const captionHeight = showModelsToggle ? 80 : labelSubtitle ? 40 : 36;

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
      className={cx('automl-tree-node', statusOnlyDot && 'automl-tree-node--status-only')}
      element={node}
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
          className={showsTaskIcon ? 'automl-tree-node__task-icon' : undefined}
          style={showsTaskIcon ? { color: iconColor } : undefined}
          transform={`translate(${(width - iconSize) / 2}, ${(height - iconSize) / 2})`}
        >
          {statusOnlyDot ? (
            stepState === 'failed' ? (
              <StatusOnlyFailedSectionDot size={iconSize} />
            ) : stepState === 'completed' ? (
              <StatusOnlyCompletedDot size={iconSize} />
            ) : stepState === 'active' ? (
              <StatusOnlyActiveDot size={iconSize} activeIconVariant={activeIconVariant} />
            ) : (
              <StatusOnlyPendingDot size={iconSize} />
            )
          ) : (
            <TaskIcon width={iconSize} height={iconSize} />
          )}
        </g>
        {label || showModelsToggle ? (
          <foreignObject
            x={(width - labelWidth) / 2}
            y={labelY}
            width={labelWidth}
            height={captionHeight}
            style={{ overflow: 'visible' }}
          >
            <div className="automl-tree-node__caption">
              {label ? (
                <div
                  className={cx(
                    'automl-tree-node__label',
                    selected && 'automl-tree-node__label--selected',
                  )}
                >
                  <div>{label}</div>
                  {labelSubtitle ? (
                    <div className="automl-tree-node__label-subtitle">{labelSubtitle}</div>
                  ) : null}
                </div>
              ) : null}
              {showModelsToggle ? (
                <div className="automl-tree-node__models-toggle">
                  <Button
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      modelsExpand.onToggle();
                    }}
                    data-testid="models-expand-toggle"
                  >
                    {modelsExpand.modelsExpanded ? 'Hide all models' : 'Show all models'}
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
