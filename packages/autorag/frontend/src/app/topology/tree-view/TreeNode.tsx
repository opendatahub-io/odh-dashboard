import * as React from 'react';
import cx from 'classnames';
import { Button, Label } from '@patternfly/react-core';
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
import { isBranchStepNodeId } from './stageMapStepMetadata';
import { usePatternsExpand } from './PatternsExpandContext';
import { isTreeNodeData, treeStepStateToNodeStatus } from './treeStepState';
import PendingHourglassGlyph from './icons/PendingHourglassGlyph';
import { resolveTaskIconForNodeId } from './stageTaskIcons';
import { useBoundedCaptionHeight } from './treeCaptionHeight';
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

const STATUS_BADGE_ARIA_LABELS: Record<TreeNodeData['stepState'], string> = {
  pending: 'Pending',
  active: 'In progress',
  completed: 'Completed',
  failed: 'Failed',
  unreached: 'Not reached',
};

/** Branch corridor steps always use spine status glyphs (design). */
const DECORATOR_STATUS_BADGE_SIZE = (DEFAULT_DECORATOR_RADIUS - 4) * 2;

const SPINE_STROKE_WIDTH_MIN = 1.5;
const SPINE_STROKE_WIDTH_RATIO = 0.065;
const SPINE_WHITE_GAP_MIN = 2.75;
const SPINE_WHITE_GAP_RATIO = 0.155;
const SPINE_INNER_RADIUS_FLOOR_RATIO = 0.22;

const getSpineGeometry = (size: number) => {
  const center = size / 2;
  const strokeWidth = Math.max(SPINE_STROKE_WIDTH_MIN, size * SPINE_STROKE_WIDTH_RATIO);
  const outerR = center - strokeWidth / 2;
  const whiteGap = Math.max(SPINE_WHITE_GAP_MIN, size * SPINE_WHITE_GAP_RATIO);
  const innerR = Math.max(
    outerR - strokeWidth / 2 - whiteGap,
    size * SPINE_INNER_RADIUS_FLOOR_RATIO,
  );
  return {
    center,
    strokeWidth,
    outerR,
    innerR,
    leftTangent: center - outerR,
    rightTangent: center + outerR,
  };
};

type SpineDotProps = {
  size: number;
  className: string;
  ringColor: string;
  coreColor?: string;
  showConnectors?: boolean;
  innerIcon?: React.ReactNode;
};

/** Shared spine donut: white backing, ring stroke, optional filled core, optional spine connectors. */
const SpineDot: React.FC<SpineDotProps> = React.memo(
  ({ size, className, ringColor, coreColor, showConnectors = false, innerIcon }) => {
    const { center, strokeWidth, outerR, innerR, leftTangent, rightTangent } =
      getSpineGeometry(size);
    const white = backgroundColorPrimary.var;
    return (
      <g className={className}>
        {showConnectors ? (
          <>
            <line
              x1={0}
              y1={center}
              x2={leftTangent}
              y2={center}
              style={{ stroke: ringColor, strokeWidth }}
            />
            <line
              x1={rightTangent}
              y1={center}
              x2={size}
              y2={center}
              style={{ stroke: ringColor, strokeWidth }}
            />
          </>
        ) : null}
        <circle cx={center} cy={center} r={center - 0.25} style={{ fill: white }} />
        <circle
          cx={center}
          cy={center}
          r={outerR}
          fill="none"
          style={{ stroke: ringColor, strokeWidth }}
        />
        {coreColor ? (
          <circle cx={center} cy={center} r={innerR} style={{ fill: coreColor }} />
        ) : null}
        {innerIcon}
      </g>
    );
  },
);
SpineDot.displayName = 'SpineDot';

/**
 * Completed branch-step badge (design): green outer ring, opaque white gap
 * (covers the edge line), filled green disk, white check.
 * Inline styles beat topology `fill: currentColor` inheritance.
 */
