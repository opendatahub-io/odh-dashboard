export type AgentSkill = {
  id: string;
  name: string;
  description: string;
};

export type AgentCapabilities = {
  streaming: boolean;
  pushNotifications: boolean;
};

export type AgentProvider = {
  name: string;
  displayName?: string;
  url?: string;
};

export type AgentCard = {
  name: string;
  namespace: string;
  description: string;
  version: string;
  skills: AgentSkill[];
  capabilities: AgentCapabilities;
  provider: AgentProvider;
  supportedInputModes: string[];
  supportedOutputModes: string[];
};
