import { mergeRequestInit } from '~/api/apiMergeUtils';
import { K8sAPIOptions } from '~/k8sTypes';
import { EitherOrNone } from '~/typeHelpers';

type CallProxyJSONOptions = {
  queryParams?: Record<string, unknown>;
  parseJSON?: boolean;
} & EitherOrNone<
  {
    fileContents: string;
  },
  {
    data: Record<string, unknown>;
  }
>;

const callProxyJSON = <T>(
  host: string,
  path: string,
  requestInit: RequestInit,
  { data, fileContents, queryParams, parseJSON = true }: CallProxyJSONOptions,
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
  }).then((response) =>
    response.text().then((fetchedData) => {
      if (parseJSON) {
        return JSON.parse(fetchedData);
      }
      return fetchedData;
    }),
  );
};

export const proxyGET = <T>(
  host: string,
  path: string,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'GET' }), {
    queryParams,
    parseJSON: options?.parseJSON,
  });

/** Standard POST */
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
    parseJSON: options?.parseJSON,
  });

/** POST -- but with file content instead of body data */
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
    parseJSON: options?.parseJSON,
  });

/** POST -- but no body data -- targets simple endpoints */
export const proxyENDPOINT = <T>(
  host: string,
  path: string,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'POST' }), {
    queryParams,
    parseJSON: options?.parseJSON,
  });

export const proxyUPDATE = <T>(
  host: string,
  path: string,
  data: Record<string, unknown>,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'PUT' }), {
    data,
    queryParams,
    parseJSON: options?.parseJSON,
  });

export const proxyDELETE = <T>(
  host: string,
  path: string,
  data: Record<string, unknown>,
  queryParams: Record<string, unknown> = {},
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'DELETE' }), {
    data,
    queryParams,
    parseJSON: options?.parseJSON,
  });
