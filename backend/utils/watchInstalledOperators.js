const WATCH_INTERVAL = 2 * 60 * 1000;

let watchTimer = null;
let installedOperators = [];

const fetchInstalledOperators = (customObjectsApi) => {
  return customObjectsApi
    .listNamespacedCustomObject('operators.coreos.com', 'v1alpha1', '', 'clusterserviceversions')
    .then((res) => {
      const csvs = res?.body?.items;
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

const startWatching = (customObjectsApi) => {
  if (watchTimer !== null) {
    return;
  }

  // no timer, but non-null
  watchTimer = 0;
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

const stopWatching = () => {
  if (!watchTimer) {
    return;
  }
  clearInterval(watchTimer);
  watchTimer = null;
};

const getInstalledOperators = () => installedOperators;

module.exports = { startWatching, getInstalledOperators, stopWatching };
