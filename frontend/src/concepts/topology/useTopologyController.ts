import * as React from 'react';
import {
  Graph,
  GRAPH_LAYOUT_END_EVENT,
  Layout,
  NODE_SEPARATION_HORIZONTAL,
  PipelineDagreLayout,
  Visualization,
} from '@patternfly/react-topology';
import { pipelineComponentFactory } from '~/concepts/topology/factories';
import { PIPELINE_LAYOUT, PIPELINE_NODE_SEPARATION_VERTICAL } from './const';

const useTopologyController = (graphId: string): Visualization | null => {
  const [controller, setController] = React.useState<Visualization | null>(null);

  React.useEffect(() => {
    const visualizationController = new Visualization();
    visualizationController.setFitToScreenOnLayout(true);
    visualizationController.registerComponentFactory(pipelineComponentFactory);
    visualizationController.registerLayoutFactory(
      (type: string, graph: Graph): Layout | undefined =>
        new PipelineDagreLayout(graph, {
          nodesep: PIPELINE_NODE_SEPARATION_VERTICAL,
          ranksep: NODE_SEPARATION_HORIZONTAL,
          ignoreGroups: true,
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
    visualizationController.addEventListener(GRAPH_LAYOUT_END_EVENT, () => {
      visualizationController.getGraph().fit(75);
    });

    setController(visualizationController);
  }, [graphId]);

  return controller;
};

export default useTopologyController;
