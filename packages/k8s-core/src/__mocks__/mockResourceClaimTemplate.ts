import { genUID } from '@odh-dashboard/foundation';
import type { ResourceClaimTemplateKind } from '../k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  deviceClassName?: string;
};

export const mockResourceClaimTemplate = ({
  name = 'single-gpu',
  namespace = 'test-project',
  deviceClassName = 'gpu.nvidia.com',
}: MockResourceConfigType): ResourceClaimTemplateKind => ({
  kind: 'ResourceClaimTemplate',
  apiVersion: 'resource.k8s.io/v1',
  metadata: {
    name,
    namespace,
    uid: genUID('resourceclaimtemplate'),
    resourceVersion: '5120347',
    creationTimestamp: '2026-10-01T12:00:00Z',
  },
  spec: {
    spec: {
      devices: {
        requests: [
          {
            name: 'gpu',
            exactly: {
              deviceClassName,
            },
          },
        ],
      },
    },
  },
});
