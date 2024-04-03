import React, { LegacyRef } from 'react';
import {
  TaskNode,
  DEFAULT_WHEN_OFFSET,
  Node,
  WhenDecorator,
  NodeModel,
  WithSelectionProps,
  observer,
  useAnchor,
  AnchorEnd,
  getRunStatusModifier,
  ScaleDetailsLevel,
  useHover,
  TaskNodeSourceAnchor,
  TaskNodeTargetAnchor,
  GraphElement,
} from '@patternfly/react-topology';
import { ListIcon, MonitoringIcon } from '@patternfly/react-icons';
import { TaskNodeProps } from '@patternfly/react-topology/dist/esm/pipelines/components/nodes/TaskNode';
import { css } from '@patternfly/react-styles';
import { StandardTaskNodeData } from '~/concepts/topology/types';

const ICON_PADDING = 8;

type IconTaskNodeProps = {
  element: Node<NodeModel, StandardTaskNodeData>;
} & WithSelectionProps;

const IconTaskNode: React.FC<IconTaskNodeProps> = observer(({ element, selected, onSelect }) => {
  const data = element.getData();
  const bounds = element.getBounds();
  const iconSize = bounds.height - ICON_PADDING * 2;

  const runStatusModifier = data?.runStatus && getRunStatusModifier(data.runStatus);

  useAnchor(
    React.useCallback(
      (node: Node) => new TaskNodeSourceAnchor(node, ScaleDetailsLevel.high, 0, true),
      [],
    ),
    AnchorEnd.source,
  );
  useAnchor(
    React.useCallback(
      (node: Node) => new TaskNodeTargetAnchor(node, 0, ScaleDetailsLevel.high, 0, true),
      [],
    ),
    AnchorEnd.target,
  );

  return (
    <g
      className={css(
        'pf-topology-pipelines__pill',
        runStatusModifier,
        selected && 'pf-m-selected',
        onSelect && 'pf-m-selectable',
      )}
      onClick={onSelect}
    >
      <rect
        className="pf-topology-pipelines__pill-background"
        x={0}
        y={0}
        width={bounds.width}
        height={bounds.height}
        rx={bounds.height / 2}
      />
      <g
        transform={`translate(${(bounds.width - iconSize) / 2}, ${ICON_PADDING})`}
        color={
          selected
            ? 'var(--pf-v5-global--icon--Color--dark--light)'
            : 'var(--pf-v5-global--icon--Color--light)'
        }
      >
        {data?.artifactType === 'system.Metrics' ? (
          <MonitoringIcon width={iconSize} height={iconSize} />
        ) : (
          <ListIcon width={iconSize} height={iconSize} />
        )}
      </g>
    </g>
  );
});

type ArtifactTaskNodeInnerProps = WithSelectionProps & {
  element: Node<NodeModel, StandardTaskNodeData>;
} & Omit<TaskNodeProps, 'element'> & { element: Node };

const ArtifactTaskNodeInner: React.FC<ArtifactTaskNodeInnerProps> = observer(
  ({ element, selected, onSelect, ...rest }) => {
    const bounds = element.getBounds();
    const [isHover, hoverRef] = useHover();
    const detailsLevel = element.getGraph().getDetailsLevel();
    const data = element.getData();
    const scale = element.getGraph().getScale();
    const iconSize = 24;
    const whenDecorator = data?.pipelineTask.whenStatus ? (
      <WhenDecorator
        element={element}
        status={data.pipelineTask.whenStatus}
        leftOffset={DEFAULT_WHEN_OFFSET}
      />
    ) : null;
    const upScale = 1 / scale;

    return (
      <g
        className={css('pf-topology__pipelines__task-node')}
        ref={hoverRef as LegacyRef<SVGGElement>}
      >
        {isHover || detailsLevel !== ScaleDetailsLevel.high ? (
          <g>
            <TaskNode
              nameLabelClass="artifact-node-label"
              hideDetailsAtMedium
              truncateLength={30}
              element={element}
              hover
              selected={selected}
              onSelect={onSelect}
              hiddenDetailsShownStatuses={[]}
              status={data?.runStatus}
              scaleNode={isHover}
              {...rest}
            >
              {whenDecorator}
            </TaskNode>
            {!isHover && detailsLevel !== ScaleDetailsLevel.high ? (
              <g
                transform={`translate(0, ${
                  (bounds.height - iconSize * upScale) / 2
                }) scale(${upScale})`}
              >
                <g transform="translate(4, 4)">
                  <g
                    color={
                      selected
                        ? 'var(--pf-v5-global--icon--Color--dark--light)'
                        : 'var(--pf-v5-global--icon--Color--light)'
                    }
                  >
                    {data?.artifactType === 'system.Metrics' ? <MonitoringIcon /> : <ListIcon />}
                  </g>
                </g>
              </g>
            ) : null}
          </g>
        ) : (
          <IconTaskNode selected={selected} onSelect={onSelect} element={element} />
        )}
      </g>
    );
  },
);

type ArtifactTaskNodeProps = {
  element: GraphElement;
} & WithSelectionProps;

const ArtifactTaskNode: React.FC<ArtifactTaskNodeProps> = ({ element, ...rest }) => (
  <ArtifactTaskNodeInner element={element as Node} {...rest} />
);

export default ArtifactTaskNode;
