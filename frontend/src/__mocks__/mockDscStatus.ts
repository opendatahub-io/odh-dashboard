import {
  DataScienceClusterInstalledComponents,
  DataScienceClusterKindStatus,
  K8sCondition,
} from '#~/k8sTypes';
import { DataScienceStackComponent, StackComponent } from '#~/concepts/areas/types';
import { DataScienceStackComponentMap } from '#~/concepts/areas/const';
import { stackToStatusKey } from '#~/concepts/areas/utils';

export type MockDscStatus = {
  components?: DataScienceClusterKindStatus['components'];
  conditions?: K8sCondition[];
  phase?: string;
  installedComponents?: DataScienceClusterInstalledComponents;
  release?: {
    name: string;
    version: string;
  };
};

export const mockDscStatus = ({
  components = {
    [DataScienceStackComponent.MODEL_REGISTRY]: {
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
      releases: [
        {
          name: 'KServe',
          repoUrl: 'https://github.com/kserve/kserve/',
          version: 'v0.14.0',
        },
      ],
    },
    [DataScienceStackComponent.WORKBENCHES]: {
      workbenchNamespace: 'openshift-ai-notebooks',
    },
  },
  installedComponents = Object.values(StackComponent).reduce(
    (acc, component) => ({ ...acc, [component]: true }),
    {},
  ),
  conditions = [],
  phase = 'Ready',
  release = { name: 'Open Data Hub', version: '2.28.0' },
}: MockDscStatus): DataScienceClusterKindStatus => ({
  components: (() => {
    // Map StackComponent -> DataScienceStackComponent ComponentName keys

    const result = { ...components };
    // Synthesize components managementState from installedComponents for compatibility
    Object.entries(installedComponents).forEach(([stackKey, isInstalled]) => {
      const statusKey = stackToStatusKey[stackKey as StackComponent];
      if (statusKey) {
        const prev = result[statusKey] || {};
        result[statusKey] = {
          managementState: isInstalled ? 'Managed' : 'Removed',
          ...prev,
        };
      }
    });
    return result;
  })(),
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
  phase,
  release,
});

export const dataScienceStackComponentMap = DataScienceStackComponentMap;
