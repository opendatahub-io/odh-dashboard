import * as React from 'react';
import {
  GRAPH_LAYOUT_END_EVENT,
  Visualization,
  ComponentFactory,
} from '@patternfly/react-topology';
import { lineageLayoutFactory } from './factories';

const useLineageController = (
  graphId: string,
  customComponentFactory: ComponentFactory,
): Visualization | null => {
  const [controller, setController] = React.useState<Visualization | null>(null);

  React.useEffect(() => {
    const visualizationController = new Visualization();
    visualizationController.setFitToScreenOnLayout(true);
    visualizationController.registerLayoutFactory(lineageLayoutFactory);
    visualizationController.registerComponentFactory(customComponentFactory);

    visualizationController.fromModel(
      {
        graph: {
          id: graphId,
          type: 'graph',
          x: 0,
          y: 0,
          layout: 'Dagre',
        },
      },
      false,
    );

    visualizationController.addEventListener(GRAPH_LAYOUT_END_EVENT, () => {
      // Use a more aggressive fit operation for better centering
      // Add a small delay to ensure the container has its final dimensions
      setTimeout(() => {
        try {
          visualizationController.getGraph().fit(50);
        } catch (e) {
          console.warn('Failed to fit graph to screen:', e);
        }
      }, 100);
    });

    setController(visualizationController);
  }, [graphId, customComponentFactory]);

  return controller;
};

export default useLineageController;
