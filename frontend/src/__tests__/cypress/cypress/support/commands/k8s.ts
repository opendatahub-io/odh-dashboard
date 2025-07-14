import type {
  K8sModelCommon,
  K8sResourceCommon,
  K8sResourceListResult,
  K8sStatus,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';
import type {
  GenericStaticResponse,
  RouteHandlerController,
  RouteMatcherOptions,
} from 'cypress/types/net-stubbing';
import type { QueryOptions } from '#~/__tests__/cypress/cypress/utils/k8s';
import {
  getK8sAPIResourceURL,
  getK8sWebSocketResourceURL,
} from '#~/__tests__/cypress/cypress/utils/k8s';

type WsOptions = {
  model: K8sModelCommon;
  named?: boolean; // default = false
  namespaced?: boolean; // default = true
  path?: string;
  queryParams?: { [key: string]: string };
};

type K8sOptions = { model: K8sModelCommon } & QueryOptions & Pick<RouteMatcherOptions, 'times'>;

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Send a web socket K8s resource.
       * By default all the URL will include the namespace but not the name of the provided resource.
       * This results in the default behavior tailored to listing resources.
       */
      wsK8s: <K extends K8sResourceCommon>(
        type: 'ADDED' | 'DELETED' | 'MODIFIED',
        modelOrOptions: K8sModelCommon | WsOptions,
        resource: K,
      ) => Cypress.Chainable<undefined>;

      /**
       * Simplified variant of equivalent function for GET method.
       */
      interceptK8s: (<K extends K8sResourceCommon>(
        modelOrOptions: K8sModelCommon | K8sOptions,
        response:
          | K
          | K8sStatus
          | Patch[]
          | string
          | GenericStaticResponse<string, K | K8sStatus | Patch[] | string>
          | RouteHandlerController,
      ) => Chainable<null>) &
        /**
         * Intercept command for K8s resource.
         * Provides equivalent functionality to `cy.intercept` where the URL is constructed from the given model and options.
         *
         * The default URL will include the name and namespace extracted from the supplied resource.
         * This can be overridden by supplying options.
         *
         * If a payload other than a K8s resource is supplied, ensure that the appropriate options include the resource
         * name and namespace, if required.
         */
        (<K extends K8sResourceCommon>(
          method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT',
          modelOrOptions: K8sModelCommon | K8sOptions,
          response:
            | K
            | K8sStatus
            | Patch[]
            | string
            | GenericStaticResponse<string, K | K8sStatus | Patch[] | string>
            | RouteHandlerController,
        ) => Chainable<null>);

      /**
       * Intercept command for listing K8s resources.
       * Provides equivalent functionality to `cy.intercept` where the URL is constructed from the given model and options.
       *
       * The default URL will include the namespace extracted from the supplied resource list.
       * This can be overridden by supplying options.
       *
       * If a payload other than a list containing at least one K8s resource is supplied, ensure that the appropriate
       * options include the resource name and namespace, if required.
       */
      interceptK8sList: <K extends K8sResourceCommon>(
        modelOrOptions: K8sModelCommon | K8sOptions,
        resource:
          | K8sResourceListResult<K>
          | GenericStaticResponse<string, K8sResourceListResult<K> | K8sStatus>
          | RouteHandlerController,
      ) => Chainable<null>;
    }
  }
}

Cypress.Commands.add('wsK8s', (type, modelOrOptions, resource) => {
  const options: WsOptions = isModel(modelOrOptions) ? { model: modelOrOptions } : modelOrOptions;
  const { model, named = false, namespaced = true, path, queryParams } = options;
  cy.wsSend(
    getK8sWebSocketResourceURL(model, {
      name: named ? resource.metadata?.name : undefined,
      ns: namespaced ? resource.metadata?.namespace : undefined,
      path,
      queryParams,
    }),
    {
      type,
      object: resource,
    },
  );
});

Cypress.Commands.add('interceptK8s', (...args) => {
  const method = typeof args[0] === 'string' ? args[0] : 'GET';
  const modelOrOptions = typeof args[0] === 'string' ? args[1] : args[0];
  const response = typeof args[0] === 'string' ? args[2] : args[1];
  const k8sResource = isK8sResource(response)
    ? response
    : isGenericStaticResponse(response) && isK8sResource(response.body)
    ? response.body
    : undefined;
  let routeMatcher: RouteMatcherOptions;
  if (isModel(modelOrOptions)) {
    routeMatcher = {
      method,
      pathname: getK8sAPIResourceURL(modelOrOptions, k8sResource, undefined, method === 'POST'),
    };
  } else {
    const { model, times, ...queryOptions } = modelOrOptions;
    const { queryParams, ...baseQueryOptions } = queryOptions;
    routeMatcher = {
      method,
      pathname: getK8sAPIResourceURL(
        model,
        k8sResource?.kind === 'Status' ? undefined : k8sResource,
        baseQueryOptions,
        method === 'POST',
      ),
      query: queryParams,
    };
    if (times) {
      routeMatcher.times = times;
    }
  }
  return cy.intercept(routeMatcher, response);
});

Cypress.Commands.add('interceptK8sList', (modelOrOptions, response) => {
  let routeMatcher: RouteMatcherOptions;

  // get the default namespace
  const k8sResource = isK8sResourceList(response)
    ? response.items[0]
    : isGenericStaticResponse(response) && isK8sResourceList(response.body)
    ? response.body.items[0]
    : undefined;
  const ns = k8sResource?.metadata?.namespace;

  if (isModel(modelOrOptions)) {
    routeMatcher = {
      method: 'GET',
      pathname: getK8sAPIResourceURL(modelOrOptions, undefined, {
        ns,
      }),
    };
  } else {
    const { model, times, ...queryOptions } = modelOrOptions;
    const { queryParams, ...baseQueryOptions } = queryOptions;
    routeMatcher = {
      method: 'GET',
      pathname: getK8sAPIResourceURL(model, undefined, { ns, ...baseQueryOptions }),
      query: queryParams,
    };
    if (times) {
      routeMatcher.times = times;
    }
  }
  return cy.intercept(routeMatcher, response);
});

const isModel = (model: unknown): model is K8sModelCommon => !!(model as K8sModelCommon).kind;

const isK8sResource = (resource: unknown): resource is K8sResourceCommon =>
  !!(resource as K8sResourceCommon).kind;

const isK8sResourceList = (
  resource: unknown,
): resource is K8sResourceListResult<K8sResourceCommon> =>
  !!(resource as K8sResourceListResult<K8sResourceCommon>).items;

const isGenericStaticResponse = <K extends K8sResourceCommon>(
  response: unknown,
): response is GenericStaticResponse<string, K> =>
  !!(response as GenericStaticResponse<string, K>).body;
