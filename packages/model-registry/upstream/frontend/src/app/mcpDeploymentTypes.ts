export enum McpDeploymentPhase {
  PENDING = 'Pending',
  RUNNING = 'Running',
  FAILED = 'Failed',
}

export type McpDeploymentCondition = {
  type: string;
  status: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
};

export type McpDeployment = {
  name: string;
  namespace: string;
  creationTimestamp: string;
  image: string;
  port: number;
  phase: McpDeploymentPhase;
  conditions?: McpDeploymentCondition[];
};

export type McpDeploymentList = {
  items: McpDeployment[];
  nextPageToken?: string;
  pageSize: number;
  size: number;
};
