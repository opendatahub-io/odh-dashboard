import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';

/**
 * Thrown when a proxy call receives a transient HTTP error (e.g. 502/503) from the
 * upstream server. This typically happens during service startup when the OpenShift
 * route exists and is Admitted but HAProxy hasn't finished propagating.
 */
export class ProxyTransientError extends Error {
  public status: number;

  constructor(status: number) {
    super(`Received transient ${status} response from the upstream server`);
    this.name = 'ProxyTransientError';
    this.status = status;
  }
}

const mergeRequestInit = (
  opts: K8sAPIOptions = {},
  specificOpts: RequestInit = {},
): RequestInit => ({
  ...specificOpts,
  ...(opts.signal && { signal: opts.signal }),
});

const callProxyJSON = <T>(
  host: string,
  path: string,
  requestInit: RequestInit,
  {
    data,
    queryParams,
    parseJSON = true,
  }: {
    data?: Record<string, unknown>;
    queryParams?: Record<string, unknown>;
    parseJSON?: boolean;
  },
): Promise<T> => {
  const { method, ...otherOptions } = requestInit;

  const sanitizedQueryParams = queryParams
    ? Object.entries(queryParams).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value) {
          return { ...acc, [key]: String(value) };
        }
        return acc;
      }, {})
    : null;

  const searchParams = sanitizedQueryParams
    ? new URLSearchParams(sanitizedQueryParams).toString()
    : null;

  const contentType = data ? 'application/json;charset=UTF-8' : undefined;
  const requestData = data ? JSON.stringify(data) : undefined;

  return fetch(`${host}${path}${searchParams ? `?${searchParams}` : ''}`, {
    ...otherOptions,
    ...(contentType && { headers: { 'Content-Type': contentType } }),
    method,
    body: requestData,
  }).then((response) => {
    // Detect transient server errors (502/503) before attempting to parse the response
    // body as JSON. During service startup, HAProxy returns 502 with an empty body —
    // JSON.parse("") would throw SyntaxError and produce a misleading error message.
    if (response.status === 502 || response.status === 503) {
      throw new ProxyTransientError(response.status);
    }

    return response.text().then((fetchedData) => {
      if (parseJSON) {
        return JSON.parse(fetchedData);
      }
      return fetchedData;
    });
  });
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
