import * as React from 'react';
import { Visualization, ComponentFactory } from '@patternfly/react-topology';
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

    setController(visualizationController);

    // Cleanup function to dispose of the controller
    return () => {
      try {
        // Clear the controller reference to help with garbage collection
        setController(null);
      } catch (e) {
        // Silently handle cleanup errors
      }
    };
  }, [graphId, customComponentFactory]);

  return controller;
};

export default useLineageController;
