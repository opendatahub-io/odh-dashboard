import { proxyCREATE, proxyDELETE, proxyGET } from '~/api/proxyUtils';
import { K8sAPIOptions } from '~/k8sTypes';
import { BaseMetricCreationResponse, BaseMetricListResponse, BaseMetricRequest } from './rawTypes';

export const getInfo = (hostPath: string) => (opts: K8sAPIOptions) =>
  proxyGET(hostPath, '/info', {}, opts);

export const getAllRequests =
  (hostPath: string) =>
  (opts: K8sAPIOptions): Promise<BaseMetricListResponse> =>
    proxyGET(hostPath, '/metrics/all/requests', {}, opts);

export const getSpdRequests =
  (hostPath: string) =>
  (opts: K8sAPIOptions): Promise<BaseMetricListResponse> =>
    proxyGET(hostPath, '/metrics/spd/requests', {}, opts);

export const createSpdRequest =
  (hostPath: string) =>
  (opts: K8sAPIOptions, data: BaseMetricRequest): Promise<BaseMetricCreationResponse> =>
    proxyCREATE(hostPath, '/metrics/spd/request', data, {}, opts);

export const deleteSpdRequest =
  (hostPath: string) =>
  (opts: K8sAPIOptions, id: string): Promise<void> =>
    proxyDELETE(
      hostPath,
      '/metrics/spd/request',
      { requestId: id },
      {},
      { parseJSON: false, ...opts },
    );

export const getDirRequests =
  (hostPath: string) =>
  (opts: K8sAPIOptions): Promise<BaseMetricListResponse> =>
    proxyGET(hostPath, '/metrics/dir/requests', {}, opts);

export const createDirRequest =
  (hostPath: string) =>
  (opts: K8sAPIOptions, data: BaseMetricRequest): Promise<BaseMetricCreationResponse> =>
    proxyCREATE(hostPath, '/metrics/dir/request', data, {}, opts);

export const deleteDirRequest =
  (hostPath: string) =>
  (opts: K8sAPIOptions, id: string): Promise<void> =>
    proxyDELETE(
      hostPath,
      '/metrics/dir/request',
      { requestId: id },
      {},
      { parseJSON: false, ...opts },
    );
