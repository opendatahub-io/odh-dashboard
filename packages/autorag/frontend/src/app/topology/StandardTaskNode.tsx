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
import { PipelineNodeModelExpanded } from '~/app/types/topology';
import { ExecutionStateKF } from '~/app/types/pipeline';

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
  const state = data?.pipelineTask.status?.state;

  const status = React.useMemo(() => {
    switch (state) {
      case ExecutionStateKF.CACHED:
        return RunStatus.Succeeded;
      case ExecutionStateKF.RUNNING:
        return RunStatus.InProgress;
      default:
        return data?.runStatus;
    }
  }, [state, data?.runStatus]);

  return (
    <g ref={hoverRef}>
      <TaskNode
        element={element}
        onSelect={onSelect}
        selected={selected}
        scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
        status={status}
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
        {data?.pipelineTask.whenStatus && (
          <WhenDecorator
            element={element}
            status={data.pipelineTask.whenStatus}
            leftOffset={DEFAULT_WHEN_OFFSET}
          />
        )}
      </TaskNode>
    </g>
  );
};

export default observer(StandardTaskNode);
