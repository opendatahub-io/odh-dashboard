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
    try {
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

      controller.fromModel({ nodes: renderNodes, edges }, true);
      setError(null);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      // Log detailed error for diagnostics
      // eslint-disable-next-line no-console
      console.error('Pipeline visualization error:', err);
      setError(err);
      controller.fromModel({ nodes: [], edges: [] }, true);
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
        <EmptyStateBody>Failed to load pipeline visualization</EmptyStateBody>
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
              const graph = controller.getGraph();
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (!graph) {
                return;
              }
              graph.scaleBy(4 / 3);
            }),
            zoomOutCallback: action(() => {
              const graph = controller.getGraph();
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (!graph) {
                return;
              }
              graph.scaleBy(0.75);
            }),
            fitToScreenCallback: action(() => {
              const graph = controller.getGraph();
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (!graph) {
                return;
              }
              graph.fit(80);
            }),
            resetViewCallback: action(() => {
              const graph = controller.getGraph();
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (!graph) {
                return;
              }
              graph.reset();
              graph.layout();
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
