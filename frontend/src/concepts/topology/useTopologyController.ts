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

const useTopologyController = (graphId: string) => {
  const [controller, setController] = React.useState<Visualization | null>(null);

  React.useEffect(() => {
    const controller = new Visualization();
    controller.setFitToScreenOnLayout(true);
    controller.registerComponentFactory(pipelineComponentFactory);
    controller.registerLayoutFactory(
      (type: string, graph: Graph): Layout | undefined =>
        new PipelineDagreLayout(graph, {
          nodesep: PIPELINE_NODE_SEPARATION_VERTICAL,
          ranksep: NODE_SEPARATION_HORIZONTAL,
          ignoreGroups: true,
        }),
    );
    controller.fromModel(
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
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, () => {
      controller.getGraph().fit(75);
    });

    setController(controller);
  }, [graphId]);

  return controller;
};

export default useTopologyController;
