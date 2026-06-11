/** Frontend types matching the AgentProfile BFF API contract */

export type AgentProfileModelAuth = {
  credentialsRef?: { kind: string; name: string; key: string };
  maasSubscription?: string;
};

export type AgentProfileModel = {
  id: string;
  uri: string;
  sourceType?: string;
  authorization?: AgentProfileModelAuth;
};

export type AgentProfilePromptVariable = {
  text: string;
  type: string;
};

export type AgentProfilePrompt = {
  name: string;
  source: string;
  namespace?: string;
  version?: string;
  variables?: Record<string, AgentProfilePromptVariable>;
};

export type AgentProfileResourceRef = {
  kind: string;
  name: string;
  key: string;
};

export type AgentProfileVectorStoreEntry = {
  storeRef?: AgentProfileResourceRef;
  id?: string;
};

export type AgentProfileVectorStores = {
  stores: AgentProfileVectorStoreEntry[];
  maxNumResults?: number;
};

export type AgentProfileMcpServerRef = {
  kind: string;
  name: string;
  key?: string;
};

export type AgentProfileMcpServer = {
  serverRef: AgentProfileMcpServerRef;
  credentialsRef?: AgentProfileResourceRef;
  allowedTools?: string[];
};

export type AgentProfileGuardrail = {
  provider: string;
  guardrailRef: AgentProfileResourceRef;
};

export type AgentProfileSpec = {
  displayName: string;
  description?: string;
  model: AgentProfileModel;
  prompt?: AgentProfilePrompt;
  temperature?: number;
  stream?: boolean;
  maxOutputTokens?: number;
  vectorStores?: AgentProfileVectorStores;
  mcpServers?: AgentProfileMcpServer[];
  guardrails?: AgentProfileGuardrail[];
};

export type AgentProfileMetadata = {
  name: string;
  resourceVersion: string;
};

export type AgentProfile = {
  apiVersion: string;
  kind: string;
  metadata: AgentProfileMetadata;
  spec: AgentProfileSpec;
};

export type AgentProfileCreateRequest = {
  spec: AgentProfileSpec;
};

export type AgentProfileCreateResponse = {
  name: string;
  profileId: string;
  displayName: string;
  namespace: string;
  resourceVersion: string;
};

export type AgentProfileSummary = {
  name: string;
  profileId: string;
  displayName: string;
  description?: string;
  namespace: string;
  lastModified: string;
};

export type AgentProfileListResponse = {
  profiles: AgentProfileSummary[];
  totalCount: number;
};

export type AgentProfileUpdateRequest = {
  spec: AgentProfileSpec;
  resourceVersion: string;
};

export type AgentProfileUpdateResponse = {
  name: string;
  profileId: string;
  displayName: string;
  namespace: string;
  resourceVersion: string;
};
