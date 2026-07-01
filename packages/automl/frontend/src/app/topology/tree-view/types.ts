import type { NodeModel, EdgeModel } from '@patternfly/react-topology';
import type { PipelineNodeModelExpanded } from '~/app/types/topology';
import type { TreeNodeData } from './TreeNode';

export type TreeNodeModel = NodeModel & {
  data: TreeNodeData;
};

export type PipelineViewMode = 'running' | 'statuses';
export type PipelineStatusFilter = 'loading' | 'in-progress' | 'completed' | 'error';

// Input pipeline data structure (from backend or mock)
export type PipelineModelData = {
  id: string;
  name: string;
};

export type PipelineVisualizationData = {
  models: PipelineModelData[];
  selectedModel?: string;
  runState?: 'running' | 'completed' | 'failed';
  viewMode?: PipelineViewMode;
  statusFilter?: PipelineStatusFilter;
  /** Nodes from buildStageMapTopology — tree renders these 1:1 when present. */
  stageMapNodes?: PipelineNodeModelExpanded[];
};

// Output types for the topology
export type TreeTopologyData = {
  nodes: TreeNodeModel[];
  edges: EdgeModel[];
};
