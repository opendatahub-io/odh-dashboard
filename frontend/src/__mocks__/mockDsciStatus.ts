import { StackCapability } from '#~/concepts/areas/types';
import { DataScienceClusterInitializationKindStatus, K8sCondition } from '#~/k8sTypes';

export type MockDsciStatus = {
  conditions?: K8sCondition[];
  requiredCapabilities?: StackCapability[];
  phase?: string;
};

export const mockDsciStatus = ({
  conditions = [],
  requiredCapabilities = [],
  phase = 'Ready',
}: MockDsciStatus): DataScienceClusterInitializationKindStatus => ({
  conditions: [
    ...[
      {
        lastHeartbeatTime: '2023-10-20T11:45:04Z',
        lastTransitionTime: '2023-10-20T11:45:04Z',
        message: 'Reconcile completed successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'ReconcileComplete',
      },
      ...requiredCapabilities.map((capability) => ({
        lastHeartbeatTime: '2023-10-20T11:45:04Z',
        lastTransitionTime: '2023-10-20T11:45:04Z',
        message: `Capability ${capability} installed`,
        reason: 'ReconcileCompleted',
        status: 'True',
        type: capability,
      })),
    ],
    ...conditions,
  ],
  phase,
});
