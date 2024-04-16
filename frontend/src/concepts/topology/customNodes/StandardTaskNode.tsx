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

type StandardTaskNodeProps = {
  element: GraphElement;
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

  const whenDecorator = data?.whenStatus ? (
    <WhenDecorator element={element} status={data.whenStatus} leftOffset={DEFAULT_WHEN_OFFSET} />
  ) : null;

  return (
    <g ref={hoverRef as React.LegacyRef<SVGGElement>}>
      <TaskNode
        element={element}
        onSelect={onSelect}
        selected={selected}
        scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
        status={data?.status}
        hideDetailsAtMedium
        hiddenDetailsShownStatuses={[
          RunStatus.Succeeded,
          RunStatus.Cancelled,
          RunStatus.Failed,
          RunStatus.Running,
        ]}
        whenOffset={data?.whenStatus ? DEFAULT_WHEN_OFFSET : 0}
        whenSize={data?.whenStatus ? DEFAULT_WHEN_SIZE : 0}
        {...rest}
      >
        {whenDecorator}
      </TaskNode>
    </g>
  );
};

export default observer(StandardTaskNode);
