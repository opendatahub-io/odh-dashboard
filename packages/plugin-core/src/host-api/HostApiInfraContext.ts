import * as React from 'react';
import type { HostApiInfraServices } from './types';

const notProvided = (name: string) => () => {
  throw new Error(`HostApiInfraContext not provided: ${name}`);
};

export const HostApiInfraContext = React.createContext<HostApiInfraServices>({
  createSecret: notProvided('createSecret'),
  getSecret: notProvided('getSecret'),
  deleteSecret: notProvided('deleteSecret'),
  getSecretsByLabel: notProvided('getSecretsByLabel'),
  patchSecretWithOwnerReference: notProvided('patchSecretWithOwnerReference'),
  patchSecretWithProtocolAnnotation: notProvided('patchSecretWithProtocolAnnotation'),
  createProject: notProvided('createProject'),
  getDashboardPvcs: notProvided('getDashboardPvcs'),
});
