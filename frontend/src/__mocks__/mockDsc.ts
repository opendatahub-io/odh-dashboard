import { StackCapability } from '~/concepts/areas/types';
import { DataScienceClusterKind, K8sCondition } from '~/k8sTypes';

export type MockDsc = {
  conditions?: K8sCondition[];
  requiredCapabilities?: StackCapability[];
  phase?: string;
};

export const mockDsc = ({
  conditions = [],
  requiredCapabilities = [],
  phase = 'Ready',
}: MockDsc): DataScienceClusterKind => ({
  apiVersion: 'datascience.openshift.io/v1alpha1',
  kind: 'DataScienceCluster',
  metadata: {
    name: 'default-dsc',
  },
  spec: {
    components: {
      datasciencepipelines: {
        managementState: 'Managed',
        managedPipelines: {
          instructLab: {
            state: 'Managed',
          },
        },
      },
    },
  },
  status: {
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
  },
});
