import { mergeRequestInit } from '~/api/apiMergeUtils';
import { K8sAPIOptions } from '~/k8sTypes';

const callPipelines = <T>(
  host: string,
  path: string,
  options: RequestInit,
  data?: Record<string, unknown>,
): Promise<T> => {
  const { method, ...otherOptions } = options;

  // Add the path to the end of the proxy call, so it's easier to notice different proxy requests from each other
  return fetch(`/api/proxy${path}`, {
    ...otherOptions,
    headers: {
      'Content-Type': `application/${
        method === 'PATCH' ? 'json-patch+json' : 'json'
      };charset=UTF-8`,
    },
    method: 'POST', // we always post so we can send data
    body: JSON.stringify({
      method,
      host,
      path, // Not part of the request -- but easier to read from the network tab
      data,
    }),
  }).then((response) => response.text().then((data) => JSON.parse(data)));
};

export const pipelinesGET = <T>(host: string, path: string, options?: K8sAPIOptions): Promise<T> =>
  callPipelines<T>(host, path, mergeRequestInit(options, { method: 'GET' }));

export const pipelinesCREATE = <T>(
  host: string,
  path: string,
  data: Record<string, unknown>,
  options?: K8sAPIOptions,
): Promise<T> => callPipelines<T>(host, path, mergeRequestInit(options, { method: 'POST' }), data);

export const pipelinesUPDATE = <T>(
  host: string,
  path: string,
  data: Record<string, unknown>,
  options?: K8sAPIOptions,
): Promise<T> => callPipelines<T>(host, path, mergeRequestInit(options, { method: 'PUT' }), data);

export const pipelinesDELETE = <T>(
  host: string,
  path: string,
  options?: K8sAPIOptions,
): Promise<T> => callPipelines<T>(host, path, mergeRequestInit(options, { method: 'DELETE' }));
