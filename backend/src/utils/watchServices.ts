import { CoreV1Api } from '@kubernetes/client-node';
import { K8sResourceCommon } from '../types';

const WATCH_INTERVAL = 2 * 60 * 1000;

let watchTimer: NodeJS.Timeout = undefined;
let services: K8sResourceCommon[] = [];

const fetchServices = (coreV1Api: CoreV1Api) => {
  return coreV1Api
    .listServiceForAllNamespaces()
    .then((res) => {
      return res?.body?.items;
    })
    .catch((e) => {
      console.error(e, 'failed to get Services');
      return [];
    });
};

export const startWatchingServices = (coreV1Api: CoreV1Api): void => {
  if (watchTimer !== undefined) {
    return;
  }

  // no timer, but not undefined
  watchTimer = null;
  fetchServices(coreV1Api).then((results) => {
    services = results;
    watchTimer = setInterval(() => {
      if (watchTimer) {
        fetchServices(coreV1Api).then((results) => {
          services = results;
        });
      }
    }, WATCH_INTERVAL);
  });
};

export const stopWatchingServices = (): void => {
  if (!watchTimer) {
    return;
  }
  clearInterval(watchTimer);
  watchTimer = null;
};

export const getServices = (): K8sResourceCommon[] => services;
