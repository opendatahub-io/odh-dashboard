import * as React from 'react';
import { getSecret } from '~/api';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useEdgeS3Secret = (
  namespace: string,
  secretName: string,
): FetchState<EnvVariableDataEntry[] | undefined> => {
  const fetchSecret = React.useCallback<() => Promise<EnvVariableDataEntry[] | undefined>>(
    () =>
      getSecret(namespace, secretName).then((secret) => {
        if (!secret || !secret.data) {
          throw new Error(`Secret ${secretName} data was not found.`);
        }
        if (!secret.data['s3-storage-config']) {
          throw new Error(`Secret ${secretName} data is not an edge s3 secret.`);
        }

        let data: Record<string, string>;
        try {
          data = JSON.parse(atob(secret.data['s3-storage-config']));
        } catch (e) {
          throw new Error(`Secret ${secretName} data is not an edge s3 secret.`);
        }

        return Object.entries(data).map(([key, value]) => ({
          key,
          value,
        }));
      }),
    [namespace, secretName],
  );
  return useFetchState<EnvVariableDataEntry[] | undefined>(fetchSecret, undefined);
};

export default useEdgeS3Secret;
