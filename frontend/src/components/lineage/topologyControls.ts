import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
} from '@patternfly/react-topology';
import type { TopologyControlButton, Visualization } from '@patternfly/react-topology';

export const createLineageTopologyControls = (
  controller: Visualization,
): TopologyControlButton[] => {
  return createTopologyControlButtons({
    ...defaultControlButtonsOptions,
    zoomInTip: 'Zoom in to see more detail',
    zoomOutTip: 'Zoom out for better overview',
    fitToScreenTip: 'Fit entire lineage graph to screen',
    resetViewTip: 'Reset zoom and center the graph',
    zoomInCallback: action(() => {
      controller.getGraph().scaleBy(4 / 3);
    }),
    zoomOutCallback: action(() => {
      controller.getGraph().scaleBy(0.75);
    }),
    fitToScreenCallback: action(() => {
      controller.getGraph().fit(50);
    }),
    resetViewCallback: action(() => {
      controller.getGraph().reset();
      controller.getGraph().layout();
    }),
    legend: false,
  });
};
