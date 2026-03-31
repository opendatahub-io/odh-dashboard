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

export type McpDeploymentAddress = {
  url: string;
};

export type McpDeployment = {
  name: string;
  displayName?: string;
  namespace: string;
  uid: string;
  creationTimestamp: string;
  image: string;
  port: number;
  yaml?: string;
  phase: McpDeploymentPhase;
  conditions?: McpDeploymentCondition[];
  address?: McpDeploymentAddress;
};

export type McpDeploymentList = {
  items: McpDeployment[];
  nextPageToken?: string;
  pageSize: number;
  size: number;
};

export type McpDeploymentCreateRequest = {
  name?: string;
  displayName?: string;
  image: string;
  port?: number;
  yaml?: string;
};

export type McpDeploymentUpdateRequest = {
  displayName?: string;
  image?: string;
  port?: number;
  yaml?: string;
};
