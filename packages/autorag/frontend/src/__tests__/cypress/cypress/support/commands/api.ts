/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import type { GenericStaticResponse, RouteHandlerController } from 'cypress/types/net-stubbing';
import type { Namespace, UserSettings } from 'mod-arch-core';
import { mockModArchResponse } from 'mod-arch-core';
import type { RoleBindingKind } from '../../../shared/types';

const MODEL_REGISTRY_API_VERSION = 'v1';
export { MODEL_REGISTRY_API_VERSION };

type SuccessErrorResponse = {
  success: boolean;
  error?: string;
};

type ApiResponse<V = SuccessErrorResponse> =
  | V
  | GenericStaticResponse<string, V>
  | RouteHandlerController;

type Replacement<R extends string = string> = Record<R, string | undefined>;
type Query<Q extends string = string> = Record<Q, string>;

type Options = { path?: Replacement; query?: Query; times?: number } | null;

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      interceptApi: ((
        type: 'GET /api/:apiVersion/user',
        options: { path: { apiVersion: string } },
        response: ApiResponse<UserSettings>,
      ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/:apiVersion/namespaces',
          options: { path: { apiVersion: string } },
          response: ApiResponse<Namespace[]>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/:apiVersion/settings/role_bindings',
          options: { path: { apiVersion: string } },
          response: ApiResponse<RoleBindingKind[]>,
        ) => Cypress.Chainable<null>);
    }
  }
}

Cypress.Commands.add(
  'interceptApi',
  (type: string, ...args: [Options | null, ApiResponse<unknown>] | [ApiResponse<unknown>]) => {
    if (!type) {
      throw new Error('Invalid type parameter.');
    }
    const options = args.length === 2 ? args[0] : null;
    const response = (args.length === 2 ? args[1] : args[0]) ?? '';

    const pathParts = type.match(/:[a-z][a-zA-Z0-9-_]+/g);
    const [method, staticPathname] = type.split(' ');
    let pathname = staticPathname;
    if (pathParts?.length) {
      if (!options || !options.path) {
        throw new Error(`${type}: missing path replacements`);
      }
      const { path: pathReplacements } = options;
      pathParts.forEach((p) => {
        const part = p.substring(1);
        const replacement = pathReplacements[part];
        if (!replacement) {
          throw new Error(`${type} missing path replacement: ${part}`);
        }
        pathname = pathname.replace(new RegExp(`:${part}\\b`), replacement);
      });
    }
    return cy.intercept(
      {
        method,
        pathname: `/mod-arch/${pathname}`,
        query: options?.query,
        ...(options?.times && { times: options.times }),
      },
      mockModArchResponse(response),
    );
  },
);
