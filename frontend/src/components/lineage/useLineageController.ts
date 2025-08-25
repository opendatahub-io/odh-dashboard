import * as React from 'react';
import { GRAPH_LAYOUT_END_EVENT, Visualization } from '@patternfly/react-topology';
import { baselineLayoutFactory, baselineComponentFactory } from './Lineage';

const useLineageController = (graphId: string): Visualization | null => {
  const [controller, setController] = React.useState<Visualization | null>(null);

  React.useEffect(() => {
    const visualizationController = new Visualization();
    visualizationController.setFitToScreenOnLayout(true);
    visualizationController.registerLayoutFactory(baselineLayoutFactory);
    visualizationController.registerComponentFactory(baselineComponentFactory);

    // Start with empty model like Pipeline topology does
    visualizationController.fromModel(
      {
        graph: {
          id: graphId,
          type: 'graph',
          x: 25,
          y: 25,
          layout: 'Dagre',
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

export default useLineageController;
