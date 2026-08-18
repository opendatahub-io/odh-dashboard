import type { BranchExpandOptions } from './branchExpand';
import type { PipelineVisualizationData, TreeTopologyData } from './types';
import { transformStageMapNodesToTree } from './transformStageMapNodesToTree';

const EMPTY_TREE_TOPOLOGY: TreeTopologyData = { nodes: [], edges: [] };

export type TransformPipelineResult =
  | { status: 'ok'; topology: TreeTopologyData }
  | { status: 'empty'; topology: TreeTopologyData }
  | { status: 'error'; error: unknown };

export type TransformPipelineOptions = {
  patternsExpanded?: boolean;
  /** Succeeded run with a known best pattern. */
  winnerResolved?: boolean;
};

export const buildBranchExpandOptions = (
  data: PipelineVisualizationData,
  options?: TransformPipelineOptions,
): BranchExpandOptions => ({
  patternsExpanded: options?.patternsExpanded ?? false,
  winnerResolved: options?.winnerResolved === true && !!data.selectedPattern,
  winnerPatternLabel: data.winnerPatternLabel,
  winnerPatternKey: data.selectedPattern,
});

export const transformPipelineData = (
  data: PipelineVisualizationData,
  options?: TransformPipelineOptions,
): TransformPipelineResult => {
  const { stageMapNodes } = data;

  if (!stageMapNodes || stageMapNodes.length === 0) {
    return { status: 'empty', topology: EMPTY_TREE_TOPOLOGY };
  }

  try {
    return {
      status: 'ok',
      topology: transformStageMapNodesToTree(
        stageMapNodes,
        buildBranchExpandOptions(data, options),
      ),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to transform pipeline topology for tree view:', error);
    return { status: 'error', error };
  }
};

/** Topology for rendering; empty only for missing input or after an upstream fallback. */
export const getTreeTopologyFromResult = (result: TransformPipelineResult): TreeTopologyData => {
  if (result.status === 'error') {
    return EMPTY_TREE_TOPOLOGY;
  }
  return result.topology;
};
