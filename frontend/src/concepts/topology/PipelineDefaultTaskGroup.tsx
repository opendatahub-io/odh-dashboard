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
import { PipelineNodeModelExpanded, StandardTaskNodeData } from '#~/concepts/topology/types';
import NodeStatusIcon from '#~/concepts/topology/NodeStatusIcon';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import { getRunStatusLabel } from '#~/concepts/topology/utils';
import { isHiddenByCollapsedAncestor } from '#~/concepts/topology/a11yUtils';
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
    const popoverRef = React.useRef<HTMLButtonElement>(null);
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

    const selectChild = React.useCallback(
      (childId: string) => {
        setPopoverOpen(false);
        controller.fireEvent(SELECTION_EVENT, [childId]);
      },
      [controller],
    );

    const getPopoverTasksList = (items: Node<NodeModel>[]) => (
      <Stack hasGutter>
        {items.slice(0, MAX_TIP_ITEMS).map((item: Node) => {
          const childStatus = getRunStatusLabel(item.getData()?.runStatus);
          const childLabel = item.getLabel();
          return (
            <StackItem key={item.getId()}>
              <Button
                variant="link"
                isInline
                onClick={() => selectChild(item.getId())}
                aria-label={
                  childStatus ? `${childLabel}, ${childStatus}` : `${childLabel}, View task details`
                }
                data-testid={`pipeline-group-task-${item.getId()}`}
              >
                <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem style={{ flex: '0', width: 26 }} aria-hidden="true">
                    <NodeStatusIcon runStatus={item.getData()?.runStatus} />
                  </FlexItem>
                  <FlexItem style={{ flex: '1', marginLeft: 4 }}>
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

    const status = React.useMemo(() => {
      switch (state) {
        case ExecutionStateKF.CACHED:
          return RunStatus.Succeeded;
        case ExecutionStateKF.RUNNING:
          return RunStatus.InProgress;
        default:
          return runStatus;
      }
    }, [state, runStatus]);

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
        scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
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
          <foreignObject x={0} y={0} width={bounds.width} height={bounds.height} overflow="visible">
            <Popover
              triggerAction="click"
              triggerRef={popoverRef}
              isVisible={popoverOpen}
              shouldClose={() => setPopoverOpen(false)}
              aria-label={groupAriaLabel}
              headerContent={groupLabel}
              bodyContent={getPopoverTasksList(element.getAllNodeChildren())}
            >
              <button
                ref={popoverRef}
                type="button"
                className="pipeline-node-a11y-button pipeline-node-a11y-button--group"
                aria-label={`Show tasks in ${groupAriaLabel}`}
                aria-expanded={popoverOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setPopoverOpen((open) => !open);
                }}
                data-testid={`pipeline-group-button-${groupLabel}`}
              />
            </Popover>
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
