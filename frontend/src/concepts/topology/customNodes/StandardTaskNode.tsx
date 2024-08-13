import * as React from 'react';
import {
  DEFAULT_WHEN_OFFSET,
  DEFAULT_WHEN_SIZE,
  GraphElement,
  observer,
  RunStatus,
  ScaleDetailsLevel,
  TaskNode,
  useHover,
  WhenDecorator,
  WithContextMenuProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { AngleDoubleRightIcon } from '@patternfly/react-icons';
import { PipelineNodeModelExpanded } from '~/concepts/topology/types';
import { ExecutionStateKF } from '~/concepts/pipelines/kfTypes';

type StandardTaskNodeProps = {
  element: GraphElement<PipelineNodeModelExpanded>;
} & WithContextMenuProps &
  WithSelectionProps;

const StandardTaskNode: React.FunctionComponent<StandardTaskNodeProps> = ({
  element,
  onSelect,
  selected,
  ...rest
}) => {
  const data = element.getData();
  const [hover, hoverRef] = useHover<SVGGElement>();
  const detailsLevel = element.getGraph().getDetailsLevel();

  // Set the cached node status to Succeeded
  const getNodeStatus = () => {
    if (data?.pipelineTask.status?.state === ExecutionStateKF.CACHED) {
      return RunStatus.Succeeded;
    }
    return data?.runStatus;
  };

  const whenDecorator = data?.pipelineTask.whenStatus ? (
    <WhenDecorator
      element={element}
      status={data.pipelineTask.whenStatus}
      leftOffset={DEFAULT_WHEN_OFFSET}
    />
  ) : null;

  return (
    <g ref={hoverRef}>
      <TaskNode
        element={element}
        onSelect={onSelect}
        selected={selected}
        scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
        status={getNodeStatus()}
        customStatusIcon={
          data?.pipelineTask.status?.state === ExecutionStateKF.CACHED ? (
            <AngleDoubleRightIcon />
          ) : undefined
        }
        hideDetailsAtMedium
        hiddenDetailsShownStatuses={[
          RunStatus.Succeeded,
          RunStatus.Cancelled,
          RunStatus.Failed,
          RunStatus.Running,
        ]}
        whenOffset={data?.pipelineTask.whenStatus ? DEFAULT_WHEN_OFFSET : 0}
        whenSize={data?.pipelineTask.whenStatus ? DEFAULT_WHEN_SIZE : 0}
        {...rest}
      >
        {whenDecorator}
      </TaskNode>
    </g>
  );
};

export default observer(StandardTaskNode);
