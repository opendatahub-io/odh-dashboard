import React from 'react';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DEFAULT_EDGE_TYPE,
  DEFAULT_SPACER_NODE_TYPE,
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
import { PIPELINE_TOPOLOGY_FIT_PADDING } from './const';

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
  const prevWidthsRef = React.useRef<string>('');
  const userInteractedRef = React.useRef(false);

  React.useEffect(() => {
    const graph = controller.getGraph();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- graph may not be initialized yet
    if (!graph) {
      return undefined;
    }
    const onInteraction = () => {
      userInteractedRef.current = true;
    };
    graph.getController().addEventListener('pan', onInteraction);
    graph.getController().addEventListener('zoom', onInteraction);
    return () => {
      graph.getController().removeEventListener('pan', onInteraction);
      graph.getController().removeEventListener('zoom', onInteraction);
    };
  }, [controller]);

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
      const edges = getEdgesFromNodes(renderNodes, DEFAULT_SPACER_NODE_TYPE, DEFAULT_EDGE_TYPE);

      const widthKey = nodes.map((n) => `${n.id}:${n.width}`).join(',');
      const needsRelayout = prevWidthsRef.current !== '' && prevWidthsRef.current !== widthKey;
      prevWidthsRef.current = widthKey;

      const graph = controller.getGraph();
      controller.fromModel({ nodes: renderNodes, edges }, true);

      if (needsRelayout) {
        graph.layout();
        if (!userInteractedRef.current) {
          graph.fit(PIPELINE_TOPOLOGY_FIT_PADDING);
        } else {
          // User has panned/zoomed — preserve their viewport
        }
      }

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
              graph.fit(PIPELINE_TOPOLOGY_FIT_PADDING);
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
