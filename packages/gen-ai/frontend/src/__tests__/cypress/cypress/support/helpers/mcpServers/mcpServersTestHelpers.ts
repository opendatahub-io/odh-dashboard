import yaml from 'js-yaml';
import {
  mockNamespaces,
  mockNamespace,
  mockEmptyList,
  mockStatus,
  mockMCPServers,
  mockMCPServer,
  mockMCPStatusInterceptor,
  mockMCPToolsInterceptor,
  mockMCPStatusError,
  mockMCPStatusAutoConnect,
  mockMCPToolsAutoConnect,
} from '~/__tests__/cypress/cypress/__mocks__';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { playgroundPage } from '~/__tests__/cypress/cypress/pages/playgroundPage';
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';

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
    github: {
      name: string;
      url: string;
    };
    kubernetes: {
      name: string;
      url: string;
    };
  };
  tokens: {
    valid: string;
    invalid: string;
    test: string;
  };
}

export const setupBaseMCPServerMocks = (
  config: MCPTestConfig,
  options: { lsdStatus: 'Ready' | 'NotReady'; includeLsdModel?: boolean; namespace?: string } = {
    lsdStatus: 'NotReady',
    includeLsdModel: false,
  },
): void => {
  const namespace = options.namespace ?? config.defaultNamespace;

  // If a custom namespace is provided, include it in the namespaces list
  const namespacesData =
    options.namespace && options.namespace !== config.defaultNamespace
      ? [
          // eslint-disable-next-line camelcase
          mockNamespace({ name: options.namespace, display_name: options.namespace }),
          ...mockNamespaces().data,
        ]
      : mockNamespaces().data;

  cy.interceptGenAi('GET /api/v1/namespaces', { data: namespacesData });

  cy.interceptGenAi('GET /api/v1/aaa/models', { query: { namespace } }, mockEmptyList());

  cy.interceptGenAi(
    'GET /api/v1/lsd/status',
    { query: { namespace } },
    mockStatus(options.lsdStatus),
  );

  if (options.includeLsdModel) {
    cy.interceptGenAi(
      'GET /api/v1/lsd/models',
      { query: { namespace } },
      {
        data: [
          {
            id: 'meta-llama/Llama-3.2-3B-Instruct',
            providerModelId: 'meta-llama/Llama-3.2-3B-Instruct',
            providerId: 'meta-llama',
            modelType: 'llm',
            metadata: {},
          },
        ],
      },
    );
  } else {
    cy.interceptGenAi('GET /api/v1/lsd/models', { query: { namespace } }, mockEmptyList());
  }

  cy.interceptGenAi('GET /api/v1/maas/models', { query: { namespace } }, mockEmptyList());
};

export const loadMCPTestConfig = (): Cypress.Chainable<MCPTestConfig> => {
  return cy.fixture('mocked/mcpServers/mcpTestConfig.yaml').then((yamlString) => {
    return yaml.load(yamlString as string) as MCPTestConfig;
  });
};

type InitInterceptsOptions = {
  config: MCPTestConfig;
  namespace: string;
  serverName: string;
  serverUrl?: string;
  serverStatus?: string;
  servers?: Array<{ name: string; status: string }>;
  withStatusInterceptor?: { token: string; serverUrl: string };
  withToolsInterceptor?: { token: string; serverUrl: string };
  withStatusError?: { errorType: '400' | '401'; serverUrl: string };
};

export const initIntercepts = ({
  config,
  namespace,
  serverName,
  serverUrl,
  serverStatus = 'Token required',
  servers,
  withStatusInterceptor,
  withToolsInterceptor,
  withStatusError,
}: InitInterceptsOptions): void => {
  setupBaseMCPServerMocks(config, { lsdStatus: 'Ready', includeLsdModel: true });
  const mcpServers = servers
    ? servers.map((s) => mockMCPServer(s))
    : [
        mockMCPServer({
          name: serverName,
          status: serverStatus,
          ...(serverUrl && { url: serverUrl }),
        }),
      ];

  cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers(mcpServers));

  if (withStatusError) {
    mockMCPStatusError(withStatusError.errorType, withStatusError.serverUrl);
  } else if (withStatusInterceptor) {
    mockMCPStatusInterceptor(withStatusInterceptor.token, withStatusInterceptor.serverUrl);
  } else if (serverUrl) {
    mockMCPStatusError('401', serverUrl);
  }

  if (withToolsInterceptor) {
    mockMCPToolsInterceptor(withToolsInterceptor.token, withToolsInterceptor.serverUrl);
  }
};

export const navigateToPlayground = (namespace: string): void => {
  cy.step('Navigate to Playground');
  appChrome.visit();
  playgroundPage.visit(namespace);
  playgroundPage.verifyOnPlaygroundPage(namespace);
  playgroundPage.mcpPanel.expandMCPPanelIfNeeded();
  playgroundPage.mcpPanel.verifyMCPPanelVisible();
};

/**
 * Initialize intercepts for auto-connectable MCP server (no token required)
 * Used for testing auto-unlock feature from AI Assets navigation
 */
export const initAutoConnectIntercepts = ({
  config,
  namespace,
  serverName,
  serverUrl,
}: {
  config: MCPTestConfig;
  namespace: string;
  serverName: string;
  serverUrl: string;
}): void => {
  setupBaseMCPServerMocks(config, { lsdStatus: 'Ready', includeLsdModel: true });

  // Mock the MCP servers list to include the auto-connectable server
  const mcpServers = [
    mockMCPServer({
      name: serverName,
      status: 'Active',
      url: serverUrl,
    }),
  ];

  cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers(mcpServers));

  // Mock auto-connect status and tools
  mockMCPStatusAutoConnect(serverUrl);
  mockMCPToolsAutoConnect(serverUrl);
};

/**
 * Navigate from AI Assets MCP tab to Playground with server selection
 */
export const navigateFromAIAssetsToPlayground = (namespace: string): void => {
  cy.step('Navigate to AI Assets page');
  appChrome.visit();
  aiAssetsPage.visit(namespace);

  cy.step('Switch to MCP Servers tab');
  aiAssetsPage.switchToMCPServersTab();
};
