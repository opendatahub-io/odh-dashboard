import * as React from 'react';
import {
  Graph,
  GRAPH_LAYOUT_END_EVENT,
  Layout,
  PipelineDagreGroupsLayout,
  Visualization,
} from '@patternfly/react-topology';
import pipelineElementFactory from '@patternfly/react-topology/dist/esm/pipelines/elements/pipelineElementFactory';
import { pipelineComponentFactory } from './factories';
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
    visualizationController.addEventListener(GRAPH_LAYOUT_END_EVENT, () => {
      visualizationController.getGraph().fit(75);
    });

    setController(visualizationController);
  }, [graphId]);

  return controller;
};

export default useTopologyController;
