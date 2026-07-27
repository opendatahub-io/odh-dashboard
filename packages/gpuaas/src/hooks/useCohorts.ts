import * as React from 'react';
import useFetch, { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { listClusterQueues } from '@odh-dashboard/internal/api/k8s/clusterQueues';
import { listCohorts } from '@odh-dashboard/internal/api/k8s/cohorts';
import { ClusterQueueKind, CohortKind, ContainerResourceAttributes } from '@odh-dashboard/k8s-core';
import { FlavorQuota, UnifiedCohort } from '../types';
import { INFRASTRUCTURE_REFRESH_INTERVAL } from '../const';
import parseK8sQuantity from '../utils/parseK8sQuantity';

// CQs with no cohortName are bucketed under the empty-string key
const STANDALONE_BUCKET_NAME = '';

const buildExplicitPool = (cohort: CohortKind): FlavorQuota[] =>
  (cohort.spec.resourceGroups ?? []).flatMap((rg) =>
    rg.flavors.map((f) => ({
      name: f.name,
      resources: f.resources.map((r) => ({
        name: r.name,
        nominalQuota: parseK8sQuantity(r.nominalQuota),
      })),
    })),
  );

const buildImplicitPool = (memberCQs: ClusterQueueKind[]): FlavorQuota[] => {
  const flavorMap = new Map<string, Map<ContainerResourceAttributes, number>>();

  for (const cq of memberCQs) {
    for (const rg of cq.spec.resourceGroups ?? []) {
      for (const flavor of rg.flavors) {
        let resourceMap = flavorMap.get(flavor.name);
        if (!resourceMap) {
          resourceMap = new Map();
          flavorMap.set(flavor.name, resourceMap);
        }
        for (const r of flavor.resources) {
          const current = resourceMap.get(r.name) ?? 0;
          resourceMap.set(r.name, current + parseK8sQuantity(r.nominalQuota));
        }
      }
    }
  }

  return [...flavorMap.entries()].map(([name, resources]) => ({
    name,
    resources: [...resources.entries()].map(([rName, nominalQuota]) => ({
      name: rName,
      nominalQuota,
    })),
  }));
};

const buildUnifiedCohorts = (
  clusterQueues: ClusterQueueKind[],
  cohorts: CohortKind[],
): UnifiedCohort[] => {
  const cohortMap = new Map(cohorts.map((c) => [c.metadata?.name ?? '', c]));

  const cohortNameToCQs = new Map<string, ClusterQueueKind[]>();
  for (const cq of clusterQueues) {
    const cohortName = cq.spec.cohortName ?? STANDALONE_BUCKET_NAME;
    const existing = cohortNameToCQs.get(cohortName) ?? [];
    existing.push(cq);
    cohortNameToCQs.set(cohortName, existing);
  }

  const result: UnifiedCohort[] = [];

  for (const [cohortName, memberCQs] of cohortNameToCQs) {
    if (cohortName === STANDALONE_BUCKET_NAME) {
      result.push({
        name: STANDALONE_BUCKET_NAME,
        state: 'standalone',
        memberClusterQueues: memberCQs,
        effectivePool: buildImplicitPool(memberCQs),
      });
      continue;
    }

    const cohortResource = cohortMap.get(cohortName);
    if (cohortResource) {
      result.push({
        name: cohortName,
        state: 'explicit',
        cohortResource,
        memberClusterQueues: memberCQs,
        effectivePool: buildExplicitPool(cohortResource),
      });
      cohortMap.delete(cohortName);
    } else {
      result.push({
        name: cohortName,
        state: 'implicit',
        memberClusterQueues: memberCQs,
        effectivePool: buildImplicitPool(memberCQs),
      });
    }
  }

  for (const [name, cohortResource] of cohortMap) {
    result.push({
      name,
      state: 'explicit',
      cohortResource,
      memberClusterQueues: [],
      effectivePool: buildExplicitPool(cohortResource),
    });
  }

  return result;
};

const useCohorts = (
  refreshRate = INFRASTRUCTURE_REFRESH_INTERVAL,
): FetchStateObject<UnifiedCohort[]> =>
  useFetch<UnifiedCohort[]>(
    React.useCallback(async () => {
      const [clusterQueues, cohorts] = await Promise.all([listClusterQueues(), listCohorts()]);
      return buildUnifiedCohorts(clusterQueues, cohorts);
    }, []),
    [],
    { refreshRate },
  );

export default useCohorts;
