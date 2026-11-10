import type { NodeModel, EdgeModel } from '@patternfly/react-topology';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import type { TreeNodeData } from './TreeNode';

export type TreeNodeModel = NodeModel & {
  data: TreeNodeData;
};

export type PipelineStatusFilter = 'loading' | 'in-progress' | 'completed' | 'error' | 'canceled';

export type PipelineVisualizationData = {
  /** Validated models-record key for the pipeline best model, when available. */
  selectedModel?: string;
  /** Display name for the best model (node label match), when known. */
  winnerModelLabel?: string;
  /** Nodes from buildStageMapTopology — tree renders these 1:1 when present. */
  stageMapNodes?: PipelineNodeModelExpanded[];
  /** Leaderboard ranks keyed by model name/key. */
  modelRanks?: Record<string, number>;
};

// Output types for the topology
export type TreeTopologyData = {
  nodes: TreeNodeModel[];
  edges: EdgeModel[];
};
