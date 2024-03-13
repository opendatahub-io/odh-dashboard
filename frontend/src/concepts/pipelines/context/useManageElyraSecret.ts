import * as React from 'react';
import useElyraSecret from '~/concepts/pipelines/elyra/useElyraSecret';
import { createSecret, replaceSecret } from '~/api';
import { DSPipelineKind } from '~/k8sTypes';
import { generateElyraSecret } from '~/concepts/pipelines/elyra/utils';
import {
  ELYRA_SECRET_DATA_ENDPOINT,
  ELYRA_SECRET_DATA_KEY,
  ELYRA_SECRET_DATA_TYPE,
} from '~/concepts/pipelines/elyra/const';
import useExternalStorageSecret from '~/concepts/secrets/apiHooks/useExternalStorageSecret';
import useNotification from '~/utilities/useNotification';

const useManageElyraSecret = (
  namespace: string,
  cr: DSPipelineKind | null,
  routePath: string | null,
): void => {
  const [elyraSecret, elyraSecretLoaded, elyraSecretError] = useElyraSecret(namespace, !!cr);
  const [dataConnection, dataConnectionLoaded, dataConnectionError] = useExternalStorageSecret(
    cr?.spec.objectStorage.externalStorage?.s3CredentialsSecret.secretName,
    namespace,
  );
  const notification = useNotification();

  React.useEffect(() => {
    const error = elyraSecretError || dataConnectionError;
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error managing elyra secret', error.message);
    }
  }, [dataConnectionError, elyraSecretError]);

  const fullLoadedState = elyraSecretLoaded && dataConnectionLoaded;
  React.useEffect(() => {
    const externalStorage = cr?.spec.objectStorage.externalStorage;
    if (fullLoadedState && dataConnection && routePath && externalStorage) {
      let generatedSecret;
      try {
        generatedSecret = generateElyraSecret(externalStorage, dataConnection, routePath);
      } catch (e) {
        if (e instanceof Error) {
          notification.error(e.message);
        }
      }

      if (!generatedSecret) {
        return;
      }
      if (!elyraSecret) {
        // Create a new secret
        createSecret(generatedSecret);
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
          replaceSecret(generateElyraSecret(externalStorage, dataConnection, routePath));
        }
      } catch (e) {
        // do nothing
      }
    }
  }, [fullLoadedState, routePath, elyraSecret, dataConnection, cr, notification]);
};

export default useManageElyraSecret;
