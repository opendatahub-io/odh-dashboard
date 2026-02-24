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
  PipelineNodeModel,
  TaskGroupPillLabel,
  LabelPosition,
  useHover,
} from '@patternfly/react-topology';
import { BanIcon } from '@patternfly/react-icons';
import { PipelineNodeModelExpanded, StandardTaskNodeData } from '~/app/types/topology';
import { ExecutionStateKF } from '~/app/types/pipeline';
import { NODE_HEIGHT, NODE_WIDTH } from './const';

type PipelinesDefaultGroupProps = {
  element: GraphElement<PipelineNodeModelExpanded>;
} & WithSelectionProps;

type PipelinesDefaultGroupInnerProps = Omit<PipelinesDefaultGroupProps, 'element'> & {
  element: Node<PipelineNodeModel, StandardTaskNodeData>;
};

const DefaultTaskGroupInner: React.FunctionComponent<PipelinesDefaultGroupInnerProps> = observer(
  ({ element, selected, onSelect }) => {
    const [hover, hoverRef] = useHover<SVGGElement>();
    const detailsLevel = element.getGraph().getDetailsLevel();
    const runStatus = element.getData()?.runStatus;
    const state = element.getData()?.pipelineTask.status?.state;

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

    return (
      <g ref={hoverRef}>
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
