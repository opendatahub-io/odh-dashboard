import * as React from 'react';
import { HostApiContext } from '../HostApiContext';
import type { ServingPlatformStatuses } from '../types';

export const useServingPlatformStatuses = (
  shouldRefreshNimAvailability?: boolean,
): ServingPlatformStatuses => {
  const api = React.useContext(HostApiContext);
  return api.useServingPlatformStatuses(shouldRefreshNimAvailability);
};
