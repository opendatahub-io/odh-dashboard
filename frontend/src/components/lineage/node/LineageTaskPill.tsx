/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React, { useRef, useMemo, useEffect } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-topology/dist/esm/css/topology-pipelines';
import topologyStyles from '@patternfly/react-topology/dist/esm/css/topology-components';
import { Tooltip } from '@patternfly/react-core';
import {
  observer,
  Node,
  ScaleDetailsLevel,
  RunStatus,
  createSvgIdUrl,
  useHover,
  useSize,
} from '@patternfly/react-topology';
import { truncateMiddle } from '@patternfly/react-topology/dist/esm/utils/truncate-middle';
import {
  getRunStatusModifier,
  nonShadowModifiers,
} from '@patternfly/react-topology/dist/esm/pipelines/utils';
import StatusIcon from '@patternfly/react-topology/dist/esm/pipelines/utils/StatusIcon';
import NodeShadows, {
  NODE_SHADOW_FILTER_ID_DANGER,
  NODE_SHADOW_FILTER_ID_HOVER,
} from '@patternfly/react-topology/dist/esm/components/nodes/NodeShadows';
import LabelIcon from '@patternfly/react-topology/dist/esm/components/nodes/labels/LabelIcon';
import LabelBadge from '@patternfly/react-topology/dist/esm/components/nodes/labels/LabelBadge';
import { DagreLayoutOptions, TOP_TO_BOTTOM } from '@patternfly/react-topology/dist/esm/layouts';

const STATUS_ICON_SIZE = 16;

export interface LineageTaskPillProps {
  element: Node;
  className?: string;
  width?: number;
  paddingX?: number;
  paddingY?: number;
  status?: RunStatus;
  statusIconSize?: number;
  showStatusState?: boolean;
  scaleNode?: boolean;
  hideDetailsAtMedium?: boolean;
  hiddenDetailsShownStatuses?: RunStatus[];
  leadIcon?: React.ReactNode;
  badge?: string;
  badgeClassName?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  badgeBorderColor?: string;
  customStatusIcon?: React.ReactNode;
  nameLabelClass?: string;
  taskIconClass?: string;
  taskIcon?: React.ReactNode;
  taskIconTooltip?: string;
  taskIconPadding?: number;
  hover?: boolean;
  truncateLength?: number;
  disableTooltip?: boolean;
  selected?: boolean;
  onSelect?: (event: React.MouseEvent) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  contextMenuOpen?: boolean;
  hideContextMenuKebab?: boolean;
  shadowCount?: number;
  shadowOffset?: number;
  x?: number;
  y?: number;
}

export interface TaskPillDimensions {
  height: number;
  statusStartX: number;
  textStartX: number;
  actionStartX: number;
  contextStartX: number;
  pillWidth: number;
  badgeStartX: number;
  iconWidth: number;
  iconStartX: number;
  leadIconStartX: number;
  offsetX: number;
}

