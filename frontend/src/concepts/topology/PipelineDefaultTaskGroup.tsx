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
} from '@patternfly/react-topology';
import { Flex, FlexItem, Popover, Stack, StackItem } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import { PipelineNodeModelExpanded, StandardTaskNodeData } from '#~/concepts/topology/types';
import NodeStatusIcon from '#~/concepts/topology/NodeStatusIcon';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
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
    const [hover, hoverRef] = useHover<SVGGElement>();
    const popoverRef = React.useRef<SVGGElement>(null);
    const detailsLevel = element.getGraph().getDetailsLevel();
    const runStatus = element.getData()?.runStatus;
    const state = element.getData()?.pipelineTask.status?.state;

    const getPopoverTasksList = (items: Node<NodeModel>[]) => (
      <Stack hasGutter>
        {items.slice(0, MAX_TIP_ITEMS).map((item: Node) => (
          <StackItem key={item.getId()}>
            <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem style={{ flex: '0', width: 26 }}>
                <NodeStatusIcon runStatus={item.getData()?.runStatus} />
              </FlexItem>
              <FlexItem style={{ flex: '1', marginLeft: 4 }}>{item.getLabel()}</FlexItem>
            </Flex>
          </StackItem>
        ))}
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

    const groupNode = (
      <DefaultTaskGroup
        element={element}
        collapsible
        recreateLayoutOnCollapseChange
        GroupLabelComponent={(props) => (
          <TaskGroupPillLabel
            {...props}
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
        {element.isCollapsed() ? (
          <Popover
            triggerRef={popoverRef}
            triggerAction="hover"
            aria-label="Hoverable popover"
            headerContent={element.getLabel()}
            bodyContent={getPopoverTasksList(element.getAllNodeChildren())}
          >
            <g ref={popoverRef}>{groupNode}</g>
          </Popover>
        ) : (
          groupNode
        )}
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
