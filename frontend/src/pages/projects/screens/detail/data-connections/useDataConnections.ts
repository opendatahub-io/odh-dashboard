import * as React from 'react';
import { DataConnection, DataConnectionAWS, DataConnectionType } from '../../../types';
import { getSecretsByLabel } from '../../../../../api';
import { AWSSecretKind } from '../../../../../k8sTypes';

const useDataConnections = (
  namespace?: string,
): [
  connections: DataConnection[],
  loaded: boolean,
  loadError: Error | undefined,
  refreshDataConnections: () => void,
] => {
  const [connections, setConnections] = React.useState<DataConnection[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const fetchDataConnections = React.useCallback(() => {
    if (!namespace) {
      return;
    }
    setLoaded(false);
    getSecretsByLabel(`opendatahub.io/managed=true, opendatahub.io/dashboard=true`, namespace)
      .then((secrets) => {
        const dataConnections = secrets
          .filter<AWSSecretKind>( // TODO: this will make more sense when we have more data connection types
            (secret): secret is AWSSecretKind =>
              !!secret.metadata.labels?.[`opendatahub.io/managed`], // note, always true is fine for now
          )
          .map<DataConnectionAWS>((secret) => ({
            type: DataConnectionType.AWS,
            data: secret,
          }));
        setConnections(dataConnections);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e);
        setLoaded(true);
      });
  }, [namespace]);

  React.useEffect(() => {
    fetchDataConnections();
  }, [fetchDataConnections]);

  return [connections, loaded, error, fetchDataConnections];
};

export default useDataConnections;
