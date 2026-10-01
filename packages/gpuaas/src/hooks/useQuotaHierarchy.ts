import * as React from 'react';
import useFetch, { FetchStateObject, NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import { listClusterQueues } from '@odh-dashboard/internal/api/k8s/clusterQueues';
import { listCohorts } from '@odh-dashboard/internal/api/k8s/cohorts';
import { QuotaTreeNode } from '../types';
import { INFRASTRUCTURE_REFRESH_INTERVAL } from '../const';
import { buildQuotaHierarchyTree } from '../utils/buildQuotaHierarchyTree';

export type QuotaHierarchyData = {
  tree: QuotaTreeNode[];
};

const useQuotaHierarchy = (
  refreshRate = INFRASTRUCTURE_REFRESH_INTERVAL,
  canAccessAdminTabs = true,
  adminAccessLoaded = true,
): FetchStateObject<QuotaHierarchyData> & { lastRefreshed: Date | null } => {
  const quotaHierarchyState = useFetch<QuotaHierarchyData>(
    React.useCallback(async () => {
      if (!adminAccessLoaded) {
        throw new NotReadyError('ClusterQueue access check is still loading');
      }
      if (!canAccessAdminTabs) {
        return { tree: [] };
      }
      const [clusterQueues, cohorts] = await Promise.all([listClusterQueues(), listCohorts()]);
      return { tree: buildQuotaHierarchyTree(cohorts, clusterQueues) };
    }, [adminAccessLoaded, canAccessAdminTabs]),
    { tree: [] },
    { refreshRate, initialPromisePurity: true },
  );

  const initializedRef = React.useRef(false);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);
  const { refresh: refreshQuotaHierarchy } = quotaHierarchyState;

  React.useEffect(() => {
    if (quotaHierarchyState.loaded && !initializedRef.current) {
      initializedRef.current = true;
      setLastRefreshed(new Date());
    }
  }, [quotaHierarchyState.loaded]);

  const refresh = React.useCallback(async () => {
    const result = await refreshQuotaHierarchy();
    if (result !== undefined) {
      setLastRefreshed(new Date());
    }
    return result;
  }, [refreshQuotaHierarchy]);

  return { ...quotaHierarchyState, lastRefreshed, refresh };
};

export default useQuotaHierarchy;
