import * as React from 'react';
import useElyraSecret from '~/concepts/pipelines/elyra/useElyraSecret';
import { createSecret } from '~/api';
import { DSPipelineKind } from '~/k8sTypes';
import { generateElyraSecret } from '~/concepts/pipelines/elyra/utils';
import useAWSSecret from '~/concepts/secrets/apiHooks/useAWSSecret';

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
    if (fullLoadedState && !elyraSecret && dataConnection && routePath) {
      createSecret(
        generateElyraSecret(
          dataConnection.data,
          dataConnection.metadata.name,
          dataConnection.metadata.namespace,
          routePath,
        ),
      );
    }
  }, [fullLoadedState, routePath, elyraSecret, dataConnection]);
};

export default useManageElyraSecret;
