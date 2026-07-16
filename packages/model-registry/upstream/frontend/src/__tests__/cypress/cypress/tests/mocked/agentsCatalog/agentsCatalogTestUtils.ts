/* eslint-disable camelcase */
import { mockModArchResponse } from 'mod-arch-core';
import {
  mockCatalogLabel,
  mockCatalogSource,
  mockCatalogSourceList,
  mockAgent,
  mockAgentList,
  mockAgentsCatalogFilterOptions,
} from '~/__mocks__';
import type { Agent } from '~/app/agentsCatalogTypes';
import type { CatalogSource } from '~/app/shared/types/catalogTypes';
import { MODEL_CATALOG_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const defaultSources: CatalogSource[] = [
  mockCatalogSource({
    id: 'community-agents-source',
    name: 'Community Agents',
    labels: ['community_agents'],
  }),
  mockCatalogSource({
    id: 'org-agents-source',
    name: 'Organization Agents',
    labels: ['organization_agents'],
  }),
];

type InitInterceptsConfig = {
  sources?: CatalogSource[];
  agentsPerCategory?: number;
  includeFilterOptions?: boolean;
};

export const interceptAgentSources = (sources: CatalogSource[]): void => {
  cy.interceptApi(
    `GET /api/:apiVersion/model_catalog/sources`,
    { path: { apiVersion: MODEL_CATALOG_API_VERSION }, query: { assetType: 'agents' } },
    mockCatalogSourceList({ items: sources }),
  );
};

export const interceptAgentLabels = (): void => {
  cy.intercept(
    {
      method: 'GET',
      url: new RegExp(`/api/${MODEL_CATALOG_API_VERSION}/model_catalog/labels`),
    },
    mockModArchResponse({
      items: [
        mockCatalogLabel({
          name: 'community_agents',
          displayName: 'Community Agents',
          description: 'Community contributed agents.',
        }),
        mockCatalogLabel({
          name: 'organization_agents',
          displayName: 'Organization Agents',
          description: 'Agents provided by your organization.',
        }),
      ],
      size: 2,
      pageSize: 10,
      nextPageToken: '',
    }),
  );
};

export const interceptAgentsByLabel = (
  sources: CatalogSource[],
  agentsPerCategory: number,
): void => {
  sources.forEach((source) => {
    source.labels.forEach((label) => {
      const agents: Agent[] = Array.from({ length: agentsPerCategory }, (_, i) =>
        mockAgent({
          id: `${label}-agent-${i + 1}`,
          name: `${label}-agent-${i + 1}`,
          displayName: `${label} Agent ${i + 1}`,
          source_id: source.id,
        }),
      );

      cy.interceptApi(
        `GET /api/:apiVersion/agent_catalog/agents`,
        {
          path: { apiVersion: MODEL_CATALOG_API_VERSION },
          query: { sourceLabel: label },
        },
        mockAgentList({ items: agents, size: agents.length }),
      );
    });
  });
};

export const interceptAgentFilterOptions = (): void => {
  cy.interceptApi(
    `GET /api/:apiVersion/agent_catalog/agents_filter_options`,
    { path: { apiVersion: MODEL_CATALOG_API_VERSION } },
    mockAgentsCatalogFilterOptions(),
  );
};

export const interceptSingleAgent = (agent: Agent): void => {
  cy.intercept(
    {
      method: 'GET',
      url: new RegExp(
        `/model-registry/api/${MODEL_CATALOG_API_VERSION}/agent_catalog/agents/[^/]+$`,
      ),
    },
    mockModArchResponse(agent),
  ).as('getSingleAgent');
};

export const initAgentsCatalogIntercepts = ({
  sources = defaultSources,
  agentsPerCategory = 0,
  includeFilterOptions = true,
}: InitInterceptsConfig = {}): void => {
  interceptAgentSources(sources);
  interceptAgentLabels();
  interceptAgentsByLabel(sources, agentsPerCategory);

  if (includeFilterOptions) {
    interceptAgentFilterOptions();
  }
};
