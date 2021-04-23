const WATCH_INTERVAL = 2 * 60 * 1000;

let watchTimer = null;
let services = [];

const fetchServices = (coreV1Api) => {
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

const startWatching = (customObjectsApi) => {
  if (watchTimer !== null) {
    return;
  }

  // no timer, but non-null
  watchTimer = 0;
  fetchServices(customObjectsApi).then((results) => {
    services = results;
    watchTimer = setInterval(() => {
      if (watchTimer) {
        fetchServices(customObjectsApi).then((results) => {
          services = results;
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

const getServices = () => services;

module.exports = { startWatching, getServices, stopWatching };
