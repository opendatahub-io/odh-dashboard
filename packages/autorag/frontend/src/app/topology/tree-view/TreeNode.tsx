import * as React from 'react';
import cx from 'classnames';
import { Button } from '@patternfly/react-core';
import {
  t_global_icon_color_status_success_default as iconColorStatusSuccess,
  t_global_icon_color_subtle as iconColorSubtle,
  t_global_color_status_success_default as colorStatusSuccess,
  t_global_color_status_danger_default as colorStatusDanger,
  t_global_color_nonstatus_orange_300 as colorNonstatusOrange,
  t_global_color_status_warning_200 as colorStatusWarningGold,
  t_global_icon_color_inverse as iconColorInverse,
  t_global_border_color_status_success_default as borderColorStatusSuccess,
  t_global_border_color_status_danger_default as borderColorStatusDanger,
  t_global_background_color_primary_default as backgroundColorPrimary,
  t_global_icon_color_status_on_success_default as iconColorOnSuccess,
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
  NodeStatus,
  observer,
  TopologyQuadrant,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { isBranchStepNodeId } from './stageMapStepMetadata';
import { usePatternsExpand } from './PatternsExpandContext';
import { isTreeNodeData, treeStepStateToNodeStatus } from './treeStepState';
import { resolveTaskIconForNodeId } from './stageTaskIcons';
import { useBoundedCaptionHeight } from './treeCaptionHeight';
import {
  resolveTreeNodeVisualState,
  useJustCompleted,
  type WinnerRank,
} from './treeNodeVisualState';
import './TreeNode.scss';

export type TreeNodeData = {
  label?: string;
  /** Secondary line under the label (e.g. "winner"). */
  labelSubtitle?: string;
  stepState: 'completed' | 'active' | 'pending' | 'failed' | 'unreached';
  activeIconVariant?: 'sync' | 'pulse';
  /** Star decorator (upper-right) for the rank-1 winning pattern terminus. */
  showWinnerStar?: boolean;
  /** Rank 1–3 badges on pattern result nodes (expanded table). */
  winnerRank?: WinnerRank;
  hideLabel?: boolean;
  nodeRole?: 'task' | 'column-header' | 'column-rule' | 'row-label' | 'patterns-toggle';
  /** Width of the shared header underline, set on the first column-header. */
  columnRuleWidth?: number;
  /** Pill toggle under the branch corridor (Show all N / Collapse patterns). */
  showPatternsToggle?: boolean;
};

type TreeNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

const DANGER_RED = '#c9190d';
const INFO_BLUE = '#0066cc';
/** Rank 2: PF v6 orange-300 is too bright vs design; orange-400 is too dark. */
const WINNER_RANK_2_ORANGE = '#c4610e';

/** Task glyph colors — completed uses status success so dark theme stays in token. */
const TASK_ICON_COLORS: Record<ReturnType<typeof resolveTreeNodeVisualState>, string> = {
  success: iconColorStatusSuccess.var,
  'just-completed': iconColorStatusSuccess.var,
  failed: DANGER_RED,
  active: INFO_BLUE,
  pending: iconColorSubtle.var,
  winner: WINNER_RANK_2_ORANGE,
};

const winnerTaskIconColor = (rank?: WinnerRank): string => {
  if (rank === 1) {
    return colorStatusWarningGold.var;
  }
  if (rank === 3) {
    return colorNonstatusOrange.var;
  }
  return WINNER_RANK_2_ORANGE;
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
const WINNER_BADGE_RADIUS = 9;
const FAILED_BADGE_RADIUS = 8;
const FAILED_BADGE_STROKE = 3;
/** Filled disc radius; 2px white stroke → ~20px outer diameter. */
const ACTIVE_BADGE_RADIUS = 8;
const ACTIVE_BADGE_STROKE = 2;
const PENDING_RING_STROKE = '#8a8d90';
const PENDING_RING_FILL = '#ffffff';
const PENDING_RING_WIDTH = 2;
const PENDING_RING_DASH = '4 4';

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

/** Pending / unreached branch corridor: smooth dashed circle (not the PF ellipse). */
const StatusOnlyPendingDot: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  return (
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--pending-dot">
      <circle
        className="autorag-tree-node__pending-ring"
        cx={center}
        cy={center}
        r={Math.max(0, center - PENDING_RING_WIDTH / 2)}
        fill={PENDING_RING_FILL}
        stroke={PENDING_RING_STROKE}
        strokeWidth={PENDING_RING_WIDTH}
        strokeDasharray={PENDING_RING_DASH}
      />
    </g>
  );
});
StatusOnlyPendingDot.displayName = 'StatusOnlyPendingDot';

