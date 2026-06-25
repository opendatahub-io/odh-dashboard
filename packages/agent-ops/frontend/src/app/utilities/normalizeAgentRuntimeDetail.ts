import {
  AgentCardCapabilities,
  AgentCardDetail,
  AgentCardProvider,
  AgentRuntime,
  AgentRuntimeDetail,
  AgentServiceEndpoint,
} from '~/app/types/agentRuntimes';

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeProvider = (value: unknown): AgentCardProvider | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const provider = value as Record<string, unknown>;
  const organization = asString(provider.organization);
  const url = asString(provider.url);

  if (!organization && !url) {
    return undefined;
  }

  return { organization, url };
};

const normalizeCapabilities = (value: unknown): AgentCardCapabilities => {
  if (!value || typeof value !== 'object') {
    return { streaming: false, pushNotifications: false, optional: [] };
  }

  const capabilities = value as Record<string, unknown>;
  return {
    streaming: capabilities.streaming === true,
    pushNotifications: capabilities.pushNotifications === true,
    optional: asStringArray(capabilities.optional),
  };
};

const normalizeAgentCard = (value: unknown): AgentCardDetail | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const card = value as Record<string, unknown>;
  const name = asString(card.name);
  if (!name) {
    return undefined;
  }

  return {
    name,
    description: asString(card.description),
    version: asString(card.version),
    provider: normalizeProvider(card.provider),
    agentCardUrl: asString(card.agentCardUrl),
    externalAgentCardUrl: asString(card.externalAgentCardUrl),
    documentationUrl: asString(card.documentationUrl),
    defaultInputModes: asStringArray(card.defaultInputModes),
    defaultOutputModes: asStringArray(card.defaultOutputModes),
    authenticationMethods: asStringArray(card.authenticationMethods),
    protocols: asStringArray(card.protocols),
    labels: asStringArray(card.labels),
    uuid: asString(card.uuid),
    spiffeId: asString(card.spiffeId),
    capabilities: normalizeCapabilities(card.capabilities),
  };
};

const normalizeRuntime = (value: unknown): AgentRuntime | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const runtime = value as Record<string, unknown>;
  const name = asString(runtime.name);
  const namespace = asString(runtime.namespace);
  const status = asString(runtime.status);

  if (!name || !namespace || !status) {
    return undefined;
  }

  return {
    name,
    namespace,
    status,
    type: asString(runtime.type) ?? '',
    endpointUrl: asString(runtime.endpointUrl) ?? '',
    lastSyncTime: asString(runtime.lastSyncTime) ?? '',
  };
};

const normalizeServiceEndpoints = (value: unknown): AgentServiceEndpoint[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): AgentServiceEndpoint | undefined => {
      if (!item || typeof item !== 'object') {
        return undefined;
      }

      const endpoint = item as Record<string, unknown>;
      const name = asString(endpoint.name);
      const url = asString(endpoint.url);
      const port = typeof endpoint.port === 'number' ? endpoint.port : undefined;

      if (!name || !url || port == null) {
        return undefined;
      }

      return { name, url, port };
    })
    .filter((item): item is AgentServiceEndpoint => item !== undefined);
};

export const normalizeAgentRuntimeDetail = (value: unknown): AgentRuntimeDetail | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const detail = value as Record<string, unknown>;
  const name = asString(detail.name);
  const namespace = asString(detail.namespace);
  const runtime = normalizeRuntime(detail.runtime);

  if (!name || !namespace || !runtime) {
    return undefined;
  }

  const agentCardRaw = detail.agentCard;
  const agentCard =
    agentCardRaw == null ? null : (normalizeAgentCard(agentCardRaw) ?? null);

  return {
    name,
    namespace,
    description: asString(detail.description) ?? '',
    runtime,
    workloadStatus: asString(detail.workloadStatus) ?? runtime.status,
    serviceEndpoints: normalizeServiceEndpoints(detail.serviceEndpoints),
    podCount: typeof detail.podCount === 'number' ? detail.podCount : 0,
    agentCard,
  };
};
