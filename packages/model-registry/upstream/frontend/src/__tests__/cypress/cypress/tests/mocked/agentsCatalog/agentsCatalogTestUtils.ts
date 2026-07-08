import { mockModArchResponse } from 'mod-arch-core';
import { mockCatalogLabel, mockCatalogSource, mockCatalogSourceList } from '~/__mocks__';
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
};

export const initAgentsCatalogIntercepts = ({
  sources = defaultSources,
}: InitInterceptsConfig = {}): void => {
  cy.interceptApi(
    `GET /api/:apiVersion/model_catalog/sources`,
    { path: { apiVersion: MODEL_CATALOG_API_VERSION }, query: { assetType: 'agents' } },
    mockCatalogSourceList({ items: sources }),
  );

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

  sources.forEach((source) => {
    source.labels.forEach((label) => {
      cy.interceptApi(
        `GET /api/:apiVersion/agent_catalog/agents`,
        {
          path: { apiVersion: MODEL_CATALOG_API_VERSION },
          query: { sourceLabel: label },
        },
        { items: [], size: 0, pageSize: 10, nextPageToken: '' },
      );
    });
  });
};
