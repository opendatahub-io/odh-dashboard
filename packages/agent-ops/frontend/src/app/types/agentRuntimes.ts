export type AgentRuntime = {
  name: string;
  namespace: string;
  status: string;
  type: string;
  endpointUrl: string;
  lastSyncTime: string;
};

export type AgentRuntimesList = {
  runtimes: AgentRuntime[];
};

export type AgentServiceEndpoint = {
  name: string;
  url: string;
  port: number;
};

export type AgentRuntimeCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime: string;
};

export type AgentRuntimeDetail = {
  name: string;
  namespace: string;
  description: string;
  runtime: AgentRuntime;
  workloadStatus: string;
  serviceEndpoints: AgentServiceEndpoint[];
  podCount: number;
  conditions: AgentRuntimeCondition[];
};
