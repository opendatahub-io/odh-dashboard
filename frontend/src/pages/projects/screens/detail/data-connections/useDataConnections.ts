import * as React from 'react';
import { DataConnection, DataConnectionAWS, DataConnectionType } from '~/pages/projects/types';
import { getSecretsByLabel } from '~/api';
import { AWSSecretKind } from '~/k8sTypes';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE, LABEL_SELECTOR_DATA_CONNECTION_AWS } from '~/const';
import { isSecretAWSSecretKind } from './utils';

const useDataConnections = (namespace?: string): FetchState<DataConnection[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<DataConnection[]>>(
    (opts) => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace'));
      }

      return getSecretsByLabel(
        `${LABEL_SELECTOR_DATA_CONNECTION_AWS},${LABEL_SELECTOR_DASHBOARD_RESOURCE}`,
        namespace,
        opts,
      ).then((secrets) =>
        secrets
          .filter<AWSSecretKind>( // TODO: this will make more sense when we have more data connection types
            isSecretAWSSecretKind, // note, always true is fine for now
          )
          .map<DataConnectionAWS>((secret) => ({
            type: DataConnectionType.AWS,
            data: secret,
          })),
      );
    },
    [namespace],
  );

  return useFetchState(callback, []);
};

export default useDataConnections;
