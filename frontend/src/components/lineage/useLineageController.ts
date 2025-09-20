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
  const fitTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Add a small delay to ensure the container has its final dimensions
    const onLayoutEnd = () => {
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
      }
      fitTimeoutRef.current = setTimeout(() => {
        try {
          visualizationController.getGraph().fit(50);
        } catch (e) {
          console.warn('Failed to fit graph to screen:', e);
        } finally {
          fitTimeoutRef.current = null;
        }
      }, 100);
    };
    visualizationController.addEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);

    setController(visualizationController);

    // Cleanup: remove listener and clear pending timeout
    return () => {
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
        fitTimeoutRef.current = null;
      }
      visualizationController.removeEventListener(GRAPH_LAYOUT_END_EVENT, onLayoutEnd);
    };
  }, [graphId, customComponentFactory]);

  return controller;
};

export default useLineageController;
