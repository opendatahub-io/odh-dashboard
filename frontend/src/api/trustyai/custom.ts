import { proxyCREATE, proxyDELETE, proxyGET } from '~/api/proxyUtils';
import { BaseMetricRequest } from './rawTypes';

export const getInfo = (hostPath: string) => () => proxyGET(hostPath, '/info');

export const getAllRequests = (hostPath: string) => () =>
  proxyGET(hostPath, '/metrics/all/requests');

export const getSpdRequests = (hostPath: string) => () =>
  proxyGET(hostPath, '/metrics/spd/requests');

export const createSpdRequest = (hostPath: string) => (data: BaseMetricRequest) =>
  proxyCREATE(hostPath, '/metrics/spd/request', data);

export const deleteSpdRequest = (hostPath: string) => (id: string) =>
  proxyDELETE(hostPath, '/metrics/spd/request', { requestId: id });

export const getDirRequests = (hostPath: string) => () =>
  proxyGET(hostPath, '/metrics/dir/requests');

export const createDirRequest = (hostPath: string) => (data: BaseMetricRequest) =>
  proxyCREATE(hostPath, '/metrics/dir/request', data);

export const deleteDirRequest = (hostPath: string) => (id: string) =>
  proxyDELETE(hostPath, '/metrics/dir/request', { requestId: id });
