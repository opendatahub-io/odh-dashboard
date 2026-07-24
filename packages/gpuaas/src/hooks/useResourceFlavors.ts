import * as React from 'react';
import { ResourceFlavorKind } from '@odh-dashboard/k8s-core';
import useFetch, { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { listResourceFlavors } from '@odh-dashboard/internal/api/k8s/resourceFlavors';
import { INFRASTRUCTURE_REFRESH_INTERVAL } from '../const';

const useResourceFlavors = (
  refreshRate = INFRASTRUCTURE_REFRESH_INTERVAL,
): FetchStateObject<ResourceFlavorKind[]> =>
  useFetch<ResourceFlavorKind[]>(
    React.useCallback(async () => listResourceFlavors(), []),
    [],
    { refreshRate },
  );

export default useResourceFlavors;
