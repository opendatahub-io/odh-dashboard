/* eslint-disable camelcase */
import type { AAModelResponse, MaaSModel } from '~/app/types';
import {
  mockNamespace,
  mockNamespaces,
  mockAAModels,
  mockMaaSModels,
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
  maasError?: boolean;
  lsdStatus?: 'Ready' | 'NotReady';
}

export const setupModelsTabIntercepts = (options: ModelsTabTestOptions = {}): void => {
  const namespace = options.namespace ?? 'test-namespace';

  const namespacesData = [
    mockNamespace({ name: namespace, display_name: namespace }),
    ...mockNamespaces().data.filter((ns) => ns.name !== namespace),
  ];
  cy.interceptGenAi('GET /api/v1/namespaces', { data: namespacesData });

  cy.interceptGenAi('GET /api/v1/aaa/models', mockAAModels(options.aiModels)).as('aaModels');

  if (options.maasError) {
    cy.interceptGenAi('GET /api/v1/maas/models', {
      statusCode: 500,
      body: { error: 'MaaS service unavailable' },
    }).as('maasModels');
  } else {
    cy.interceptGenAi(
      'GET /api/v1/maas/models',
      options.maasModels ? mockMaaSModels(options.maasModels) : mockEmptyList(),
    ).as('maasModels');
  }

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
