import * as React from 'react';
import {
  DEFAULT_WHEN_OFFSET,
  DEFAULT_WHEN_SIZE,
  GraphElement,
  isNode,
  Node,
  NodeModel,
  observer,
  RunStatus,
  ScaleDetailsLevel,
  TaskNode,
  useHover,
  WhenDecorator,
  WithContextMenuProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import {
  AngleDoubleRightIcon,
  BanIcon,
  OutlinedWindowRestoreIcon,
  PendingIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { PipelineNodeModelExpanded, StandardTaskNodeData } from '#~/concepts/topology/types';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import { getExecutionStateLabel, getRunStatusLabel } from '#~/concepts/topology/utils';

type StandardTaskNodeInnerProps = {
  element: Node<NodeModel, StandardTaskNodeData>;
} & WithContextMenuProps &
  WithSelectionProps;

const StandardTaskNodeInner: React.FunctionComponent<StandardTaskNodeInnerProps> = observer(
  ({ element, onSelect, selected, ...rest }) => {
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

    const customStatusIcon = React.useMemo(() => {
      switch (state) {
        case ExecutionStateKF.CANCELED:
          return <BanIcon />;
        case ExecutionStateKF.CANCELING:
          return <SyncAltIcon />;
        case ExecutionStateKF.CACHED:
          return <OutlinedWindowRestoreIcon />;
        case ExecutionStateKF.SKIPPED:
          return <AngleDoubleRightIcon />;
        case ExecutionStateKF.PENDING:
          return <PendingIcon />;
        default:
          return undefined;
      }
    }, [state]);

    const bounds = element.getBounds();
    const statusLabel = getExecutionStateLabel(state) ?? getRunStatusLabel(status);
    const taskName = element.getLabel();
    const ariaLabel = statusLabel ? `${taskName}, ${statusLabel}` : taskName;

    return (
      <g ref={hoverRef}>
        <TaskNode
          element={element}
          onSelect={onSelect}
          selected={selected}
          scaleNode={hover && detailsLevel !== ScaleDetailsLevel.high}
          status={status}
          customStatusIcon={customStatusIcon}
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
        {/* Transparent HTML button overlay for keyboard and screen reader access.
            pointer-events: none lets mouse clicks pass through to the SVG TaskNode below. */}
        <foreignObject x={0} y={0} width={bounds.width} height={bounds.height} overflow="visible">
          <button
            className="pipeline-node-a11y-button"
            aria-label={ariaLabel}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(e);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            data-testid={`pipeline-node-button-${taskName}`}
          />
        </foreignObject>
      </g>
    );
  },
);

type StandardTaskNodeProps = {
  element: GraphElement<PipelineNodeModelExpanded>;
} & WithContextMenuProps &
  WithSelectionProps;

const StandardTaskNode: React.FunctionComponent<StandardTaskNodeProps> = ({ element, ...rest }) => {
  if (!isNode(element)) {
    throw new Error('StandardTaskNode must be used only on Node elements');
  }
  return <StandardTaskNodeInner element={element} {...rest} />;
};

export default observer(StandardTaskNode);
