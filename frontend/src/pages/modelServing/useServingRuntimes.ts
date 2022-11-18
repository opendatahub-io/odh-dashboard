import * as React from 'react';
import { listServingRuntimes } from '../../api/network/servingRuntimes';
import { ServingRuntimeKind } from '../../k8sTypes';

const useServingRuntimes = (
  namespace?: string,
): [
  resource: ServingRuntimeKind[],
  loaded: boolean,
  error: Error | undefined,
  forceRefresh: () => void,
] => {
  const [modelServers, setModelServers] = React.useState<ServingRuntimeKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  // Now there's only one model server in the cluster, in the future, we may have multiple model servers
  const fetchServingRuntimes = React.useCallback(() => {
    return listServingRuntimes(namespace, 'opendatahub.io/dashboard=true')
      .then((newServingRuntimes) => {
        setModelServers(newServingRuntimes);
      })
      .catch((e) => {
        if (e.statusObject?.code === 404) {
          setError(new Error('Model serving is not properly configured.'));
          return;
        }
        setError(e);
      });
  }, [namespace]);

  React.useEffect(() => {
    if (!loaded) {
      fetchServingRuntimes().then(() => {
        setLoaded(true);
      });
    }
    // TODO: No cleanup -- custom hook to manage that??
  }, [loaded, fetchServingRuntimes]);

  return [modelServers, loaded, error, fetchServingRuntimes];
};

export default useServingRuntimes;
