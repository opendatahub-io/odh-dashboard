import { mergeRequestInit } from '~/api/apiMergeUtils';
import { K8sAPIOptions } from '~/k8sTypes';
import { EitherNotBoth } from '~/typeHelpers';

type CallProxyJSONOptions = {
  queryParams?: Record<string, unknown>;
} & EitherNotBoth<
  {
    fileContents?: string;
  },
  {
    data?: Record<string, unknown>;
  }
>;

const callProxyJSON = <T>(
  host: string,
  path: string,
  requestInit: RequestInit,
  { data, fileContents, queryParams }: CallProxyJSONOptions,
): Promise<T> => {
  const { method, ...otherOptions } = requestInit;

  // Add the path to the end of the proxy call, so it's easier to notice different proxy requests from each other
  return fetch(`/api/proxy${path}`, {
    ...otherOptions,
    headers: {
      'Content-Type': `application/json;charset=UTF-8`,
    },
    method: 'POST', // we always post so we can send data
    body: JSON.stringify({
      path, // Not part of the request -- but easier to read from the network tab
      method,
      host,
      queryParams,
      data,
      fileContents,
    }),
  }).then((response) => response.text().then((data) => JSON.parse(data)));
};

export const proxyGET = <T>(
  host: string,
  path: string,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'GET' }), { queryParams });

export const proxyCREATE = <T>(
  host: string,
  path: string,
  data: Record<string, unknown>,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'POST' }), {
    data,
    queryParams,
  });

export const proxyFILE = <T>(
  host: string,
  path: string,
  fileContents: string,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'POST' }), {
    fileContents,
    queryParams,
  });

export const proxyUPDATE = <T>(
  host: string,
  path: string,
  data: Record<string, unknown>,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'PUT' }), { data, queryParams });

export const proxyDELETE = <T>(
  host: string,
  path: string,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'DELETE' }), { queryParams });
