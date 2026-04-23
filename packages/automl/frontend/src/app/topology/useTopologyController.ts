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
import { PIPELINE_LAYOUT, PIPELINE_NODE_SEPARATION_VERTICAL } from './const';

const useTopologyController = (
  graphId: string,
  horizontalRankSep: number,
): Visualization | null => {
  const [controller, setController] = React.useState<Visualization | null>(null);

  React.useEffect(() => {
    const visualizationController = new Visualization();
    visualizationController.setFitToScreenOnLayout(true);
    visualizationController.registerElementFactory(pipelineElementFactory);
    visualizationController.registerComponentFactory(pipelineComponentFactory);
    visualizationController.registerLayoutFactory(
      (type: string, graph: Graph): Layout | undefined =>
        new PipelineDagreGroupsLayout(graph, {
          nodesep: PIPELINE_NODE_SEPARATION_VERTICAL,
          ranksep: horizontalRankSep,
          rankdir: 'LR',
          // Steadier horizontal distribution than default `tight-tree` for simple linear pipelines
          ranker: 'network-simplex',
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
    const onLayoutEnd = () => {
      requestAnimationFrame(() => {
        visualizationController.getGraph().fit(75);
      });
    };
    visualizationController.addEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);

    setController(visualizationController);

    return () => {
      visualizationController.removeEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    };
  }, [graphId, horizontalRankSep]);

  return controller;
};

export default useTopologyController;