const StatusOnlyCompletedBadge: React.FC<{ size: number }> = React.memo(({ size }) => {
  const { innerR } = getSpineGeometry(size);
  const checkSize = innerR * 1.2;
  return (
    <SpineDot
      size={size}
      className="autorag-tree-node__status-badge autorag-tree-node__status-badge--completed"
      ringColor={borderColorStatusSuccess.var}
      coreColor={colorStatusSuccess.var}
      innerIcon={
        <g transform={`translate(${(size - checkSize) / 2}, ${(size - checkSize) / 2})`}>
          <CheckIcon
            width={checkSize}
            height={checkSize}
            color={iconColorOnSuccess.var}
            style={{ color: iconColorOnSuccess.var, fill: iconColorOnSuccess.var }}
          />
        </g>
      }
    />
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
const StatusOnlyPendingDot: React.FC<{ size: number }> = React.memo(({ size }) => (
  <SpineDot
    size={size}
    className="autorag-tree-node__status-badge autorag-tree-node__status-badge--pending-dot"
    ringColor={borderColorLight.var}
    coreColor={iconColorDisabled.var}
    showConnectors
  />
));
StatusOnlyPendingDot.displayName = 'StatusOnlyPendingDot';

/** Completed branch corridor dot (design): green check badge on the spine. */
const StatusOnlyCompletedDot: React.FC<{ size: number }> = React.memo(({ size }) => {
  const { innerR } = getSpineGeometry(size);
  const checkSize = innerR * 1.2;
  return (
    <SpineDot
      size={size}
      className="autorag-tree-node__status-badge autorag-tree-node__status-badge--completed-dot"
      ringColor={borderColorStatusSuccess.var}
      coreColor={colorStatusSuccess.var}
      showConnectors
      innerIcon={
        <g transform={`translate(${(size - checkSize) / 2}, ${(size - checkSize) / 2})`}>
          <CheckIcon
            width={checkSize}
            height={checkSize}
            color={iconColorOnSuccess.var}
            style={{ color: iconColorOnSuccess.var, fill: iconColorOnSuccess.var }}
          />
        </g>
      }
    />
  );
});
StatusOnlyCompletedDot.displayName = 'StatusOnlyCompletedDot';

/** Active branch corridor dot (design): blue pulse on the spine while the section runs. */
const StatusOnlyActiveDot: React.FC<{
  size: number;
  activeIconVariant?: TreeNodeData['activeIconVariant'];
}> = React.memo(({ size, activeIconVariant = 'pulse' }) => {
  const { center } = getSpineGeometry(size);
  const pulseInnerRadius = Math.max(2.5, size * 0.2);
  const pulseOuterRadius = Math.max(pulseInnerRadius + 1.25, size * 0.28);
  const syncSize = size * 0.84;
  const isPulse = activeIconVariant === 'pulse';
  return (
    <SpineDot
      size={size}
      className="autorag-tree-node__status-badge autorag-tree-node__status-badge--active-dot"
      ringColor={borderColorLight.var}
      showConnectors
      innerIcon={
        isPulse ? (
          <g className="autorag-tree-node__status-pulse">
            <circle
              cx={center}
              cy={center}
              r={pulseInnerRadius}
              style={{ fill: iconColorBrand.var }}
            />
            <circle
              className="autorag-tree-node__status-pulse-ring"
              cx={center}
              cy={center}
              r={pulseOuterRadius}
              fill="none"
              style={{ stroke: iconColorBrand.var, strokeWidth: 1.4 }}
            />
          </g>
        ) : (
          <g transform={`translate(${(size - syncSize) / 2}, ${(size - syncSize) / 2})`}>
            <g className="autorag-tree-node__status-spinner">
              <SyncAltIcon
                width={syncSize}
                height={syncSize}
                color={iconColorBrand.var}
                style={{ color: iconColorBrand.var, fill: iconColorBrand.var }}
              />
            </g>
          </g>
        )
      }
    />
  );
});
StatusOnlyActiveDot.displayName = 'StatusOnlyActiveDot';

/** Failed branch corridor dot (design): outer red ring, white gap, solid red core on the spine. */
const StatusOnlyFailedSectionDot: React.FC<{ size: number }> = React.memo(({ size }) => (
  <SpineDot
    size={size}
    className="autorag-tree-node__status-badge autorag-tree-node__status-badge--failed-section"
    ringColor={borderColorStatusDanger.var}
    coreColor={colorStatusDanger.var}
    showConnectors
  />
));
StatusOnlyFailedSectionDot.displayName = 'StatusOnlyFailedSectionDot';

/** Failed branch-step badge: red ring + filled disk + white exclamation (matches completed). */
const StatusOnlyFailedBadge: React.FC<{ size: number }> = React.memo(({ size }) => {
  const { innerR } = getSpineGeometry(size);
  const iconSize = innerR * 1.2;
  return (
    <SpineDot
      size={size}
      className="autorag-tree-node__status-badge autorag-tree-node__status-badge--failed"
      ringColor={borderColorStatusDanger.var}
      coreColor={colorStatusDanger.var}
      innerIcon={
        <g transform={`translate(${(size - iconSize) / 2}, ${(size - iconSize) / 2})`}>
          <ExclamationIcon
            width={iconSize}
            height={iconSize}
            color={iconColorOnDanger.var}
            style={{ color: iconColorOnDanger.var, fill: iconColorOnDanger.var }}
          />
        </g>
      }
    />
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
        ariaLabel={STATUS_BADGE_ARIA_LABELS[stepState]}
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
        ariaLabel={STATUS_BADGE_ARIA_LABELS[stepState]}
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
        ariaLabel={STATUS_BADGE_ARIA_LABELS[stepState]}
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
      ariaLabel={STATUS_BADGE_ARIA_LABELS[stepState]}
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
  const activeIconVariant = data?.activeIconVariant;
  const label = data?.label ?? node.getLabel();
  const labelSubtitle = data?.labelSubtitle;
  const showWinnerStar = data?.showWinnerStar === true;
  const nodeStatus = treeStepStateToNodeStatus(stepState);
  const branchStep = isBranchStepNodeId(node.getId());
  const showsTaskIcon = !branchStep;
  const TaskIcon = resolveTaskIconForNodeId(node.getId());
  const { width, height } = node.getDimensions();
  const iconSize = Math.min(width, height) * (branchStep ? 0.92 : 0.4);
  const iconColor = TASK_ICON_COLORS[stepState];
  const showPatternsToggle =
    data?.showPatternsToggle === true && patternsExpand?.showToggle === true;
  const labelWidth = showPatternsToggle ? 140 : 96;
  // Branch corridor nodes are smaller; pad label so it lines up with stage-node labels.
  const labelY = height + 4 + (branchStep ? (48 - height) / 2 : 0);
  const [captionHeight, captionRef] = useBoundedCaptionHeight({
    showExpandToggle: showPatternsToggle,
    labelSubtitle,
    label,
    labelWidth,
    expandToggleExpanded: patternsExpand?.patternsExpanded,
  });

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
      className={cx('autorag-tree-node', branchStep && 'autorag-tree-node--status-only')}
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
        data-status-only={branchStep ? 'true' : 'false'}
        data-winner-star={showWinnerStar ? 'true' : 'false'}
      >
        <g
          className={showsTaskIcon ? 'autorag-tree-node__task-icon' : undefined}
          style={showsTaskIcon ? { color: iconColor } : undefined}
          transform={`translate(${(width - iconSize) / 2}, ${(height - iconSize) / 2})`}
        >
          {branchStep ? (
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
        {label || showPatternsToggle ? (
          <foreignObject
            x={(width - labelWidth) / 2}
            y={labelY}
            width={labelWidth}
            height={captionHeight}
            style={{ overflow: 'visible' }}
          >
            <div ref={captionRef} className="autorag-tree-node__caption">
              {label ? (
                <div
                  className={cx(
                    'autorag-tree-node__label',
                    selected && 'autorag-tree-node__label--selected',
                  )}
                >
                  <div>{label}</div>
                  {labelSubtitle ? (
                    <Label color="grey" isCompact className="autorag-tree-node__winner-label">
                      {labelSubtitle}
                    </Label>
                  ) : null}
                </div>
              ) : null}
              {showPatternsToggle ? (
                <div className="autorag-tree-node__patterns-toggle">
                  <Button
                    variant="secondary"
                    aria-expanded={patternsExpand.patternsExpanded}
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
