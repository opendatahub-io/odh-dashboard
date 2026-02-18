import React from 'react';
import {
  getEdgesFromNodes,
  PipelineNodeModel,
  TopologyView,
  useVisualizationController,
  VisualizationSurface,
  addSpacerNodes,
} from '@patternfly/react-topology';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
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

    const renderNodes = addSpacerNodes(updateNodes);
    const edges = getEdgesFromNodes(renderNodes);

    try {
      controller.fromModel({ nodes: renderNodes, edges }, true);
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
    }
  }, [controller, nodes]);

  if (error) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Incorrect pipeline definition"
        data-id="error-empty-state"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <TopologyView>
      <VisualizationSurface state={{ selectedIds }} />
    </TopologyView>
  );
};

export default PipelineVisualizationSurface;
