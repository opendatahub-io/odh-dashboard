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
  continueToken?: string;
};

export type AgentServiceEndpoint = {
  name: string;
  url: string;
  port: number;
};

export type AgentCardCapabilities = {
  streaming: boolean;
  pushNotifications: boolean;
  optional: string[];
};

export type AgentCardDetail = {
  name: string;
  description?: string;
  version?: string;
  agentCardUrl?: string;
  externalAgentCardUrl?: string;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  capabilities: AgentCardCapabilities;
};

export type AgentRuntimeDetail = {
  name: string;
  namespace: string;
  description: string;
  runtime: AgentRuntime;
  workloadStatus: string;
  serviceEndpoints: AgentServiceEndpoint[];
  podCount: number;
  agentCard?: AgentCardDetail | null;
};

export type AgentRuntimeEndpointField = {
  id: string;
  label: string;
  description: string;
  url: string;
};
