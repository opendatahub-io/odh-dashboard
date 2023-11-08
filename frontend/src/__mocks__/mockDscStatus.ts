import { DataScienceClusterKindStatus, K8sCondition } from '~/k8sTypes';
import { StackComponent } from '~/concepts/areas/types';

export type MockDscStatus = {
  conditions?: K8sCondition[];
  phase?: string;
  installedComponents?: DataScienceClusterKindStatus['installedComponents'];
};

export const mockDscStatus = ({
  installedComponents,
  conditions = [],
  phase = 'Ready',
}: MockDscStatus): DataScienceClusterKindStatus => ({
  conditions: [
    ...[
      {
        lastHeartbeatTime: '2023-10-20T11:44:48Z',
        lastTransitionTime: '2023-10-15T19:04:21Z',
        message: 'DataScienceCluster resource reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'ReconcileComplete',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:44:48Z',
        lastTransitionTime: '2023-10-15T19:04:21Z',
        message: 'DataScienceCluster resource reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'Available',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:44:48Z',
        lastTransitionTime: '2023-10-15T19:04:21Z',
        message: 'DataScienceCluster resource reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'False',
        type: 'Progressing',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:44:48Z',
        lastTransitionTime: '2023-10-15T19:04:10Z',
        message: 'DataScienceCluster resource reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'False',
        type: 'Degraded',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:44:48Z',
        lastTransitionTime: '2023-10-15T19:04:21Z',
        message: 'DataScienceCluster resource reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'Upgradeable',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:44:59Z',
        lastTransitionTime: '2023-10-20T11:44:59Z',
        message: 'Component reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'odh-dashboardReady',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:44:59Z',
        lastTransitionTime: '2023-10-20T11:44:59Z',
        message: 'Component reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'data-science-pipelines-operatorReady',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:45:01Z',
        lastTransitionTime: '2023-10-20T11:45:01Z',
        message: 'Component reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'workbenchesReady',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:45:04Z',
        lastTransitionTime: '2023-10-20T11:45:04Z',
        message: 'Component reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'kserveReady',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:45:04Z',
        lastTransitionTime: '2023-10-20T11:45:04Z',
        message: 'Component reconciled successfully',
        reason: 'ReconcileCompleted',
        status: 'True',
        type: 'model-meshReady',
      },
      {
        lastHeartbeatTime: '2023-10-20T11:45:06Z',
        lastTransitionTime: '2023-10-20T11:45:06Z',
        message: 'Component is disabled',
        reason: 'ReconcileInit',
        status: 'Unknown',
        type: 'rayReady',
      },
    ],
    ...conditions,
  ],
  installedComponents: Object.values(StackComponent).reduce(
    (acc, component) => ({
      ...acc,
      [component]: installedComponents?.[component] ?? false,
    }),
    {},
  ),
  phase,
});
