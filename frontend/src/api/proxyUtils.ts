import { mergeRequestInit } from '#~/api/apiMergeUtils';
import { K8sAPIOptions } from '#~/k8sTypes';
import { EitherOrNone } from '#~/typeHelpers';

/**
 * Thrown when a proxy call receives a transient HTTP error (e.g. 502/503) from the
 * upstream server. This typically happens during pipeline server startup when the
 * OpenShift route exists and is Admitted but HAProxy hasn't finished propagating.
 */
export class ProxyTransientError extends Error {
  public status: number;

  constructor(status: number) {
    super(`Received transient ${status} response from pipeline server`);
    this.name = 'ProxyTransientError';
    this.status = status;
  }
}

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

  const sanitizedQueryParams = queryParams
    ? Object.entries(queryParams).reduce((acc, [key, value]) => {
        if (value) {
          return { ...acc, [key]: value };
        }

        return acc;
      }, {})
    : null;

  const searchParams = sanitizedQueryParams
    ? new URLSearchParams(sanitizedQueryParams).toString()
    : null;

  let requestData: string | undefined;
  let contentType: string | undefined;
  let formData: FormData | undefined;
  if (fileContents) {
    formData = new FormData();
    formData.append(
      'uploadfile',
      new Blob([fileContents], { type: 'application/x-yaml' }),
      'uploadedFile.yml',
    );
  } else if (data) {
    // It's OK for contentType and requestData to BOTH be undefined for e.g. a GET request or POST with no body.
    contentType = 'application/json;charset=UTF-8';
    requestData = JSON.stringify(data);
  }

  return fetch(`${host}${path}${searchParams ? `?${searchParams}` : ''}`, {
    ...otherOptions,
    ...(contentType && { headers: { 'Content-Type': contentType } }),
    method,
    body: formData ?? requestData,
  }).then((response) => {
    // Detect transient server errors (502/503) before attempting to parse the response
    // body as JSON. During pipeline server startup, HAProxy returns 502 with an empty
    // body — JSON.parse("") would throw SyntaxError and produce a misleading error message.
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

export const proxyPATCH = <T>(
  host: string,
  path: string,
  data: Record<string, unknown>,
  options?: K8sAPIOptions,
): Promise<T> =>
  callProxyJSON<T>(host, path, mergeRequestInit(options, { method: 'PATCH' }), {
    data,
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
