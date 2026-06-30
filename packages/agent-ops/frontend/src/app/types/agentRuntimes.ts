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

export type AgentCardProvider = {
  organization?: string;
  url?: string;
};

export type AgentCardSkillParameter = {
  name: string;
  type?: string;
  description?: string;
  required: boolean;
  default?: string;
};

export type AgentCardSkill = {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  examples: string[];
  inputModes: string[];
  outputModes: string[];
  parameters: AgentCardSkillParameter[];
};

export type AgentCardDetail = {
  name: string;
  description?: string;
  version?: string;
  provider?: AgentCardProvider;
  agentCardUrl?: string;
  externalAgentCardUrl?: string;
  documentationUrl?: string;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  authenticationMethods?: string[];
  protocols?: string[];
  labels?: string[];
  skills?: AgentCardSkill[];
  toolConnections?: string[];
  linkedSkills?: string[];
  iconUrl?: string;
  uuid?: string;
  spiffeId?: string;
  lastFetchTime?: string;
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
