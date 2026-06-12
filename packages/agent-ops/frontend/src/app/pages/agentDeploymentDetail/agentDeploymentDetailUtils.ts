import { AgentCapabilities, AgentOptionalCapability } from '~/app/types/agentCard';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';

export const getAgentEndpointUrl = (detail: AgentRuntimeDetail): string =>
  detail.runtime.endpointUrl?.trim() ||
  detail.serviceEndpoints?.[0]?.url?.trim() ||
  '—';

export const getAgentCardUrl = (detail: AgentRuntimeDetail): string => {
  const endpointUrl = getAgentEndpointUrl(detail);
  if (endpointUrl === '—') {
    return '—';
  }
  const baseUrl = endpointUrl.startsWith('http') ? endpointUrl : `https://${endpointUrl}`;
  return `${baseUrl.replace(/\/$/, '')}/.well-known/agent-card.json`;
};

export const getAgentSpiffeId = (detail: AgentRuntimeDetail): string =>
  `spiffe://cluster.local/ns/${detail.namespace}/sa/${detail.name}`;

export const getEnabledOptionalCapabilities = (
  capabilities?: AgentCapabilities,
): AgentOptionalCapability[] =>
  [
    capabilities?.streaming && AgentOptionalCapability.Streaming,
    capabilities?.pushNotifications && AgentOptionalCapability.PushNotifications,
  ].filter((capability): capability is AgentOptionalCapability => Boolean(capability));

export const getAgentOptionalCapabilityTestId = (
  capability: AgentOptionalCapability,
): string => `agent-optional-capability-${capability.toLowerCase().replace(/\s+/g, '-')}`;
