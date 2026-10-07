import { genUID } from '@odh-dashboard/foundation';
import type { DeviceRequest, DeviceRequestAllocationResult, ResourceClaimKind } from '../dra/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  requests?: DeviceRequest[];
  /** Omit for a pending claim. */
  allocationResults?: DeviceRequestAllocationResult[];
};

export const mockResourceClaim = ({
  name = 'test-pod-gpu-abc12',
  namespace = 'test-project',
  requests = [
    {
      name: 'gpu',
      exactly: {
        deviceClassName: 'gpu.example.com',
        count: 1,
      },
    },
  ],
  allocationResults,
}: MockResourceConfigType): ResourceClaimKind => ({
  apiVersion: 'resource.k8s.io/v1',
  kind: 'ResourceClaim',
  metadata: {
    name,
    namespace,
    uid: genUID('resourceclaim'),
    resourceVersion: '1309351',
    creationTimestamp: '2026-09-30T12:00:00Z',
  },
  spec: {
    devices: {
      requests,
    },
  },
  status: allocationResults
    ? {
        allocation: {
          devices: {
            results: allocationResults,
          },
        },
      }
    : {},
});
