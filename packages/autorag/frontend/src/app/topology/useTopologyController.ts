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
  const rankSepRef = React.useRef(horizontalRankSep);
  const visualizationRef = React.useRef<Visualization | null>(null);

  rankSepRef.current = horizontalRankSep;

  React.useEffect(() => {
    const visualizationController = new Visualization();
    visualizationRef.current = visualizationController;
    visualizationController.setFitToScreenOnLayout(true);
    visualizationController.registerElementFactory(pipelineElementFactory);
    visualizationController.registerComponentFactory(pipelineComponentFactory);
    // Layout factory reads `rankSepRef` when layout runs so `horizontalRankSep` can change without rebuilding Visualization.
    visualizationController.registerLayoutFactory(
      (type: string, graph: Graph): Layout | undefined =>
        new PipelineDagreGroupsLayout(graph, {
          nodesep: PIPELINE_NODE_SEPARATION_VERTICAL,
          ranksep: rankSepRef.current,
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
      visualizationRef.current = null;
    };
  }, [graphId]);

  React.useEffect(() => {
    const viz = visualizationRef.current;
    if (!viz) {
      return;
    }
    viz.getGraph().layout();
  }, [horizontalRankSep]);

  return controller;
};

export default useTopologyController;
