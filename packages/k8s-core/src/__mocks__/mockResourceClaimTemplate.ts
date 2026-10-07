import { genUID } from '@odh-dashboard/foundation';
import type { DeviceRequest, ResourceClaimTemplateKind } from '../dra/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  requests?: DeviceRequest[];
};

export const mockResourceClaimTemplate = ({
  name = 'test-gpu-template',
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
}: MockResourceConfigType): ResourceClaimTemplateKind => ({
  apiVersion: 'resource.k8s.io/v1',
  kind: 'ResourceClaimTemplate',
  metadata: {
    name,
    namespace,
    uid: genUID('resourceclaimtemplate'),
    resourceVersion: '1309350',
    creationTimestamp: '2026-09-30T12:00:00Z',
  },
  spec: {
    spec: {
      devices: {
        requests,
      },
    },
  },
});
