import * as React from 'react';
import useFetch, { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
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
): FetchStateObject<QuotaHierarchyData> =>
  useFetch<QuotaHierarchyData>(
    React.useCallback(async () => {
      const [clusterQueues, cohorts] = await Promise.all([listClusterQueues(), listCohorts()]);
      return { tree: buildQuotaHierarchyTree(cohorts, clusterQueues) };
    }, []),
    { tree: [] },
    { refreshRate },
  );

export default useQuotaHierarchy;
