import React from 'react';
import {
  DEFAULT_SPACER_NODE_TYPE,
  getEdgesFromNodes,
  PipelineNodeModel,
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
    <TopologyView>
      <VisualizationSurface />
    </TopologyView>
  );
};

export default PipelineVisualizationSurface;
