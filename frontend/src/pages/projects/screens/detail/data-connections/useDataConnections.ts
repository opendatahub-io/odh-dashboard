import * as React from 'react';
import { DataConnection, DataConnectionAWS, DataConnectionType } from '~/pages/projects/types';
import { getSecretsByLabel } from '~/api';
import { AWSSecretKind } from '~/k8sTypes';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useDataConnections = (namespace?: string): FetchState<DataConnection[]> => {
  const fetchDataConnections = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getSecretsByLabel(
      `opendatahub.io/managed=true, opendatahub.io/dashboard=true`,
      namespace,
    ).then((secrets) =>
      secrets
        .filter<AWSSecretKind>( // TODO: this will make more sense when we have more data connection types
          (secret): secret is AWSSecretKind => !!secret.metadata.labels?.[`opendatahub.io/managed`], // note, always true is fine for now
        )
        .map<DataConnectionAWS>((secret) => ({
          type: DataConnectionType.AWS,
          data: secret,
        })),
    );
  }, [namespace]);

  return useFetchState<DataConnection[]>(fetchDataConnections, []);
};

export default useDataConnections;
