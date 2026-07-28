import * as React from 'react';
import { HostApiContext } from '../HostApiContext';
import type { SecretOps } from '../types';

export const useSecretOps = (): SecretOps => {
  const {
    createSecret,
    getSecret,
    deleteSecret,
    patchSecretWithOwnerReference,
    patchSecretWithProtocolAnnotation,
  } = React.useContext(HostApiContext);
  return React.useMemo(
    () => ({
      createSecret,
      getSecret,
      deleteSecret,
      patchSecretWithOwnerReference,
      patchSecretWithProtocolAnnotation,
    }),
    [
      createSecret,
      getSecret,
      deleteSecret,
      patchSecretWithOwnerReference,
      patchSecretWithProtocolAnnotation,
    ],
  );
};
