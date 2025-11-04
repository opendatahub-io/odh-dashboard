import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { mcpServersTab } from '~/__tests__/cypress/cypress/pages/mcpServersTab';
import { playground } from '~/__tests__/cypress/cypress/pages/playground';
import { TokenAuthModal } from '~/__tests__/cypress/cypress/pages/components/Modal';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Enable Gen-AI feature flag and navigate to home
       */
      enableGenAiFeature: () => Cypress.Chainable<void>;

      /**
       * Get authentication token from oc whoami -t
       */
      getAuthToken: () => Cypress.Chainable<string | null>;

      /**
       * Make an authenticated API request
       */
      apiRequest: (
        url: string,
        options?: Partial<Cypress.RequestOptions>,
      ) => Cypress.Chainable<Cypress.Response<unknown>>;

      /**
       * Select an MCP server by name in the AI Assets page
       */
      selectMCPServer: (serverName: string) => Cypress.Chainable<void>;

      /**
       * Authenticate an MCP server with a token
       */
      authenticateMCPServer: (serverName: string, token: string) => Cypress.Chainable<void>;

      /**
       * Intercept Gen AI BFF API requests in mocked mode
       * Similar to cy.interceptOdh but for Gen AI endpoints
       *
       * @example
       * cy.interceptGenAi('GET /api/v1/namespaces', mockNamespaces);
       * cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace: 'test' } }, mockServers);
       */
      interceptGenAi: (
        type: string,
        ...args: [GenAiOptions | null, GenAiResponse<unknown>] | [GenAiResponse<unknown>]
      ) => Cypress.Chainable<null>;
    }
  }
}

interface GenAiOptions {
  path?: Record<string, string>;
  query?: Record<string, string>;
  times?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenAiResponse<T> = T | ((req: any) => T);

Cypress.Commands.add('enableGenAiFeature', () => {
  appChrome.visit(['genAiStudio']);
});

Cypress.Commands.add('getAuthToken', () => {
  if (Cypress.env('MOCK')) {
    return cy.wrap(null as string | null);
  }

  return cy.exec('oc whoami -t', { failOnNonZeroExit: false, log: false }).then((result) => {
    if (result.code === 0 && result.stdout) {
      const token = result.stdout.trim();
      cy.log('Auth token loaded for API requests');
      return cy.wrap(token as string | null);
    }
    cy.log('No auth token found');
    return cy.wrap(null as string | null);
  });
});

Cypress.Commands.add('apiRequest', (url: string, options = {}) => {
  const authToken = Cypress.env('AUTH_TOKEN');
  const requestOptions: Partial<Cypress.RequestOptions> = {
    ...options,
    url,
    failOnStatusCode: false,
    headers: authToken
      ? {
          ...options.headers,
          Authorization: `Bearer ${authToken}`,
        }
      : options.headers,
  };

  return cy.request(requestOptions);
});

Cypress.Commands.add('selectMCPServer', (serverName: string) => {
  const serverRow = mcpServersTab.findServerRow(serverName);
  serverRow.waitForStatusLoad();
  serverRow.selectServer();
});

Cypress.Commands.add('authenticateMCPServer', (serverName: string, token: string) => {
  const serverRow = playground.getServerRow(serverName);
  serverRow.clickConfigure();

  const tokenModal = new TokenAuthModal();
  tokenModal.shouldBeOpen();
  tokenModal.enterToken(token);
  tokenModal.submit();
  tokenModal.waitForClose();

  serverRow.verifyAuthenticated();
});

Cypress.Commands.add(
  'interceptGenAi',
  (
    type: string,
    ...args: [GenAiOptions | null, GenAiResponse<unknown>] | [GenAiResponse<unknown>]
  ) => {
    if (!type) {
      throw new Error('Invalid type parameter.');
    }
    const options = args.length === 2 ? args[0] : null;
    const response = (args.length === 2 ? args[1] : args[0]) ?? '';

    const [method, pathname] = type.split(' ');
    const fullPathname = `/gen-ai${pathname}`;

    return cy.intercept(
      {
        method,
        pathname: fullPathname,
        query: options?.query,
        ...(options?.times && { times: options.times }),
      },
      response,
    );
  },
);
