import { AcceleratorKind } from '~/k8sTypes';

export const mockAcceleratorProfile = (): AcceleratorKind => ({
  apiVersion: 'dashboard.opendatahub.io/v1',
  kind: 'AcceleratorProfile',
  metadata: {
    name: 'test-accelerator',
  },
  spec: {
    displayName: 'test-accelerator',
    enabled: true,
    identifier: 'nvidia.com/gpu',
    description: 'Test description',
    tolerations: [
      {
        key: 'nvidia.com/gpu',
        operator: 'Exists',
        effect: 'NoSchedule',
      },
    ],
  },
});
