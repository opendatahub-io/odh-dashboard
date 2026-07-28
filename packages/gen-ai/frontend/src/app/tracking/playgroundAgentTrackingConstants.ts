export const PLAYGROUND_AGENT_EVENTS = {
  TRY_IN_PLAYGROUND_SELECTED: 'Playground Agent Try In Playground Selected',
  LOADED: 'Playground Agent Loaded',
  SAVED: 'Playground Agent Saved',
  REVERTED: 'Playground Agent Reverted',

  SAVE_COPY_SELECTED: 'Playground Agent Save Copy Selected',
  COPY_SAVED: 'Playground Agent Copy Saved',
  LOAD_INTERRUPTED: 'Playground Agent Load Interrupted',
  CONFIGURATION_UNAVAILABLE: 'Playground Agent Configuration Unavailable',
  CHAT_BLOCKED: 'Playground Agent Chat Blocked',
  QUERY_SUBMITTED: 'Playground Query Submitted',

  DETAILS_EDIT_SELECTED: 'Playground Agent Details Edit Selected',
  DETAILS_DELETE_EXECUTED: 'Playground Agent Details Delete Executed',
} as const;

export type TryInPlaygroundSelectedProperties = {
  agentID: string;
};

export type AgentLoadedProperties = {
  agentID: string;
};

export type AgentSavedProperties = {
  agentID: string;
  modifiedProperties?: string[];
};

export type AgentRevertedProperties = {
  agentID: string;
};

export type SaveCopySelectedProperties = {
  agentID: string;
  triggerContext: 'settings_drawer_button' | 'save_modal_fork_button' | 'restriction_nudge_modal';
};

export type CopySavedProperties = {
  originalAgentID: string;
  newAgentID: string;
};

export type LoadInterruptedProperties = {
  agentID: string;
  failureReason: 'dependency_missing' | 'timeout' | 'auth_error' | 'corrupted_config' | 'unknown';
};

export type ConfigurationUnavailableProperties = {
  agentID: string;
  missingComponents: string;
};

export type ChatBlockedProperties = {
  agentID: string;
  blockType: 'input' | 'output';
};

export type QuerySubmittedProperties = {
  hasLoadedAgent: boolean;
  agentSavedState: 'saved' | 'unsaved_changes' | 'temporary_session';
};

export type DetailsEditSelectedProperties = {
  agentID: string;
};

export type DetailsDeleteExecutedProperties = {
  agentID: string;
};
