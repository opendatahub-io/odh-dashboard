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

type AgentProfileMcpServerBase = {
  allowedTools?: string[];
};

export type AgentProfileConfigMapMcpServer = AgentProfileMcpServerBase & {
  serverRef: AgentProfileMcpServerRef;
  credentialsRef?: AgentProfileResourceRef;
};

export type AgentProfileRegistryMcpServer = AgentProfileMcpServerBase & {
  name: string;
  source: 'mlflow';
  version?: string;
};

export type AgentProfileMcpServer = AgentProfileConfigMapMcpServer | AgentProfileRegistryMcpServer;

export type AgentProfileGuardrail = {
  provider: string;
  guardrailRef: AgentProfileResourceRef;
};

export type AgentProfileAsr = {
  /** ASR (transcription) model reference. Same schema as AgentProfileModel. */
  model?: AgentProfileModel;
};

export type AgentProfileSpec = {
  displayName: string;
  description?: string;
  model: AgentProfileModel;
  asr?: AgentProfileAsr;
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

export type AgentDeploymentState = 'ready' | 'creating' | 'failed';

export type AgentDeploymentCreateRequest = {
  name: string;
  agentProfileId: string;
  mcpServerAuth?: Record<string, string>;
};

export type AgentDeploymentCreateResponse = {
  llamaStackConfigMapName: string;
  wrapperAppConfigMapName: string;
  sandboxName: string;
  namespace: string;
  routeUrl: string;
  agentProfileId: string;
};

export type AgentDeploymentSummary = {
  name: string;
  displayName?: string;
  namespace: string;
  agentProfileId: string;
  routeUrl?: string;
  createdAt: string;
  state: AgentDeploymentState;
  lastError?: string;
  /** Present only when the deployment detail endpoint can reach the Sandbox. */
  config?: AgentProfile;
};

export type AgentDeploymentListResponse = {
  deployments: AgentDeploymentSummary[];
  totalCount: number;
};
