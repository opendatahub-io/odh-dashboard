import yaml from 'js-yaml';
import { mockNamespaces, mockEmptyList, mockStatus } from '~/__tests__/cypress/cypress/__mocks__';

// Declare custom Cypress command types for this helper file
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

export interface MCPTestConfig {
  defaultNamespace: string;
  servers: {
    github: { name: string; url: string };
    filesystem: { name: string };
  };
  tokens: {
    valid: string;
    invalid: string;
    test: string;
  };
}

export const setupBaseMCPServerMocks = (
  config: MCPTestConfig,
  options: { lsdStatus: 'Ready' | 'NotReady'; includeLsdModel?: boolean } = {
    lsdStatus: 'NotReady',
    includeLsdModel: false,
  },
): void => {
  cy.interceptGenAi('GET /api/v1/namespaces', mockNamespaces());

  cy.interceptGenAi(
    'GET /api/v1/aaa/models',
    { query: { namespace: config.defaultNamespace } },
    mockEmptyList(),
  );

  cy.interceptGenAi(
    'GET /api/v1/lsd/status',
    { query: { namespace: config.defaultNamespace } },
    mockStatus(options.lsdStatus),
  );

  if (options.includeLsdModel) {
    cy.interceptGenAi(
      'GET /api/v1/lsd/models',
      { query: { namespace: config.defaultNamespace } },
      {
        data: [
          {
            id: 'meta-llama/Llama-3.2-3B-Instruct',
            // eslint-disable-next-line camelcase
            provider_model_id: 'meta-llama/Llama-3.2-3B-Instruct',
            // eslint-disable-next-line camelcase
            provider_id: 'meta-llama',
            // eslint-disable-next-line camelcase
            model_type: 'llm',
            metadata: {},
          },
        ],
      },
    );
  } else {
    cy.interceptGenAi(
      'GET /api/v1/lsd/models',
      { query: { namespace: config.defaultNamespace } },
      mockEmptyList(),
    );
  }

  cy.interceptGenAi(
    'GET /api/v1/maas/models',
    { query: { namespace: config.defaultNamespace } },
    mockEmptyList(),
  );
};

export const loadMCPTestConfig = (): Cypress.Chainable<MCPTestConfig> => {
  return cy.fixture('e2e/mcpServers/mcpTestConfig.yaml').then((yamlString) => {
    return yaml.load(yamlString as string) as MCPTestConfig;
  });
};
