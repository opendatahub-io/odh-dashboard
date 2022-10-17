import * as React from 'react';
import { DataConnection, DataConnectionAWS, DataConnectionType } from '../../../types';
import { getSecretsByLabel } from '../../../../../api';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { AWSSecretKind } from '../../../../../k8sTypes';

const useDataConnections = (): [
  connections: DataConnection[],
  loaded: boolean,
  loadError: Error | undefined,
] => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [connections, setConnections] = React.useState<DataConnection[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const namespace = currentProject.metadata.name;

  React.useEffect(() => {
    getSecretsByLabel(`opendatahub.io/managed=true`, namespace)
      .then((secrets) => {
        setConnections((d) => [
          ...d,
          ...secrets
            .filter<AWSSecretKind>( // TODO: this will make more sense when we have more data connection types
              (secret): secret is AWSSecretKind =>
                !!secret.metadata.labels?.[`opendatahub.io/managed`], // note, always true is fine for now
            )
            .map<DataConnectionAWS>((secret) => ({
              type: DataConnectionType.AWS,
              data: secret,
            })),
        ]);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e);
      });
  }, [namespace]);

  return [connections, loaded, error];
};

export default useDataConnections;
