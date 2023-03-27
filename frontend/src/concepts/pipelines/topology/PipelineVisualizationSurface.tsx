import React from 'react';
import {
  action,
  createTopologyControlButtons,
  DEFAULT_SPACER_NODE_TYPE,
  defaultControlButtonsOptions,
  getEdgesFromNodes,
  PipelineNodeModel,
  TopologyControlBar,
  TopologyView,
  useVisualizationController,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';

type PipelineVisualizationSurfaceProps = {
  nodes: PipelineNodeModel[];
};

const PipelineVisualizationSurface: React.FC<PipelineVisualizationSurfaceProps> = ({
  nodes: unsafeNodes,
}) => {
  const nodes = useDeepCompareMemoize(unsafeNodes);
  const controller = useVisualizationController();

  React.useEffect(() => {
    const edges = getEdgesFromNodes(
      nodes.filter((n) => !n.group),
      DEFAULT_SPACER_NODE_TYPE,
    );

    controller.fromModel(
      {
        nodes,
        edges,
      },
      true,
    );
    controller.getGraph().layout();
  }, [controller, nodes]);

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInCallback: action(() => {
              controller.getGraph().scaleBy(4 / 3);
            }),
            zoomOutCallback: action(() => {
              controller.getGraph().scaleBy(0.75);
            }),
            fitToScreenCallback: action(() => {
              controller.getGraph().fit(80);
            }),
            resetViewCallback: action(() => {
              controller.getGraph().reset();
              controller.getGraph().layout();
            }),
            legend: false,
          })}
        />
      }
    >
      <VisualizationSurface />
    </TopologyView>
  );
};

export default PipelineVisualizationSurface;
