import * as React from 'react';
import { getSecret } from '#~/api';
import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';

const useNamespaceSecret = (
  namespace: string,
  secretName: string,
): FetchState<EnvVariable | undefined> => {
  const fetchSecret = React.useCallback<() => Promise<EnvVariable | undefined>>(
    () =>
      getSecret(namespace, secretName).then((secret) => {
        if (!secret.data) {
          throw new Error(`Secret ${secretName} data was not found.`);
        }

        const { data } = secret;

        return {
          type: EnvironmentVariableType.SECRET,
          existingName: secret.metadata.name,
          values: {
            category: SecretCategory.GENERIC,
            data: Object.keys(data).map((key) => ({ key, value: atob(data[key]) })),
          },
        };
      }),
    [namespace, secretName],
  );
  return useFetchState<EnvVariable | undefined>(fetchSecret, undefined);
};

export default useNamespaceSecret;
