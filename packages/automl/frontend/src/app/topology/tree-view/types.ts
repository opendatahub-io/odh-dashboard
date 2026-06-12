import type { NodeModel, EdgeModel } from '@patternfly/react-topology';
import type { TreeNodeData } from './TreeNode';

export type TreeNodeModel = NodeModel & {
  data: TreeNodeData;
};

// Input pipeline data structure (from backend or mock)
export type PipelineModelData = {
  id: string;
  name: string; // e.g., "Random Forest", "XGBoost", "MLP"
};

export type PipelineVisualizationData = {
  // Models/pipelines to visualize
  models: PipelineModelData[];
  // Final selected model (if run is complete)
  selectedModel?: string;
  // Run state for status indicators
  runState?: 'running' | 'completed' | 'failed';
};

// Output types for the topology
export type TreeTopologyData = {
  nodes: TreeNodeModel[];
  edges: EdgeModel[];
};
