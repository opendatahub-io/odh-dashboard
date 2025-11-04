/* eslint-disable @typescript-eslint/no-namespace */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Load test configuration from test-variables.yml
       */
      getTestConfig: () => Cypress.Chainable<TestConfig>;
    }
  }
}

export interface TestConfig {
  TEST_USER: {
    USERNAME: string;
    PASSWORD: string;
    AUTH_TYPE: string;
  };
  CLUSTER: {
    SERVER: string;
    NAMESPACE: string;
  };
  MCP_SERVERS: {
    PREFERRED_SERVER: string;
    GITHUB_TOKEN: string;
  };
  DASHBOARD: {
    BASE_URL: string;
    FEATURE_FLAGS: string[];
  };
  SERVICES: {
    DASHBOARD_PORT: number;
    GENAI_REMOTE_PORT: number;
    GENAI_BFF_PORT: number;
  };
  TEST_DATA: Record<string, unknown>;
}

Cypress.Commands.add('getTestConfig', () => {
  // Load test-variables.yml using the readJSON task (which handles both JSON and YAML)
  return cy.task('readJSON', 'test-variables.yml').then((config) => {
    return config as TestConfig;
  });
});

export {};
