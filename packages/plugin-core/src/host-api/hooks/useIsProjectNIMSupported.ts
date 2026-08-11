import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { HostApiContext } from '../HostApiContext';

export const useIsProjectNIMSupported = (): ((currentProject: ProjectKind) => boolean) => {
  const { isProjectNIMSupported } = React.useContext(HostApiContext);
  return isProjectNIMSupported;
};
