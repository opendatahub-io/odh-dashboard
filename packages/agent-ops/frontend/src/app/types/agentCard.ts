/**
 * Future AgentCard fields (blocked on BFF / OpenAPI):
 * - AgentSkill.tags → AgentDeploymentSkillCard (label group under description)
 * - AgentSkill.examples → AgentDeploymentSkillCard (examples list under description)
 * - AgentCapabilities.stateTransitionHistory → getEnabledOptionalCapabilities + optional capability labels
 * - AgentCard.toolConnections → AgentDeploymentCapabilitiesCard ("Tool connections" section)
 */
export enum AgentOptionalCapability {
  Streaming = 'Streaming',
  PushNotifications = 'Push notifications',
}

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