/** Resting success branch corridor: thin ring, white gap, small filled core. */
const StatusOnlySuccessDot: React.FC<{ size: number }> = React.memo(({ size }) => {
  const center = size / 2;
  const ringWidth = 1;
  const outerR = Math.max(0, center - ringWidth / 2);
  const innerR = Math.max(2, size * 0.3);
  const white = backgroundColorPrimary.var;
  return (
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--success-dot">
      <circle cx={center} cy={center} r={center} style={{ fill: white }} />
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        style={{ stroke: borderColorStatusSuccess.var, strokeWidth: ringWidth }}
      />
      <circle cx={center} cy={center} r={innerR} style={{ fill: colorStatusSuccess.var }} />
    </g>
  );
});
StatusOnlySuccessDot.displayName = 'StatusOnlySuccessDot';

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

/** Active branch corridor: dark ring, white gap, inner dot that pulses dark ↔ light. */
const StatusOnlyActiveDot: React.FC<{
  size: number;
  activeIconVariant?: TreeNodeData['activeIconVariant'];
}> = React.memo(({ size, activeIconVariant = 'pulse' }) => {
  const center = size / 2;
  const strokeWidth = Math.max(3.25, size * 0.14);
  const ringR = Math.max(0, center - strokeWidth / 2);
  const coreR = Math.max(2.5, size * 0.28);
  const syncSize = size * 0.5;
  const isPulse = activeIconVariant !== 'sync';
  return (
    <g className="autorag-tree-node__status-badge autorag-tree-node__status-badge--active-dot">
      <circle cx={center} cy={center} r={center} fill="#ffffff" style={{ fill: '#ffffff' }} />
      {isPulse ? (
        <circle
          className="autorag-tree-node__active-corridor-core"
          cx={center}
          cy={center}
          r={coreR}
        />
      ) : (
        <g transform={`translate(${(size - syncSize) / 2}, ${(size - syncSize) / 2})`}>
          <g className="autorag-tree-node__status-spinner">
            <SyncAltIcon
              width={syncSize}
              height={syncSize}
              color="#ffffff"
              style={{ color: '#ffffff', fill: '#ffffff' }}
            />
          </g>
        </g>
      )}
      <circle
        className="autorag-tree-node__active-corridor-ring"
        cx={center}
        cy={center}
        r={ringR}
        fill="none"
        stroke={INFO_BLUE}
        strokeWidth={strokeWidth}
        style={{ fill: 'none', stroke: INFO_BLUE }}
      />
    </g>
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

const StatusBadgeDecorator: React.FC<{
  element: Node;
  visualState: ReturnType<typeof resolveTreeNodeVisualState>;
}> = React.memo(({ element, visualState }) => {
  const { x, y } = getDefaultShapeDecoratorCenter(TopologyQuadrant.upperLeft, element);

  if (visualState === 'just-completed') {
    return (
      <Decorator
        x={x}
        y={y}
        radius={DEFAULT_DECORATOR_RADIUS}
        showBackground={false}
        icon={<StatusOnlyCompletedBadge size={DECORATOR_STATUS_BADGE_SIZE} />}
        ariaLabel={STATUS_BADGE_ARIA_LABELS.completed}
      />
    );
  }

  return null;
});
StatusBadgeDecorator.displayName = 'StatusBadgeDecorator';

/** Filled info-blue disc, white sync icon, white stroke that cuts the node ring. */
const ActiveNodeBadge: React.FC<{ node: Node }> = React.memo(({ node }) => {
  const { width, height } = node.getDimensions();
  const { x, y } = getDefaultShapeDecoratorCenter(TopologyQuadrant.upperLeft, node);
  const iconSize = ACTIVE_BADGE_RADIUS * 1.1;
  // PF upper-left is 45° on the ring; shift right onto the node shoulder.
  const posX = x + Math.min(width, height) * 0.12;
  const posY = y;
  return (
    <g
      className="autorag-tree-node__active-badge"
      transform={`translate(${posX}, ${posY})`}
      data-testid="active-node-badge"
      role="img"
      aria-label={STATUS_BADGE_ARIA_LABELS.active}
    >
      <circle
        className="autorag-tree-node__active-badge-mask"
        r={ACTIVE_BADGE_RADIUS + 1}
        fill="#ffffff"
        style={{ fill: '#ffffff' }}
      />
      <circle
        className="autorag-tree-node__active-badge-disc"
        r={ACTIVE_BADGE_RADIUS}
        fill={INFO_BLUE}
        stroke="#ffffff"
        strokeWidth={ACTIVE_BADGE_STROKE}
        style={{ fill: INFO_BLUE, stroke: '#ffffff' }}
      />
      <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
        <g className="autorag-tree-node__status-spinner">
          <SyncAltIcon
            className="autorag-tree-node__active-badge-icon"
            width={iconSize}
            height={iconSize}
            color="#ffffff"
            style={{ color: '#ffffff', fill: '#ffffff' }}
          />
        </g>
      </g>
    </g>
  );
});
ActiveNodeBadge.displayName = 'ActiveNodeBadge';

/** White disc, thick red ring, red "!" — sits on the top-left of the node stroke. */
const FailedNodeBadge: React.FC<{ size: number }> = React.memo(({ size }) => {
  const iconSize = FAILED_BADGE_RADIUS * 0.95;
  const pos = (size / 2) * (1 - Math.SQRT1_2);
  return (
    <g
      className="autorag-tree-node__failed-badge"
      transform={`translate(${pos}, ${pos})`}
      data-testid="failed-node-badge"
      role="img"
      aria-label={STATUS_BADGE_ARIA_LABELS.failed}
    >
      <circle
        className="autorag-tree-node__failed-badge-disc"
        r={FAILED_BADGE_RADIUS}
        fill="#ffffff"
        stroke={DANGER_RED}
        strokeWidth={FAILED_BADGE_STROKE}
        style={{ fill: '#ffffff', stroke: DANGER_RED }}
      />
      <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
        <ExclamationIcon
          className="autorag-tree-node__failed-badge-icon"
          width={iconSize}
          height={iconSize}
          color={DANGER_RED}
          style={{ color: DANGER_RED, fill: DANGER_RED }}
        />
      </g>
    </g>
  );
});
FailedNodeBadge.displayName = 'FailedNodeBadge';

/** Filled rank badge at the top-left: gold star for 1, orange 2/3. */
const WinnerRankBadge: React.FC<{ rank: WinnerRank; size: number }> = React.memo(
  ({ rank, size }) => {
    const isStar = rank === 1;
    const iconSize = WINNER_BADGE_RADIUS * 1.35;
    // Center on the upper-left stroke (same 45° point as the failed badge).
    const pos = (size / 2) * (1 - Math.SQRT1_2);
    return (
      <g
        className={cx(
          'autorag-tree-node__winner-badge',
          isStar
            ? 'autorag-tree-node__winner-badge--star'
            : rank === 3
              ? 'autorag-tree-node__winner-badge--rank-3'
              : 'autorag-tree-node__winner-badge--rank-2',
        )}
        transform={`translate(${pos}, ${pos})`}
        data-testid={`winner-rank-badge-${rank}`}
        role="img"
        aria-label={isStar ? 'Pattern winner' : `Pattern winner ${rank}`}
      >
        <circle className="autorag-tree-node__winner-badge-disc" r={WINNER_BADGE_RADIUS} />
        {isStar ? (
          <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
            <StarIcon
              className="autorag-tree-node__winner-badge-icon"
              width={iconSize}
              height={iconSize}
              color={iconColorInverse.var}
              style={{ color: iconColorInverse.var, fill: iconColorInverse.var }}
            />
          </g>
        ) : (
          <text
            className="autorag-tree-node__winner-badge-text"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {rank}
          </text>
        )}
      </g>
    );
  },
);
WinnerRankBadge.displayName = 'WinnerRankBadge';

const TreeNodeInner: React.FC<{
  node: Node;
  onSelect?: (e: React.MouseEvent) => void;
  selected?: boolean;
}> = observer(({ node, onSelect, selected }) => {
  const patternsExpand = usePatternsExpand();
  const rawData = node.getData();
  const data = isTreeNodeData(rawData) ? rawData : undefined;
  const stepState = data?.stepState ?? 'pending';
  const justCompleted = useJustCompleted(stepState);
  const winnerRank = data?.winnerRank;
  const visualState = resolveTreeNodeVisualState({ stepState, justCompleted, winnerRank });
  const activeIconVariant = data?.activeIconVariant;
  const hideLabel = data?.hideLabel === true;
  const nodeRole = data?.nodeRole ?? 'task';
  const isAnnotation = nodeRole !== 'task';
  const annotationLabel =
    nodeRole === 'column-header' || nodeRole === 'row-label' ? data?.label : undefined;
  const taskLabel = hideLabel || isAnnotation ? annotationLabel : (data?.label ?? node.getLabel());
  const labelSubtitle = hideLabel || isAnnotation ? undefined : data?.labelSubtitle;
  const showWinnerStar = data?.showWinnerStar === true || winnerRank === 1;
  const nodeStatus =
    visualState === 'winner'
      ? undefined
      : visualState === 'success' || visualState === 'just-completed'
        ? NodeStatus.success
        : visualState === 'failed'
          ? NodeStatus.danger
          : visualState === 'active'
            ? undefined
            : treeStepStateToNodeStatus(stepState);
  const branchStep = !isAnnotation && isBranchStepNodeId(node.getId());
  const showsTaskIcon = !branchStep && !isAnnotation;
  const TaskIcon = resolveTaskIconForNodeId(node.getId());
  const { width, height } = node.getDimensions();
  const iconSize =
    branchStep && visualState === 'active'
      ? Math.min(width, height)
      : Math.min(width, height) * (branchStep ? 0.92 : 0.4);
  const iconColor =
    visualState === 'winner' ? winnerTaskIconColor(winnerRank) : TASK_ICON_COLORS[visualState];
  const showPatternsToggle =
    (data?.showPatternsToggle === true || nodeRole === 'patterns-toggle') &&
    patternsExpand?.showToggle === true;
  const isColumnHeader = nodeRole === 'column-header';
  const isRowLabel = nodeRole === 'row-label';
  const isColumnRule = nodeRole === 'column-rule';
  const labelWidth = showPatternsToggle ? 180 : isColumnHeader || isRowLabel ? width : 96;
  const [captionHeight, captionRef] = useBoundedCaptionHeight({
    showExpandToggle: showPatternsToggle,
    labelSubtitle,
    label: taskLabel,
    labelWidth,
    expandToggleExpanded: patternsExpand?.patternsExpanded,
    isColumnHeader,
  });
  const labelY = showPatternsToggle ? 0 : height + 4 + (branchStep ? (40 - height) / 2 : 0);

  const attachments = React.useMemo(() => {
    if (!showsTaskIcon) {
      return undefined;
    }
    return (
      <>
        <StatusBadgeDecorator element={node} visualState={visualState} />
      </>
    );
  }, [node, showsTaskIcon, visualState]);

  const displayLabel = taskLabel;

  if (isColumnRule) {
    return (
      <g className="autorag-tree-node-layer">
        <line
          className="autorag-tree-node__column-rule"
          x1={0}
          y1={0}
          x2={width}
          y2={0}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (isColumnHeader || isRowLabel) {
    return (
      <g className="autorag-tree-node-layer">
        <foreignObject x={0} y={0} width={width} height={height} style={{ overflow: 'visible' }}>
          <div
            ref={captionRef}
            className={cx(
              'autorag-tree-node__caption',
              isColumnHeader && 'autorag-tree-node__caption--column-header',
              isRowLabel && 'autorag-tree-node__caption--row-label',
            )}
          >
            {displayLabel ? (
              <div
                className={cx(
                  'autorag-tree-node__label',
                  isColumnHeader && 'autorag-tree-node__label--column-header',
                  isRowLabel && 'autorag-tree-node__label--row-label',
                )}
              >
                {isColumnHeader
                  ? displayLabel.split(/\s+/).map((word) => <div key={word}>{word}</div>)
                  : displayLabel}
              </div>
            ) : null}
          </div>
        </foreignObject>
      </g>
    );
  }

  return (
    <g className="autorag-tree-node-layer">
      <DefaultNode
        className={cx(
          'autorag-tree-node',
          branchStep && 'autorag-tree-node--status-only',
          isAnnotation && 'autorag-tree-node--annotation',
          !isAnnotation && !branchStep && visualState === 'pending' && 'autorag-tree-node--pending',
          visualState === 'active' && 'autorag-tree-node--active',
          visualState === 'just-completed' && 'autorag-tree-node--just-completed',
          visualState === 'success' && 'autorag-tree-node--success',
          visualState === 'failed' && 'autorag-tree-node--failed',
          visualState === 'winner' && 'autorag-tree-node--winner',
          visualState === 'winner' && winnerRank === 1 && 'autorag-tree-node--winner-1',
          visualState === 'winner' && winnerRank === 2 && 'autorag-tree-node--winner-2',
          visualState === 'winner' && winnerRank === 3 && 'autorag-tree-node--winner-3',
        )}
        element={node}
        nodeStatus={showsTaskIcon ? nodeStatus : undefined}
        showLabel={false}
        showStatusDecorator={false}
        onSelect={isAnnotation ? undefined : onSelect}
        selected={isAnnotation ? false : selected}
        attachments={attachments}
        showStatusBackground={false}
      >
        <g
          data-testid={`tree-node-${node.getId()}`}
          data-step-state={stepState}
          data-visual-state={visualState}
          data-branch-step={branchStep ? 'true' : 'false'}
          data-status-only={branchStep ? 'true' : 'false'}
          data-winner-star={showWinnerStar ? 'true' : 'false'}
          data-winner-rank={winnerRank ? String(winnerRank) : undefined}
          data-node-role={nodeRole}
        >
          {visualState === 'pending' && showsTaskIcon ? (
            <circle
              className="autorag-tree-node__pending-ring"
              cx={width / 2}
              cy={height / 2}
              r={Math.max(0, width / 2 - PENDING_RING_WIDTH / 2)}
              fill={PENDING_RING_FILL}
              stroke={PENDING_RING_STROKE}
              strokeWidth={PENDING_RING_WIDTH}
              strokeDasharray={PENDING_RING_DASH}
            />
          ) : null}
          {visualState === 'pending' && branchStep ? (
            <StatusOnlyPendingDot size={Math.min(width, height)} />
          ) : null}
          {showsTaskIcon || (branchStep && visualState !== 'pending') ? (
            <g
              className={cx(
                showsTaskIcon && 'autorag-tree-node__task-icon',
                showsTaskIcon &&
                  visualState === 'pending' &&
                  'autorag-tree-node__task-icon--pending',
                showsTaskIcon && visualState === 'active' && 'autorag-tree-node__task-icon--active',
              )}
              style={showsTaskIcon ? { color: iconColor } : undefined}
              transform={`translate(${width / 2}, ${
                height / 2 + (showsTaskIcon && visualState === 'active' ? 1.5 : 0)
              })`}
            >
              <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
                {branchStep ? (
                  visualState === 'failed' ? (
                    <StatusOnlyFailedSectionDot size={iconSize} />
                  ) : visualState === 'just-completed' ? (
                    <StatusOnlyCompletedDot size={iconSize} />
                  ) : visualState === 'success' ? (
                    <StatusOnlySuccessDot size={iconSize} />
                  ) : visualState === 'active' ? (
                    <StatusOnlyActiveDot size={iconSize} activeIconVariant={activeIconVariant} />
                  ) : null
                ) : (
                  <TaskIcon width={iconSize} height={iconSize} />
                )}
              </g>
            </g>
          ) : null}
          {displayLabel || showPatternsToggle ? (
            <foreignObject
              x={(width - labelWidth) / 2}
              y={labelY}
              width={labelWidth}
              height={captionHeight}
              style={{ overflow: 'visible' }}
            >
              <div ref={captionRef} className="autorag-tree-node__caption">
                {displayLabel ? (
                  <div
                    className={cx(
                      'autorag-tree-node__label',
                      selected && 'autorag-tree-node__label--selected',
                      labelSubtitle && 'autorag-tree-node__label--with-subtitle',
                    )}
                  >
                    <div>{displayLabel}</div>
                    {labelSubtitle ? (
                      <div className="autorag-tree-node__winner-subtitle">{labelSubtitle}</div>
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
                      {patternsExpand.patternsExpanded
                        ? 'Collapse patterns'
                        : patternsExpand.patternCount > 0
                          ? `Show all ${patternsExpand.patternCount} patterns`
                          : 'Show all patterns'}
                    </Button>
                  </div>
                ) : null}
              </div>
            </foreignObject>
          ) : null}
        </g>
      </DefaultNode>
      {visualState === 'active' && showsTaskIcon ? <ActiveNodeBadge node={node} /> : null}
      {visualState === 'failed' && showsTaskIcon ? <FailedNodeBadge size={width} /> : null}
      {winnerRank ? (
        <WinnerRankBadge rank={winnerRank} size={width} />
      ) : showWinnerStar ? (
        <WinnerRankBadge rank={1} size={width} />
      ) : null}
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
