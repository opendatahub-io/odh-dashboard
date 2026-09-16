/* eslint-disable camelcase */
import type { AAModelResponse } from '~/app/types';
import {
  mockNamespace,
  mockNamespaces,
  mockAAModels,
  mockEmptyList,
  mockStatus,
} from '~/__tests__/cypress/cypress/__mocks__';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      interceptGenAi: (
        type: string,
        ...args: [{ query?: Record<string, string> } | null, unknown] | [unknown]
      ) => Cypress.Chainable<null>;
    }
  }
}

export interface ModelsTabTestOptions {
  namespace?: string;
  aiModels?: Partial<AAModelResponse>[];
  maasModels?: Partial<AAModelResponse>[];
  lsdStatus?: 'Ready' | 'NotReady';
}

export const setupModelsTabIntercepts = (options: ModelsTabTestOptions = {}): void => {
  const namespace = options.namespace ?? 'test-namespace';

  const namespacesData = [
    mockNamespace({ name: namespace, display_name: namespace }),
    ...mockNamespaces().data.filter((ns) => ns.name !== namespace),
  ];
  cy.interceptGenAi('GET /api/v1/namespaces', { data: namespacesData });

  // Route handler that filters models by `sources` query param, matching real BFF behavior.
  // When sources includes 'maas', return all models; otherwise return only non-MaaS models.
  const aiModels = options.aiModels || [];
  const maasModels = options.maasModels || [];
  const allModels = [...aiModels, ...maasModels];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cy.interceptGenAi('GET /api/v1/aaa/models', (req: any) => {
    const url = new URL(req.url, 'http://localhost');
    const sources = url.searchParams.get('sources') ?? '';
    req.reply(sources.includes('maas') ? mockAAModels(allModels) : mockAAModels(aiModels));
  }).as('aaModels');

  cy.interceptGenAi('GET /api/v1/lsd/status', mockStatus(options.lsdStatus ?? 'Ready'));

  cy.interceptGenAi('GET /api/v1/lsd/models', mockEmptyList());

  cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } });
};

export const setupTokenIntercept = (
  response:
    | { data: { key: string; expiresAt: string } }
    | { statusCode: number; body: unknown }
    | { delay: number; body: unknown },
): void => {
  cy.interceptGenAi('POST /api/v1/maas/tokens', response);
};
