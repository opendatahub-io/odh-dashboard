import { getModelServers } from 'api/network/modelServer';
import { ModelServerKind } from 'k8sTypes';
import * as React from 'react';

const useModelServer = (
  namespace?: string,
): [
  resource: ModelServerKind[],
  loaded: boolean,
  error: Error | undefined,
  forceRefresh: () => void,
] => {
  const [modelServer, setModelServer] = React.useState<ModelServerKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  // Now there's only one model server in the cluster, in the future, we may have multiple model servers
  const getModelServerKind = React.useCallback(() => {
    if (namespace) {
      getModelServers(namespace)
        .then((modelServer) => {
          setModelServer(modelServer);
          setLoaded(true);
        })
        .catch((e) => {
          setError(e);
          setLoaded(true);
        });
    } else {
      setModelServer([]);
      setLoaded(true);
      setError(undefined);
    }
  }, [namespace]);

  const refresh = React.useCallback(() => {
    getModelServerKind();
  }, [getModelServerKind]);

  React.useEffect(() => {
    getModelServerKind();
  }, [getModelServerKind]);

  return [modelServer, loaded, error, refresh];
};

export default useModelServer;
