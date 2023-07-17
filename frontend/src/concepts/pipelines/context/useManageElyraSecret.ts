import * as React from 'react';
import useElyraSecret from '~/concepts/pipelines/elyra/useElyraSecret';
import { createSecret, replaceSecret } from '~/api';
import { DSPipelineKind } from '~/k8sTypes';
import { generateElyraSecret } from '~/concepts/pipelines/elyra/utils';
import useAWSSecret from '~/concepts/secrets/apiHooks/useAWSSecret';
import {
  ELYRA_SECRET_DATA_ENDPOINT,
  ELYRA_SECRET_DATA_KEY,
  ELYRA_SECRET_DATA_TYPE,
} from '~/concepts/pipelines/elyra/const';

const useManageElyraSecret = (
  namespace: string,
  cr: DSPipelineKind | null,
  routePath: string | null,
) => {
  const [elyraSecret, elyraSecretLoaded, elyraSecretError] = useElyraSecret(namespace, !!cr);
  const [dataConnection, dataConnectionLoaded, dataConnectionError] = useAWSSecret(
    cr?.spec.objectStorage?.externalStorage?.s3CredentialsSecret?.secretName ?? null,
    namespace,
  );

  React.useEffect(() => {
    const error = elyraSecretError || dataConnectionError;
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error managing elyra secret', error.message);
    }
  }, [dataConnectionError, elyraSecretError]);

  const fullLoadedState = elyraSecretLoaded && dataConnectionLoaded;
  React.useEffect(() => {
    if (fullLoadedState && dataConnection && routePath) {
      if (!elyraSecret) {
        // Create a new secret
        createSecret(
          generateElyraSecret(
            dataConnection.data,
            dataConnection.metadata.name,
            dataConnection.metadata.namespace,
            routePath,
          ),
        );
        return;
      }
      try {
        const secretValue = JSON.parse(
          atob(elyraSecret.data?.[ELYRA_SECRET_DATA_KEY] || '{ metadata: {} }'),
        );
        const usingOldDataType =
          secretValue.metadata[ELYRA_SECRET_DATA_TYPE] === 'USER_CREDENTIALS';
        const usingOldUrl = !secretValue.metadata[ELYRA_SECRET_DATA_ENDPOINT].endsWith('/view/');
        if (usingOldDataType || usingOldUrl) {
          // Secret is out of date, update it
          replaceSecret(
            generateElyraSecret(
              dataConnection.data,
              dataConnection.metadata.name,
              dataConnection.metadata.namespace,
              routePath,
            ),
          );
        }
      } catch (e) {
        // do nothing
      }
    }
  }, [fullLoadedState, routePath, elyraSecret, dataConnection]);
};

export default useManageElyraSecret;
