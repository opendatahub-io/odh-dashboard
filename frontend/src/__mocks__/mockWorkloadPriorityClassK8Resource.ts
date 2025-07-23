import { WorkloadPriorityClassKind } from '#~/k8sTypes.ts';

type MockResourceConfigType = {
  name?: string;
  description?: string;
  value?: number;
};

export const mockWorkloadPriorityClassK8sResource = ({
  name = 'test-priority-class',
  description = 'Test description',
  value = 1000,
}: MockResourceConfigType): WorkloadPriorityClassKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta1',
  kind: 'WorkloadPriorityClass',
  description,
  metadata: {
    name,
  },
  value,
});
