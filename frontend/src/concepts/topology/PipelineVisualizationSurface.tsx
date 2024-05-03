import React from 'react';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  getEdgesFromNodes,
  PipelineNodeModel,
  TopologyControlBar,
  TopologyView,
  useVisualizationController,
  VisualizationSurface,
  getSpacerNodes,
} from '@patternfly/react-topology';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

type PipelineVisualizationSurfaceProps = {
  nodes: PipelineNodeModel[];
  selectedIds?: string[];
};

const PipelineVisualizationSurface: React.FC<PipelineVisualizationSurfaceProps> = ({
  nodes,
  selectedIds,
}) => {
  const controller = useVisualizationController();
  const [error, setError] = React.useState<Error | null>();
  React.useEffect(() => {
    const currentModel = controller.toModel();
    const updateNodes = nodes.map((node) => {
      const currentNode = currentModel.nodes?.find((n) => n.id === node.id);
      if (currentNode) {
        return { ...node, collapsed: currentNode.collapsed };
      }
      return node;
    });

    const spacerNodes = getSpacerNodes(updateNodes);

    // find the parent of each spacer node
    spacerNodes.forEach((spacerNode) => {
      const nodeIds = spacerNode.id.split('|');
      if (nodeIds[0]) {
        const parent = updateNodes.find((n) => n.children?.includes(nodeIds[0]));
        if (parent) {
          parent.children?.push(spacerNode.id);
        }
      }
    });

    // Dagre likes the root nodes to be first in the order
    const renderNodes = [...spacerNodes, ...updateNodes].sort(
      (a, b) => (a.runAfterTasks?.length ?? 0) - (b.runAfterTasks?.length ?? 0),
    );

    // TODO: We can have a weird edge issue if the node is off by a few pixels vertically from the center
    const edges = getEdgesFromNodes(renderNodes);

    try {
      controller.fromModel(
        {
          nodes: renderNodes,
          edges,
        },
        true,
      );
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        // eslint-disable-next-line no-console
        console.error('Unknown error occurred rendering Pipeline Graph', e);
      }
    }
  }, [controller, nodes]);
  if (error) {
    return (
      <EmptyState data-id="error-empty-state">
        <EmptyStateHeader
          titleText="Incorrect pipeline definition"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInCallback: action(() => {
              controller.getGraph().scaleBy(4 / 3);
            }),
            zoomOutCallback: action(() => {
              controller.getGraph().scaleBy(0.75);
            }),
            fitToScreenCallback: action(() => {
              controller.getGraph().fit(80);
            }),
            resetViewCallback: action(() => {
              controller.getGraph().reset();
              controller.getGraph().layout();
            }),
            legend: false,
          })}
        />
      }
    >
      <VisualizationSurface state={{ selectedIds }} />
    </TopologyView>
  );
};

export default PipelineVisualizationSurface;
