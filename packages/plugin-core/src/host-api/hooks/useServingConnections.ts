import * as React from 'react';
import type { Connection } from '@odh-dashboard/k8s-core';
import { HostApiContext } from '../HostApiContext';
import type { HostApiFetchState } from '../types';

export const useServingConnections = (
  namespace?: string,
  includeDashboardFalse?: boolean,
  skipCompatibilityCheck?: boolean,
): HostApiFetchState<Connection[]> => {
  const api = React.useContext(HostApiContext);
  return api.useServingConnections(namespace, includeDashboardFalse, skipCompatibilityCheck);
};