const LineageTaskPill: React.FC<LineageTaskPillProps> = observer(
  ({
    element,
    className,
    width = 0,
    paddingX = 8,
    paddingY = 8,
    status = RunStatus.Idle,
    statusIconSize = STATUS_ICON_SIZE,
    showStatusState = true,
    scaleNode,
    hideDetailsAtMedium,
    hiddenDetailsShownStatuses = [RunStatus.Failed, RunStatus.FailedToStart, RunStatus.Cancelled],
    leadIcon,
    badge,
    badgeClassName = styles.topologyPipelinesPillBadge,
    badgeColor,
    badgeTextColor,
    badgeBorderColor,
    customStatusIcon,
    nameLabelClass,
    taskIconClass,
    taskIcon,
    taskIconTooltip,
    taskIconPadding = 4,
    hover,
    truncateLength = 14,
    disableTooltip = false,
    selected,
    onSelect,
    onContextMenu,
    hideContextMenuKebab,
    shadowCount = 0,
    shadowOffset = 8,
    x = 0,
    y = 0,
  }) => {
    const [hovered] = useHover();
    const taskIconComponentRef = useRef(null);
    const isHover = hover !== undefined ? hover : hovered;
    const label = truncateMiddle(element.getLabel(), { length: truncateLength, omission: '...' });
    const [textSize, textRef] = useSize([label, className]);
    const nameLabelTriggerRef = useRef<SVGTextElement | null>(null);
    const [statusSize, statusRef] = useSize([status, showStatusState, statusIconSize]);
    const [leadSize, leadIconRef] = useSize([leadIcon]);
    const [badgeSize, badgeRef] = useSize([badge]);
    const badgeLabelTriggerRef = useRef<SVGGElement>(null);
    const badgeRectRef = useRef<SVGRectElement>(null);
    const detailsLevel = element.getGraph().getDetailsLevel();
    const verticalLayout =
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (element.getGraph().getLayoutOptions?.() as DagreLayoutOptions).rankdir === TOP_TO_BOTTOM;

    const textWidth = textSize?.width || 0;
    const textHeight = textSize?.height || 0;

    // This is the crucial calculation logic from TaskPill line 101-113
    const dimensions: TaskPillDimensions = useMemo(() => {
      if (!textSize) {
        return {
          height: 0,
          statusStartX: 0,
          textStartX: 0,
          actionStartX: 0,
          contextStartX: 0,
          pillWidth: 0,
          badgeStartX: 0,
          iconWidth: 0,
          iconStartX: 0,
          leadIconStartX: 0,
          offsetX: 0,
        };
      }
      const height: number = textHeight + 2 * paddingY;
      const startX = paddingX + paddingX / 2;

      const iconWidth = taskIconClass || taskIcon ? height - taskIconPadding : 0;
      const iconStartX = -(iconWidth * 0.75);

      const statusStartX = startX - statusIconSize / 4; // Adjust for icon padding
      const statusSpace = showStatusState ? statusSize.width + paddingX : 0;

      const leadIconStartX = startX + statusSpace;
      const leadIconSpace = leadIcon ? leadSize.width + paddingX : 0;

      const textStartX = leadIconStartX + leadIconSpace;
      const textSpace = textWidth + paddingX;

      const badgeStartX = textStartX + textSpace;
      const badgeSpace = badge ? badgeSize.width + paddingX : 0;

      const actionStartX = badgeStartX + badgeSpace;
      const contextStartX = actionStartX; // No action icon space since we don't use it
      const contextSpace = !hideContextMenuKebab && onContextMenu ? paddingX : 0;

      const pillWidth = contextStartX + contextSpace + paddingX / 2;

      const offsetX = verticalLayout ? (width - pillWidth) / 2 : 0;

      return {
        height,
        statusStartX,
        textStartX,
        actionStartX,
        contextStartX,
        badgeStartX,
        iconWidth,
        iconStartX,
        leadIconStartX,
        pillWidth,
        offsetX,
      };
    }, [
      textSize,
      textHeight,
      textWidth,
      paddingY,
      paddingX,
      taskIconClass,
      taskIcon,
      taskIconPadding,
      statusIconSize,
      status,
      showStatusState,
      leadSize,
      leadIcon,
      statusSize,
      badgeSize,
      badge,
      hideContextMenuKebab,
      onContextMenu,
      verticalLayout,
      width,
    ]);

    // Store dimensions in element data so anchors can access them
    useEffect(() => {
      const elementData = element.getData();
      element.setData({ ...elementData, pillDimensions: dimensions });
    }, [element, dimensions]);

    const scale = element.getGraph().getScale();

    const runStatusModifier = getRunStatusModifier(status);
    const pillClasses = css(
      styles.topologyPipelinesPill,
      className,
      isHover && styles.modifiers.hover,
      runStatusModifier,
      selected && styles.modifiers.selected,
      onSelect && styles.modifiers.selectable,
    );

    let filter: string | undefined;
    if (runStatusModifier === styles.modifiers.danger) {
      filter = createSvgIdUrl(NODE_SHADOW_FILTER_ID_DANGER);
    } else if (isHover && !nonShadowModifiers.includes(runStatusModifier)) {
      filter = createSvgIdUrl(NODE_SHADOW_FILTER_ID_HOVER);
    }

    const taskIconComponent = (taskIconClass || taskIcon) && (
      <LabelIcon
        x={dimensions.offsetX + dimensions.iconStartX + dimensions.iconWidth}
        y={(dimensions.height - dimensions.iconWidth) / 2}
        width={dimensions.iconWidth}
        height={dimensions.iconWidth}
        iconClass={taskIconClass}
        icon={taskIcon}
        padding={taskIconPadding}
        innerRef={taskIconComponentRef}
      />
    );

    // Handle the simplified status icon display for medium/low detail levels
    if (
      showStatusState &&
      !scaleNode &&
      hideDetailsAtMedium &&
      detailsLevel !== ScaleDetailsLevel.high
    ) {
      const statusBackgroundRadius = statusIconSize / 2 + 4;
      const upScale = 1 / scale;
      const { height: boundsHeight } = element.getBounds();

      const translateX = verticalLayout ? width / 2 - statusBackgroundRadius * upScale : 0;
      const translateY = verticalLayout
        ? 0
        : (boundsHeight - statusBackgroundRadius * 2 * upScale) / 2;

      return (
        <g transform={`translate(${translateX}, ${translateY}) scale(${upScale})`}>
          <circle
            className={css(
              styles.topologyPipelinesStatusIconBackground,
              styles.topologyPipelinesPillStatus,
              runStatusModifier,
              selected && 'pf-m-selected',
            )}
            cx={statusBackgroundRadius}
            cy={statusBackgroundRadius}
            r={statusBackgroundRadius}
          />
          {hiddenDetailsShownStatuses.includes(status) ? (
            <g transform="translate(4, 4)">
              <g
                className={css(
                  styles.topologyPipelinesStatusIcon,
                  runStatusModifier,
                  selected && 'pf-m-selected',
                  (status === RunStatus.Running || status === RunStatus.InProgress) &&
                    styles.modifiers.spin,
                )}
              >
                {customStatusIcon ?? <StatusIcon status={status} />}
              </g>
            </g>
          ) : null}
        </g>
      );
    }

    // Create shadows
    const shadows = [];
    for (let i = shadowCount; i > 0; i--) {
      shadows.push(
        <rect
          key={`shadow-offset-${i}`}
          x={dimensions.offsetX + shadowOffset * i}
          y={0}
          width={dimensions.pillWidth}
          height={dimensions.height}
          rx={dimensions.height / 2}
          className={css(topologyStyles.topologyNodeBackground, 'pf-m-disabled')}
          filter={filter}
        />,
      );
    }

    return (
      <g
        className={pillClasses}
        transform={`translate(${x},${y})`}
        onClick={onSelect}
        onContextMenu={onContextMenu}
      >
        <NodeShadows />
        {/* Hidden text element for size measurement */}
        <text
          ref={(el) => el && textRef(el)}
          className={css(nameLabelClass, styles.topologyPipelinesPillText)}
          opacity={0}
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
        {shadows}
        <rect
          x={dimensions.offsetX}
          y={0}
          width={dimensions.pillWidth}
          height={dimensions.height}
          rx={dimensions.height / 2}
          className={css(styles.topologyPipelinesPillBackground)}
          filter={filter}
        />
        <g transform={`translate(${dimensions.textStartX}, ${paddingY + textHeight / 2 + 1})`}>
          {element.getLabel() !== label && !disableTooltip ? (
            <Tooltip triggerRef={nameLabelTriggerRef} content={element.getLabel()}>
              <text
                x={dimensions.offsetX}
                ref={(el) => {
                  nameLabelTriggerRef.current = el;
                }}
                className={css(nameLabelClass, styles.topologyPipelinesPillText)}
                dominantBaseline="middle"
              >
                {label}
              </text>
            </Tooltip>
          ) : (
            <text
              x={dimensions.offsetX}
              className={css(nameLabelClass, styles.topologyPipelinesPillText)}
              dominantBaseline="middle"
            >
              {label}
            </text>
          )}
        </g>
        {showStatusState && (
          <g
            transform={`translate(${dimensions.offsetX + dimensions.statusStartX + paddingX / 2}, ${
              (dimensions.height - statusIconSize) / 2
            })`}
            ref={statusRef}
          >
            <g
              className={css(
                styles.topologyPipelinesPillStatus,
                runStatusModifier,
                selected && 'pf-m-selected',
                (status === RunStatus.Running || status === RunStatus.InProgress) &&
                  styles.modifiers.spin,
              )}
            >
              {customStatusIcon ?? <StatusIcon status={status} />}
            </g>
          </g>
        )}
        {leadIcon && (
          <g
            transform={`translate(${dimensions.offsetX + dimensions.leadIconStartX}, ${
              (dimensions.height - leadSize.height) / 2
            })`}
            ref={leadIconRef}
          >
            {leadIcon}
          </g>
        )}
        {taskIconComponent &&
          (taskIconTooltip ? (
            <Tooltip triggerRef={taskIconComponentRef} content={taskIconTooltip}>
              {taskIconComponent}
            </Tooltip>
          ) : (
            taskIconComponent
          ))}
        {badge && (
          <g ref={(el) => el && badgeRef(el)}>
            <LabelBadge
              ref={badgeRectRef}
              innerRef={badgeLabelTriggerRef}
              x={dimensions.offsetX + dimensions.badgeStartX}
              y={(dimensions.height - (badgeSize?.height ?? 0)) / 2}
              badge={badge}
              badgeClassName={badgeClassName}
              badgeColor={badgeColor}
              badgeTextColor={badgeTextColor}
              badgeBorderColor={badgeBorderColor}
            />
          </g>
        )}
      </g>
    );
  },
);

export default LineageTaskPill;
