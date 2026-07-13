export const agentsCatalogUrl = (): string => '/ai-hub/agents/catalog';

export const getAgentsCatalogDetailsRoute = (agentName: string): string =>
  `${agentsCatalogUrl()}/${encodeURIComponent(agentName)}`;
