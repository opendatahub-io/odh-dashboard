/* eslint-disable camelcase */
import type { AAModelResponse, MaaSModel } from '~/app/types';
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
  maasModels?: Partial<MaaSModel>[];
  lsdStatus?: 'Ready' | 'NotReady';
}

export const setupModelsTabIntercepts = (options: ModelsTabTestOptions = {}): void => {
  const namespace = options.namespace ?? 'test-namespace';

  const namespacesData = [
    mockNamespace({ name: namespace, display_name: namespace }),
    ...mockNamespaces().data.filter((ns) => ns.name !== namespace),
  ];
  cy.interceptGenAi('GET /api/v1/namespaces', { data: namespacesData });

  // Combine AI models and MaaS models into single AA models response
  // The frontend now calls /api/v1/aaa/models with sources=namespace,custom_endpoint,maas
  // which returns all model types in one response
  const allModels = [...(options.aiModels || []), ...(options.maasModels || [])];
  cy.interceptGenAi('GET /api/v1/aaa/models', mockAAModels(allModels)).as('aaModels');

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
