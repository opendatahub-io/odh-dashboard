export const agentsCatalogUrl = (): string => '/ai-hub/agents/catalog';

export const getAgentsCatalogDetailsRoute = (agentId: string): string =>
  `${agentsCatalogUrl()}/${encodeURIComponent(agentId)}`;
