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
  /** Nodes from buildStageMapTopology — tree renders these 1:1 when present. */
  stageMapNodes?: PipelineNodeModelExpanded[];
};

// Output types for the topology
export type TreeTopologyData = {
  nodes: TreeNodeModel[];
  edges: EdgeModel[];
};
