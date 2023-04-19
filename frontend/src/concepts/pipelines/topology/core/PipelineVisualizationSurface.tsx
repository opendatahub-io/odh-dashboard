import React from 'react';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  getEdgesFromNodes,
  PipelineNodeModel,
  TopologyControlBar,
  TopologyView,
  useVisualizationController,
  VisualizationSurface,
  getSpacerNodes,
} from '@patternfly/react-topology';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';

type PipelineVisualizationSurfaceProps = {
  nodes: PipelineNodeModel[];
  selectedIds?: string[];
};

const PipelineVisualizationSurface: React.FC<PipelineVisualizationSurfaceProps> = ({
  nodes: unsafeNodes,
  selectedIds,
}) => {
  const nodes = useDeepCompareMemoize(unsafeNodes);
  const controller = useVisualizationController();

  React.useEffect(() => {
    // PF Bug
    // TODO: Pipeline Topology weirdly doesn't set a width and height on spacer nodes -- but they do when using finally spacer nodes
    const spacerNodes = getSpacerNodes(nodes).map((s) => ({ ...s, width: 1, height: 1 }));
    const renderNodes = [...spacerNodes, ...nodes];
    const edges = getEdgesFromNodes(renderNodes);

    controller.fromModel(
      {
        nodes: renderNodes,
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
      <VisualizationSurface state={{ selectedIds }} />
    </TopologyView>
  );
};

export default PipelineVisualizationSurface;
