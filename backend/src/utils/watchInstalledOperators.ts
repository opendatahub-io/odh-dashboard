import { CustomObjectsApi } from '@kubernetes/client-node';
import { CSVKind, K8sResourceCommon } from '../types';

const WATCH_INTERVAL = 2 * 60 * 1000;

let watchTimer: NodeJS.Timeout = undefined;
let installedOperators: K8sResourceCommon[] = [];

const fetchInstalledOperators = (
  customObjectsApi: CustomObjectsApi,
): Promise<K8sResourceCommon[]> => {
  return customObjectsApi
    .listNamespacedCustomObject('operators.coreos.com', 'v1alpha1', '', 'clusterserviceversions')
    .then((res) => {
      const csvs = (res?.body as { items: CSVKind[] })?.items;
      if (csvs?.length) {
        return csvs.reduce((acc, csv) => {
          if (csv.status?.phase === 'Succeeded' && csv.status?.reason === 'InstallSucceeded') {
            acc.push(csv);
          }
          return acc;
        }, []);
      }
      return [];
    })
    .catch((e) => {
      console.error(e, 'failed to get ClusterServiceVersions');
      return [];
    });
};

export const startWatchingOperators = (customObjectsApi: CustomObjectsApi): void => {
  if (watchTimer !== undefined) {
    return;
  }

  // no timer, but not undefined
  watchTimer = null;
  fetchInstalledOperators(customObjectsApi).then((results) => {
    installedOperators = results;
    watchTimer = setInterval(() => {
      if (watchTimer) {
        fetchInstalledOperators(customObjectsApi).then((results) => {
          installedOperators = results;
        });
      }
    }, WATCH_INTERVAL);
  });
};

export const stopWatchingOperators = (): void => {
  if (!watchTimer) {
    return;
  }
  clearInterval(watchTimer);
  watchTimer = undefined;
};

export const getInstalledOperators = (): K8sResourceCommon[] => installedOperators;
