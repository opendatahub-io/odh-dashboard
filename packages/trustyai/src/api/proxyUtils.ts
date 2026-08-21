import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import { mergeRequestInit } from '@odh-dashboard/k8s-core';

type CallProxyJSONOptions = {
  queryParams?: Record<string, unknown>;
  parseJSON?: boolean;
  data?: Record<string, unknown>;
};

const callProxyJSON = <T>(
  host: string,
  path: string,
  requestInit: RequestInit,
  { data, queryParams, parseJSON = true }: CallProxyJSONOptions,
): Promise<T> => {
  const { method, ...otherOptions } = requestInit;

  const sanitizedQueryParams = queryParams
    ? Object.entries(queryParams).reduce<Record<string, unknown>>((acc, [key, value]) => {
        if (value) {
          return { ...acc, [key]: value };
        }

        return acc;
      }, {})
    : null;

  const searchParams = sanitizedQueryParams
    ? new URLSearchParams(
        Object.entries(sanitizedQueryParams).reduce<Record<string, string>>(
          (acc, [key, value]) => ({ ...acc, [key]: String(value) }),
          {},
        ),
      ).toString()
    : null;

  const contentType = data ? 'application/json;charset=UTF-8' : undefined;
  const requestData = data ? JSON.stringify(data) : undefined;

  return fetch(`${host}${path}${searchParams ? `?${searchParams}` : ''}`, {
    ...otherOptions,
    ...(contentType && { headers: { 'Content-Type': contentType } }),
    method,
    body: requestData,
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
