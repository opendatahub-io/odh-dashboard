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
import { PipelineNodeModelExpanded } from '~/concepts/topology/types';

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
  const [hover, hoverRef] = useHover();
  const detailsLevel = element.getGraph().getDetailsLevel();

  const whenDecorator = data?.pipelineTask.whenStatus ? (
    <WhenDecorator
      element={element}
      status={data.pipelineTask.whenStatus}
      leftOffset={DEFAULT_WHEN_OFFSET}
    />
  ) : null;

  return (
    <g ref={hoverRef as React.LegacyRef<SVGGElement>}>
      <TaskNode
        element={element}
        onSelect={onSelect}
        selected={selected}
        scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
        status={data?.runStatus}
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
