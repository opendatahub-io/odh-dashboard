import * as React from 'react';
import { listServingRuntime } from '../../../../api/network/servingRuntimes';
import { ServingRuntimeKind } from '../../../../k8sTypes';

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
  const getServingRuntimeKind = React.useCallback(() => {
    if (namespace) {
      listServingRuntime(namespace)
        .then((modelServer) => {
          setModelServers(modelServer);
          setLoaded(true);
        })
        .catch((e) => {
          setError(e);
          setLoaded(true);
        });
    } else {
      setModelServers([]);
      setLoaded(true);
      setError(undefined);
    }
  }, [namespace]);

  const refresh = React.useCallback(() => {
    getServingRuntimeKind();
  }, [getServingRuntimeKind]);

  React.useEffect(() => {
    getServingRuntimeKind();
  }, [getServingRuntimeKind]);

  return [modelServers, loaded, error, refresh];
};

export default useServingRuntimes;
