import * as React from 'react';
import {
  Graph,
  GRAPH_LAYOUT_END_EVENT,
  Layout,
  pipelineElementFactory,
  PipelineDagreGroupsLayout,
  Visualization,
} from '@patternfly/react-topology';
import { pipelineComponentFactory } from './factories';
import { orderNodesForKeyboard } from './a11yUtils';
import {
  PIPELINE_LAYOUT,
  PIPELINE_NODE_SEPARATION_HORIZONTAL,
  PIPELINE_NODE_SEPARATION_VERTICAL,
} from './const';

const useTopologyController = (graphId: string): Visualization | null => {
  const [controller, setController] = React.useState<Visualization | null>(null);

  React.useEffect(() => {
    const visualizationController = new Visualization();
    visualizationController.setFitToScreenOnLayout(true);
    visualizationController.registerElementFactory(pipelineElementFactory);
    visualizationController.registerComponentFactory(pipelineComponentFactory);
    visualizationController.registerLayoutFactory(
      (type: string, graph: Graph): Layout | undefined =>
        new PipelineDagreGroupsLayout(graph, {
          nodesep: PIPELINE_NODE_SEPARATION_HORIZONTAL,
          ranksep: PIPELINE_NODE_SEPARATION_VERTICAL,
          ignoreGroups: true,
          rankdir: 'TB',
        }),
    );
    visualizationController.fromModel(
      {
        graph: {
          id: graphId,
          type: 'graph',
          x: 25,
          y: 25,
          layout: PIPELINE_LAYOUT,
        },
      },
      false,
    );
    let isActive = true;
    let isInitialLayout = true;
    let orderQueued = false;
    const onGraphLayoutEnd = () => {
      const graph = visualizationController.getGraph();
      if (isInitialLayout) {
        orderNodesForKeyboard(graph);
        return;
      }
      if (orderQueued) {
        return;
      }
      orderQueued = true;
      // Let PatternFly finish its layout-end work before reordering graph children.
      queueMicrotask(() => {
        orderQueued = false;
        if (isActive) {
          orderNodesForKeyboard(graph);
        }
      });
    };
    const onInitialLayoutEnd = () => {
      isInitialLayout = false;
      visualizationController.getGraph().fit(75);
      // After the initial fit, stop auto-fitting on subsequent layouts so that
      // polling-driven node updates (e.g. MLMD status changes every 3 s) do not
      // reset the user's zoom / pan.
      visualizationController.setFitToScreenOnLayout(false);
      visualizationController.removeEventListener(GRAPH_LAYOUT_END_EVENT, onInitialLayoutEnd);
    };
    visualizationController.addEventListener(GRAPH_LAYOUT_END_EVENT, onGraphLayoutEnd);
    visualizationController.addEventListener(GRAPH_LAYOUT_END_EVENT, onInitialLayoutEnd);

    setController(visualizationController);

    return () => {
      visualizationController.removeEventListener(GRAPH_LAYOUT_END_EVENT, onGraphLayoutEnd);
      isActive = false;
      visualizationController.removeEventListener(GRAPH_LAYOUT_END_EVENT, onInitialLayoutEnd);
    };
  }, [graphId]);

  return controller;
};

export default useTopologyController;
