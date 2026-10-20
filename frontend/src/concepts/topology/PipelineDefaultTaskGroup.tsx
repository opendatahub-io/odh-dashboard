import * as React from 'react';

import {
  WithSelectionProps,
  isNode,
  DefaultTaskGroup,
  observer,
  Node,
  GraphElement,
  RunStatus,
  ScaleDetailsLevel,
  NodeModel,
  useHover,
  PipelineNodeModel,
  TaskGroupPillLabel,
  LabelPosition,
  SELECTION_EVENT,
  useCombineRefs,
  useVisualizationController,
} from '@patternfly/react-topology';
import { Button, Flex, FlexItem, Popover, Stack, StackItem } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import { PipelineNodeModelExpanded, StandardTaskNodeData } from '#~/concepts/topology/types';
import NodeStatusIcon from '#~/concepts/topology/NodeStatusIcon';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import { getPipelineTaskStatusLabel, getRunStatusLabel } from '#~/concepts/topology/utils';
import {
  hideSvgTaskLabelsFromKeyboard,
  isHiddenByCollapsedAncestor,
  panFocusedControlIntoView,
} from '#~/concepts/topology/a11yUtils';
import { activateNodeButtonOnKeyDown } from '#~/concepts/topology/PipelineNodeButton';
import { NODE_HEIGHT, NODE_WIDTH } from './const';

const MAX_TIP_ITEMS = 6;
const EXPANDED_TOGGLE_OFFSET_FROM_CENTER = NODE_WIDTH / 2 - 42.5;

type PipelinesDefaultGroupProps = {
  element: GraphElement<PipelineNodeModelExpanded>;
} & WithSelectionProps;

type PipelinesDefaultGroupInnerProps = Omit<PipelinesDefaultGroupProps, 'element'> & {
  element: Node<PipelineNodeModel, StandardTaskNodeData>;
};

type AccessibleTaskGroupPillLabelProps = React.ComponentProps<typeof TaskGroupPillLabel> & {
  groupLabel: string;
  onActionChange: (handler: ((event: React.MouseEvent) => void) | undefined) => void;
};

const AccessibleTaskGroupPillLabel: React.FC<AccessibleTaskGroupPillLabelProps> = ({
  groupLabel,
  onActionChange,
  ...props
}) => {
  const labelRef = React.useRef<SVGGElement>(null);

  React.useLayoutEffect(() => {
    onActionChange(props.onActionIconClick);
    return () => {
      onActionChange(undefined);
    };
  }, [onActionChange, props.onActionIconClick]);

  React.useLayoutEffect(() => {
    const label = labelRef.current;
    if (!label) {
      return undefined;
    }

    hideSvgTaskLabelsFromKeyboard(label);
    const labelObserver = new MutationObserver(() => hideSvgTaskLabelsFromKeyboard(label));
    labelObserver.observe(label, { childList: true, subtree: true });
    return () => labelObserver.disconnect();
  }, []);

  return (
    <g ref={labelRef} data-testid={`pipeline-group-label-${groupLabel}`}>
      <TaskGroupPillLabel {...props} />
    </g>
  );
};

