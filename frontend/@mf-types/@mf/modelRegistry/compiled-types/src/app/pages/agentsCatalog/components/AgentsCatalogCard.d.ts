import * as React from 'react';
import type { Agent } from '~/app/agentsCatalogTypes';
import type { AgentCatalogDetailsNavigationState } from '~/app/pages/agentsCatalog/tracking';
type AgentsCatalogCardProps = {
    agent: Agent;
    detailsNavigationState?: AgentCatalogDetailsNavigationState;
};
declare const AgentsCatalogCard: React.FC<AgentsCatalogCardProps>;
export default AgentsCatalogCard;
