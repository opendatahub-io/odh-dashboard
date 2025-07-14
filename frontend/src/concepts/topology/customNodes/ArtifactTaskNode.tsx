import React from 'react';
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
  isNode,
} from '@patternfly/react-topology';
import { ListIcon, MonitoringIcon } from '@patternfly/react-icons';
import { TaskNodeProps } from '@patternfly/react-topology/dist/esm/pipelines/components/nodes/TaskNode';
import { css } from '@patternfly/react-styles';
import { StandardTaskNodeData } from '#~/concepts/topology/types';
import { isMetricsArtifactType } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';

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
        className={
          data?.runStatus
            ? css(
                'pf-topology-pipelines__pill-status',
                selected && 'pf-m-selected',
                runStatusModifier,
              )
            : undefined
        }
        transform={`translate(${(bounds.width - iconSize) / 2}, ${ICON_PADDING})`}
        color={
          // Need insight from product dev as to how to view this component to test the colors
          selected
            ? 'var(--pf-t--global--icon--color--inverse)'
            : 'var(--pf-t--global--icon--color--subtle)'
        }
      >
        {isMetricsArtifactType(data?.artifactType) ? (
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
    const [isHover, hoverRef] = useHover<SVGGElement>();
    const detailsLevel = element.getGraph().getDetailsLevel();
    const data = element.getData();
    const scale = element.getGraph().getScale();
    const iconSize = 16;
    const iconPadding = 4;

    const whenDecorator = data?.pipelineTask.whenStatus ? (
      <WhenDecorator
        element={element}
        status={data.pipelineTask.whenStatus}
        leftOffset={DEFAULT_WHEN_OFFSET}
      />
    ) : null;
    const upScale = 1 / scale;

    const translateX = bounds.width / 2 - (iconSize / 2) * upScale;
    const translateY = iconPadding * upScale;
    return (
      <g className={css('pf-topology__pipelines__task-node')} ref={hoverRef}>
        {isHover || detailsLevel !== ScaleDetailsLevel.high ? (
          <g>
            <TaskNode
              nameLabelClass="artifact-node-label"
              hideDetailsAtMedium
              customStatusIcon={
                isMetricsArtifactType(data?.artifactType) ? <MonitoringIcon /> : <ListIcon />
              }
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
            {!isHover ? (
              <g transform={`translate(${translateX}, ${translateY}) scale(${upScale})`}>
                <g
                  color={
                    // Need insight from product dev as to how to view this component to test the colors
                    selected
                      ? 'var(--pf-t--global--icon--color--inverse)'
                      : 'var(--pf-t--global--icon--color--subtle)'
                  }
                >
                  {isMetricsArtifactType(data?.artifactType) ? <MonitoringIcon /> : <ListIcon />}
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

const ArtifactTaskNode: React.FC<ArtifactTaskNodeProps> = ({ element, ...rest }) => {
  if (!isNode(element)) {
    throw new Error('Element is not Node');
  }
  return <ArtifactTaskNodeInner element={element} {...rest} />;
};

export default ArtifactTaskNode;
