export const agentsCatalogUrl = (): string => '/agents-catalog';

export const getAgentsCatalogDetailsRoute = (agentName: string): string =>
  `${agentsCatalogUrl()}/${encodeURIComponent(agentName)}`;
