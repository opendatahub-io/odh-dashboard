import * as React from 'react';
import type { ConnectionTypeConfigMapObj } from '@odh-dashboard/k8s-core';
import { HostApiContext } from '../HostApiContext';
import type { HostApiFetchState } from '../types';

export const useWatchConnectionTypes = (
  modelServingCompatible?: boolean,
): HostApiFetchState<ConnectionTypeConfigMapObj[]> => {
  const api = React.useContext(HostApiContext);
  return api.useWatchConnectionTypes(modelServingCompatible);
};
