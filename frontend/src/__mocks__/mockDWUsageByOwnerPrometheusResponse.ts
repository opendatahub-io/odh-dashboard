import { WorkloadMetricIndexedByOwner, WorkloadMetricPromQueryResponse } from '#~/api';
import { WorkloadOwnerType } from '#~/k8sTypes';
import { mockPrometheusQueryVectorResponse } from './mockPrometheusQueryVectorResponse';

export const mockDWUsageByOwnerPrometheusResponse = (
  usageByOwner: WorkloadMetricIndexedByOwner,
): WorkloadMetricPromQueryResponse =>
  mockPrometheusQueryVectorResponse({
    result: Object.values(WorkloadOwnerType).flatMap((ownerKind) =>
      Object.keys(usageByOwner[ownerKind]).map((ownerName) => ({
        // eslint-disable-next-line camelcase
        metric: { owner_kind: ownerKind, owner_name: ownerName },
        value: [0, String(usageByOwner[ownerKind][ownerName])],
      })),
    ),
  });
