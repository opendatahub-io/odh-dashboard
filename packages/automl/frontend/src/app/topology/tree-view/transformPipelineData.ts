import type { PipelineVisualizationData, TreeTopologyData } from './types';
import { transformStageMapNodesToTree } from './transformStageMapNodesToTree';

export const transformPipelineData = (data: PipelineVisualizationData): TreeTopologyData => {
  const { stageMapNodes } = data;

  if (stageMapNodes && stageMapNodes.length > 0) {
    return transformStageMapNodesToTree(stageMapNodes);
  }

  return { nodes: [], edges: [] };
};
