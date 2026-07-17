import { AgentCardDetail } from '~/app/types/agentRuntimes';

export const hasEnrichedAgentCard = (agentCard?: AgentCardDetail | null): boolean => {
  if (!agentCard) {
    return false;
  }

  return Boolean(
    agentCard.skills?.length ||
    agentCard.version?.trim() ||
    agentCard.externalAgentCardUrl?.trim() ||
    agentCard.provider?.organization?.trim() ||
    agentCard.provider?.url?.trim() ||
    agentCard.documentationUrl?.trim() ||
    agentCard.uuid?.trim() ||
    agentCard.spiffeId?.trim() ||
    agentCard.authenticationMethods?.length ||
    (agentCard.protocols?.length &&
      agentCard.protocols.some((protocol) => protocol.trim().toUpperCase() !== 'HTTP')),
  );
};
