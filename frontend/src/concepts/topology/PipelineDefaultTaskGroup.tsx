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
  useVisualizationController,
} from '@patternfly/react-topology';
import { Button, Flex, FlexItem, Popover, Stack, StackItem } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import { t_global_spacer_lg as globalSpacerLg } from '@patternfly/react-tokens';
import { PipelineNodeModelExpanded, StandardTaskNodeData } from '#~/concepts/topology/types';
import NodeStatusIcon from '#~/concepts/topology/NodeStatusIcon';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import { getRunStatusLabel } from '#~/concepts/topology/utils';
import { isHiddenByCollapsedAncestor } from '#~/concepts/topology/a11yUtils';
import { activateNodeButtonOnKeyDown } from '#~/concepts/topology/PipelineNodeButton';
import { NODE_HEIGHT, NODE_WIDTH } from './const';

const MAX_TIP_ITEMS = 6;

type PipelinesDefaultGroupProps = {
  element: GraphElement<PipelineNodeModelExpanded>;
} & WithSelectionProps;

type PipelinesDefaultGroupInnerProps = Omit<PipelinesDefaultGroupProps, 'element'> & {
  element: Node<PipelineNodeModel, StandardTaskNodeData>;
};

const DefaultTaskGroupInner: React.FunctionComponent<PipelinesDefaultGroupInnerProps> = observer(
  ({ element, selected, onSelect }) => {
    const controller = useVisualizationController();
    const [hover, hoverRef] = useHover<SVGGElement>();
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [toggleFocused, setToggleFocused] = React.useState(false);
    const groupActionClassName = `odh-pipeline-task-group-${React.useId().replace(/:/g, '')}`;
    const popoverRef = React.useRef<HTMLButtonElement>(null);
    const toggleRef = React.useRef<HTMLButtonElement>(null);
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
      // Hide PatternFly's SVG label before paint so it never becomes a transient Tab stop.
      document
        .querySelectorAll<SVGTextElement>(
          `.${groupActionClassName} .pf-topology-pipelines__pill-text`,
        )
        .forEach((label) => {
          label.setAttribute('tabindex', '-1');
          label.setAttribute('aria-hidden', 'true');
        });
    }, [groupActionClassName, hover, isCollapsed, runStatus, state, toggleFocused]);

    const activateCollapseAction = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        // DefaultTaskGroup owns collapse state, layout, and viewport updates. It exposes no
        // imperative collapse action, so route this button through its SVG action icon. Keep
        // the group-toggle Cypress test when updating PatternFly's action icon markup.
        const actionIcon = document.querySelector<SVGGElement>(
          `.${groupActionClassName} .pf-topology__node__action-icon`,
        );
        if (actionIcon) {
          focusToggleAfterCollapse.current = true;
          actionIcon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      },
      [groupActionClassName],
    );

    const selectChild = React.useCallback(
      (childId: string) => {
        controller.fireEvent(SELECTION_EVENT, [childId]);
      },
      [controller],
    );

    const getPopoverTasksList = (items: Node<NodeModel>[], hidePopover: () => void) => (
      <Stack hasGutter>
        {items.slice(0, MAX_TIP_ITEMS).map((item: Node) => {
          const childRunStatus = item.getData()?.runStatus;
          const childStatus = getRunStatusLabel(childRunStatus);
          const childLabel = item.getLabel();
          return (
            <StackItem key={item.getId()}>
              <Button
                variant="link"
                isInline
                onClick={() => {
                  hidePopover();
                  selectChild(item.getId());
                }}
                aria-label={
                  childStatus ? `${childLabel}, ${childStatus}` : `${childLabel}, View task details`
                }
                data-testid={`pipeline-group-task-${item.getId()}`}
              >
                <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem style={{ flex: '0', width: globalSpacerLg.var }} aria-hidden="true">
                    {childRunStatus != null && childStatus ? (
                      <NodeStatusIcon runStatus={childRunStatus} />
                    ) : null}
                  </FlexItem>
                  <FlexItem style={{ flex: '1' }}>
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

    const groupNode = (
      <DefaultTaskGroup
        element={element}
        className={groupActionClassName}
        collapsible
        recreateLayoutOnCollapseChange
        GroupLabelComponent={(props) => (
          <TaskGroupPillLabel
            {...props}
            badge={badgeText}
            customStatusIcon={status === RunStatus.Cancelled ? <BanIcon /> : undefined}
          />
        )}
        selected={selected}
        onSelect={onSelect}
        hideDetailsAtMedium
        centerLabelOnEdge
        labelPosition={LabelPosition.top}
        showStatusState
        hover={hover || toggleFocused}
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
      <g ref={hoverRef}>
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
                className="odh-pipeline-node-button m-group"
                aria-label={`Show tasks in ${groupAriaLabel}`}
                aria-expanded={popoverOpen}
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
            x={isCollapsed ? bounds.width - 12 : bounds.x + bounds.width - 42.5}
            y={isCollapsed ? 0 : bounds.y - 13}
            width={28.25}
            height={isCollapsed ? bounds.height : 26}
            overflow="visible"
          >
            <button
              ref={toggleRef}
              type="button"
              className="odh-pipeline-node-button m-group m-group-toggle"
              aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${groupLabel} task group`}
              aria-expanded={!isCollapsed}
              onFocus={() => setToggleFocused(true)}
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
