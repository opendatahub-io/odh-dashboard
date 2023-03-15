import axios, { Method } from 'axios';
import { mergeRequestInit } from '~/api/apiMergeUtils';
import { K8sAPIOptions } from '~/k8sTypes';

const callPipelines = <T>(host: string, options: RequestInit): Promise<T> =>
  axios
    .post('/api/proxy', {
      method: options.method as Method, // request options for fetch is more unbounded than axios -- cast to avoid type issues
      url: host,
      data: options.body,
    })
    .then((response) => response.data);

const joinHostPath = (host: string, path: string) => `${host}${path}`;

export const pipelinesGET = <T>(host: string, path: string, options?: K8sAPIOptions): Promise<T> =>
  callPipelines<T>(joinHostPath(host, path), mergeRequestInit(options, { method: 'GET' }));

export const pipelinesCREATE = <T>(
  host: string,
  path: string,
  options?: K8sAPIOptions,
): Promise<T> =>
  callPipelines<T>(joinHostPath(host, path), mergeRequestInit(options, { method: 'POST' }));

export const pipelinesUPDATE = <T>(
  host: string,
  path: string,
  options?: K8sAPIOptions,
): Promise<T> =>
  callPipelines<T>(joinHostPath(host, path), mergeRequestInit(options, { method: 'PUT' }));

export const pipelinesDELETE = <T>(
  host: string,
  path: string,
  options?: K8sAPIOptions,
): Promise<T> =>
  callPipelines<T>(joinHostPath(host, path), mergeRequestInit(options, { method: 'DELETE' }));
