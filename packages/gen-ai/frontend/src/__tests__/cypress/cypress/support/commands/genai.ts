interface GenAiOptions {
  path?: Record<string, string>;
  query?: Record<string, string>;
  times?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenAiResponse<T> = T | ((req: any) => T);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
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
      ) => Chainable<null>;
    }
  }
}

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

export {};