const DefaultTaskGroupInner: React.FunctionComponent<PipelinesDefaultGroupInnerProps> = observer(
  ({ element, selected, onSelect }) => {
    const controller = useVisualizationController();
    const [hover, hoverRef] = useHover<SVGGElement>();
    const groupRef = React.useRef<SVGGElement>(null);
    const combinedRef = useCombineRefs(hoverRef, groupRef);
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [toggleFocused, setToggleFocused] = React.useState(false);
    const popoverRef = React.useRef<HTMLButtonElement>(null);
    const toggleRef = React.useRef<HTMLButtonElement>(null);
    const expandedActionRef = React.useRef<((event: React.MouseEvent) => void) | undefined>();
    const setExpandedAction = React.useCallback(
      (handler: ((event: React.MouseEvent) => void) | undefined) => {
        expandedActionRef.current = handler;
      },
      [],
    );
    const focusToggleAfterCollapse = React.useRef(false);
    const detailsLevel = element.getGraph().getDetailsLevel();
    const isCollapsed = element.isCollapsed();
    const isHidden = isHiddenByCollapsedAncestor(element);
    const runStatus = element.getData()?.runStatus;
    const state = element.getData()?.pipelineTask.status?.state;

    React.useEffect(() => {
      if (!isCollapsed || isHidden) {
        setPopoverOpen(false);
      }
    }, [isCollapsed, isHidden]);

    React.useEffect(() => {
      if (focusToggleAfterCollapse.current) {
        toggleRef.current?.focus();
        focusToggleAfterCollapse.current = false;
      }
    }, [isCollapsed]);

    React.useLayoutEffect(() => {
      const group = groupRef.current;
      if (!group) {
        return undefined;
      }

      hideSvgTaskLabelsFromKeyboard(group);
      const groupObserver = new MutationObserver(() => hideSvgTaskLabelsFromKeyboard(group));
      groupObserver.observe(group, { childList: true, subtree: true });
      return () => groupObserver.disconnect();
    }, []);

    const activateCollapseAction = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!isCollapsed && expandedActionRef.current) {
          focusToggleAfterCollapse.current = true;
          expandedActionRef.current(event);
          return;
        }

        // DefaultTaskGroup owns collapse state, layout, and viewport updates. It exposes no
        // imperative expand action, so route this button through its collapsed SVG action icon.
        // Keep the group-toggle Cypress test when updating PatternFly's action icon markup.
        const actionIcon = groupRef.current?.querySelector<SVGGElement>(
          '.pf-topology__node__action-icon',
        );
        if (actionIcon) {
          focusToggleAfterCollapse.current = true;
          actionIcon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      },
      [isCollapsed],
    );

    const selectNode = React.useCallback(
      (nodeId: string) => {
        controller.fireEvent(SELECTION_EVENT, [nodeId]);
      },
      [controller],
    );

    const getPopoverTasksList = (items: Node<NodeModel>[], hidePopover: () => void) => (
      <Stack hasGutter>
        <StackItem>
          <Button
            variant="link"
            isInline
            onClick={() => {
              hidePopover();
              selectNode(element.getId());
            }}
            onKeyDown={activateNodeButtonOnKeyDown}
            aria-label={`View details for ${element.getLabel()} task group`}
            data-pipeline-node-id={element.getId()}
            data-testid={`pipeline-group-details-${element.getLabel()}`}
          >
            View group details
          </Button>
        </StackItem>
        {items.slice(0, MAX_TIP_ITEMS).map((item: Node) => {
          const childState = item.getData()?.pipelineTask.status?.state;
          const childRunStatus = item.getData()?.runStatus;
          const childStatus = getPipelineTaskStatusLabel(childState, childRunStatus);
          const childLabel = item.getLabel();
          return (
            <StackItem key={item.getId()}>
              <Button
                variant="link"
                isInline
                onClick={() => {
                  hidePopover();
                  selectNode(item.getId());
                }}
                onKeyDown={activateNodeButtonOnKeyDown}
                aria-label={
                  childStatus ? `${childLabel}, ${childStatus}` : `${childLabel}, View task details`
                }
                data-testid={`pipeline-group-task-${item.getId()}`}
              >
                <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem className="odh-pipeline-group-task-status" aria-hidden="true">
                    {childRunStatus != null && childStatus ? (
                      <NodeStatusIcon runStatus={childRunStatus} executionState={childState} />
                    ) : null}
                  </FlexItem>
                  <FlexItem flex={{ default: 'flex_1' }}>
                    {childLabel}
                    {childStatus ? ` (${childStatus})` : ''}
                  </FlexItem>
                </Flex>
              </Button>
            </StackItem>
          );
        })}
        {items.length > MAX_TIP_ITEMS ? (
          <StackItem>{`... ${items.length - MAX_TIP_ITEMS} others`}</StackItem>
        ) : null}
      </Stack>
    );

    let status = runStatus;
    if (state === ExecutionStateKF.CACHED) {
      status = RunStatus.Succeeded;
    } else if (state === ExecutionStateKF.RUNNING) {
      status = RunStatus.InProgress;
    }

    const childCount = element.getAllNodeChildren().length;
    const pipelineTask = element.getData()?.pipelineTask;
    const iterationCount =
      pipelineTask &&
      'iterationCount' in pipelineTask &&
      typeof pipelineTask.iterationCount === 'number'
        ? pipelineTask.iterationCount
        : undefined;
    const badgeText = iterationCount != null ? `x${iterationCount}` : undefined;
    const groupLabel = element.getLabel();
    const groupStatusLabel = getRunStatusLabel(status);
    const groupAriaLabel = groupStatusLabel
      ? `${groupLabel} task group, ${childCount} ${
          childCount === 1 ? 'task' : 'tasks'
        }, ${groupStatusLabel}`
      : `${groupLabel} task group, ${childCount} ${childCount === 1 ? 'task' : 'tasks'}`;
    const bounds = element.getBounds();
    // PatternFly centers the expanded pill on the group, even when the group widens.
    const expandedToggleX = bounds.x + bounds.width / 2 + EXPANDED_TOGGLE_OFFSET_FROM_CENTER;
    const GroupLabelComponent = React.useCallback(
      (props: React.ComponentProps<typeof TaskGroupPillLabel>) => (
        <AccessibleTaskGroupPillLabel
          {...props}
          groupLabel={groupLabel}
          onActionChange={setExpandedAction}
          badge={badgeText}
          customStatusIcon={status === RunStatus.Cancelled ? <BanIcon /> : undefined}
        />
      ),
      [badgeText, groupLabel, setExpandedAction, status],
    );

    const groupNode = (
      <DefaultTaskGroup
        element={element}
        collapsible
        recreateLayoutOnCollapseChange
        GroupLabelComponent={GroupLabelComponent}
        selected={selected}
        onSelect={onSelect}
        hideDetailsAtMedium
        centerLabelOnEdge
        labelPosition={LabelPosition.top}
        showStatusState
        hover={isCollapsed ? hover || toggleFocused : toggleFocused || undefined}
        scaleNode={(hover || toggleFocused) && detailsLevel !== ScaleDetailsLevel.high}
        customStatusIcon={status === RunStatus.Cancelled ? <BanIcon /> : undefined}
        showLabelOnHover
        status={status}
        hiddenDetailsShownStatuses={[
          RunStatus.Succeeded,
          RunStatus.Pending,
          RunStatus.Failed,
          RunStatus.Cancelled,
        ]}
        collapsedHeight={NODE_HEIGHT}
        collapsedWidth={NODE_WIDTH}
      />
    );

    return (
      <g ref={combinedRef}>
        {groupNode}
        {isCollapsed && !isHidden ? (
          <foreignObject
            x={0}
            y={0}
            width={Math.max(0, bounds.width - 12)}
            height={bounds.height}
            overflow="visible"
          >
            <Popover
              triggerRef={popoverRef}
              onShow={() => setPopoverOpen(true)}
              onHide={() => setPopoverOpen(false)}
              onHidden={() => setPopoverOpen(false)}
              aria-label={groupAriaLabel}
              headerContent={groupLabel}
              bodyContent={(hidePopover) =>
                getPopoverTasksList(element.getAllNodeChildren(), hidePopover)
              }
            >
              <button
                ref={popoverRef}
                type="button"
                className="odh-pipeline-node-button m-group pf-v6-u-display-block pf-v6-u-w-100 pf-v6-u-h-100"
                aria-label={`Show tasks in ${groupAriaLabel}`}
                aria-expanded={popoverOpen}
                onFocus={(event) => panFocusedControlIntoView(element, event.currentTarget)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={activateNodeButtonOnKeyDown}
                data-pipeline-node-id={element.getId()}
                data-testid={`pipeline-group-button-${groupLabel}`}
              />
            </Popover>
          </foreignObject>
        ) : null}
        {!isHidden ? (
          <foreignObject
            x={isCollapsed ? bounds.width - 12 : expandedToggleX}
            y={isCollapsed ? 0 : bounds.y - 13}
            width={28.25}
            height={isCollapsed ? bounds.height : 26}
            overflow="visible"
          >
            <button
              ref={toggleRef}
              type="button"
              className="odh-pipeline-node-button m-group m-group-toggle pf-v6-u-display-block pf-v6-u-w-100 pf-v6-u-h-100"
              aria-label={`${groupLabel} task group`}
              aria-expanded={!isCollapsed}
              onFocus={() => {
                setToggleFocused(true);
                if (toggleRef.current) {
                  panFocusedControlIntoView(element, toggleRef.current);
                }
              }}
              onBlur={() => setToggleFocused(false)}
              onClick={activateCollapseAction}
              onKeyDown={activateNodeButtonOnKeyDown}
              data-pipeline-node-id={element.getId()}
              data-testid={`pipeline-group-toggle-${groupLabel}`}
            />
          </foreignObject>
        ) : null}
      </g>
    );
  },
);

const PipelineDefaultTaskGroup: React.FunctionComponent<PipelinesDefaultGroupProps> = ({
  element,
  ...rest
}: PipelinesDefaultGroupProps & WithSelectionProps) => {
  if (!isNode(element)) {
    throw new Error('DefaultTaskGroup must be used only on Node elements');
  }

  return <DefaultTaskGroupInner element={element} {...rest} />;
};

export default observer(PipelineDefaultTaskGroup);
