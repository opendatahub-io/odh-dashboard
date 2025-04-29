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
  DEFAULT_SPACER_NODE_TYPE,
  DEFAULT_EDGE_TYPE,
  TopologySideBar,
  isEdge,
} from '@patternfly/react-topology';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { NODE_HEIGHT, NODE_WIDTH } from './const';
import './PipelineVisualizationSurface.scss';

type PipelineVisualizationSurfaceProps = {
  nodes: PipelineNodeModel[];
  selectedIds?: string[];
  sidePanel?: React.ReactElement | null;
};

const PipelineVisualizationSurface: React.FC<PipelineVisualizationSurfaceProps> = ({
  nodes,
  selectedIds,
  sidePanel,
}) => {
  const controller = useVisualizationController();
  const [error, setError] = React.useState<Error | null>();

  const selectedNode = React.useMemo(
    () => (selectedIds?.[0] ? controller.getNodeById(selectedIds[0]) || null : null),
    [selectedIds, controller],
  );

  const selections = React.useMemo(() => {
    if (selectedIds?.[0]) {
      const element = controller.getElementById(selectedIds[0]);
      if (element && isEdge(element)) {
        const edge = element;
        const selectedEdges = [edge.getId()];
        const source = edge.getSource();
        const target = edge.getTarget();
        if (source.getType() === DEFAULT_SPACER_NODE_TYPE) {
          const sourceEdges = source.getTargetEdges();
          selectedEdges.push(...sourceEdges.map((e) => e.getId()));
        }
        if (target.getType() === DEFAULT_SPACER_NODE_TYPE) {
          const targetEdges = target.getSourceEdges();
          selectedEdges.push(...targetEdges.map((e) => e.getId()));
        }
        return selectedEdges;
      }
    }
    return selectedIds;
  }, [controller, selectedIds]);

  React.useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | null;
    if (selectedNode) {
      // Use a timeout in order to allow the side panel to be shown and window size recomputed
      resizeTimeout = setTimeout(() => {
        controller.getGraph().panIntoView(selectedNode, { offset: 20, minimumVisible: 100 });
        resizeTimeout = null;
      }, 500);
    }
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [selectedIds, controller, selectedNode]);

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

  const collapseAllCallback = React.useCallback(
    (collapseAll: boolean) => {
      // First, expand/collapse all nodes
      if (collapseAll) {
        controller.getGraph().collapseAll();
      } else {
        controller.getGraph().expandAll();
      }
      // We must recreate the model based on what is visible
      const model = controller.toModel();

      // Get all the non-spacer nodes, mark them all visible again
      const nonSpacerNodes = model.nodes
        ? model.nodes.filter((n) => n.type !== DEFAULT_SPACER_NODE_TYPE)
        : [];
      const visibleNodes = nonSpacerNodes.map((n) => ({
        ...n,
        visible: true,
      }));

      // If collapsing, set the size of the collapsed group nodes
      if (collapseAll) {
        visibleNodes.forEach((node) => {
          const newNode = node;
          if (node.group && node.collapsed) {
            newNode.width = NODE_WIDTH;
            newNode.height = NODE_HEIGHT;
          }
        });
      }
      // Determine the new set of nodes, including the spacer nodes
      const pipelineNodes = addSpacerNodes(visibleNodes);

      // Determine the new edges
      const edges = getEdgesFromNodes(
        pipelineNodes,
        DEFAULT_SPACER_NODE_TYPE,
        DEFAULT_EDGE_TYPE,
        DEFAULT_EDGE_TYPE,
      );

      // Apply the new model and run the layout
      controller.fromModel({ nodes: pipelineNodes, edges }, true);
      controller.getGraph().layout();
      controller.getGraph().fit(80);
    },
    [controller],
  );

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
    <TopologyView
      className={css('pipeline-visualization', !!selectedNode && 'm-is-open')}
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            expandAll: !!collapseAllCallback,
            collapseAll: !!collapseAllCallback,
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
            expandAllCallback: action(() => {
              collapseAllCallback(false);
            }),
            collapseAllCallback: action(() => {
              collapseAllCallback(true);
            }),
            legend: false,
          })}
        />
      }
      sideBarOpen={!!selectedNode}
      sideBarResizable
      sideBar={
        <TopologySideBar data-testid="pipeline-topology-drawer" resizable>
          {sidePanel}
        </TopologySideBar>
      }
    >
      <VisualizationSurface state={{ selectedIds: selections }} />
    </TopologyView>
  );
};

export default PipelineVisualizationSurface;
