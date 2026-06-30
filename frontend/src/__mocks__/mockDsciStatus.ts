import type {
  K8sCondition,
  DataScienceClusterInitializationKindStatus,
} from '@odh-dashboard/k8s-core';
import type { StackCapability } from '@odh-dashboard/plugin-core/areas';

export type MockDsciStatus = {
  conditions?: K8sCondition[];
  requiredCapabilities?: StackCapability[];
  phase?: string;
  monitoringNamespace?: string;
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
