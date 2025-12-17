import { DataScienceClusterKindStatus, K8sCondition } from '#~/k8sTypes';
import { DataScienceStackComponent } from '#~/concepts/areas/types';
import { DataScienceStackComponentMap } from '#~/concepts/areas/const';

export type MockDscStatus = {
  components?: DataScienceClusterKindStatus['components'];
  conditions?: K8sCondition[];
  phase?: string;
  release?: {
    name: string;
    version: string;
  };
};

export const mockDscStatus = ({
  components = {
    // Dynamically create all components with default 'Managed' state
    ...Object.fromEntries(
      Object.values(DataScienceStackComponent).map((component) => [
        component,
        { managementState: 'Managed' },
      ]),
    ),
    // Override specific components with additional fields
    [DataScienceStackComponent.MODEL_REGISTRY]: {
      managementState: 'Managed',
      registriesNamespace: 'odh-model-registries',
      releases: [
        {
          name: 'Kubeflow Model Registry',
          repoUrl: 'https://github.com/kubeflow/model-registry',
          version: 'v0.2.13',
        },
      ],
    },
    [DataScienceStackComponent.K_SERVE]: {
      managementState: 'Managed',
      releases: [
        {
          name: 'KServe',
          repoUrl: 'https://github.com/kserve/kserve/',
          version: 'v0.14.0',
        },
      ],
    },
    [DataScienceStackComponent.WORKBENCHES]: {
      managementState: 'Managed',
      workbenchNamespace: 'openshift-ai-notebooks',
    },
  },
  conditions = [],
  phase = 'Ready',
  release = { name: 'Open Data Hub', version: '2.28.0' },
}: MockDscStatus): DataScienceClusterKindStatus => ({
  components,
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
  phase,
  release,
});

export const dataScienceStackComponentMap = DataScienceStackComponentMap;
