import * as React from 'react';
import { HostApiInfraContext } from '../HostApiInfraContext';
import type { SecretOps } from '../types';

export const useSecretOps = (): SecretOps => {
  const {
    createSecret,
    getSecret,
    deleteSecret,
    patchSecretWithOwnerReference,
    patchSecretWithProtocolAnnotation,
  } = React.useContext(HostApiInfraContext);
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
