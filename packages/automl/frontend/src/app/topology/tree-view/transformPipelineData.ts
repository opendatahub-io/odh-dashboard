import type { PipelineVisualizationData, TreeTopologyData } from './types';
import { transformStageMapNodesToTree } from './transformStageMapNodesToTree';

const EMPTY_TREE_TOPOLOGY: TreeTopologyData = { nodes: [], edges: [] };

export const transformPipelineData = (data: PipelineVisualizationData): TreeTopologyData => {
  const { stageMapNodes } = data;

  if (!stageMapNodes || stageMapNodes.length === 0) {
    return EMPTY_TREE_TOPOLOGY;
  }

  try {
    return transformStageMapNodesToTree(stageMapNodes);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to transform pipeline topology for tree view:', error);
    return EMPTY_TREE_TOPOLOGY;
  }
};
