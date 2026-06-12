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
