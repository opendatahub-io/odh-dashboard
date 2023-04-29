import { PipelineNodeModel, RunStatus, WhenStatus } from '@patternfly/react-topology';

export type NodeConstructDetails = {
  id: string;
  label: string;
  runAfter?: string[];
  status?: RunStatus;
};

export type StandardTaskNodeData = {
  status: RunStatus;
  whenStatus?: WhenStatus;
};

export type PipelineNodeModelExpanded = PipelineNodeModel & {
  data?: StandardTaskNodeData;
};
