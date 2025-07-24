import type { Extension, CodeRef, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { SortableData } from '@odh-dashboard/internal/components/table/types';
import type {
  DisplayNameAnnotations,
  K8sAPIOptions,
  ProjectKind,
} from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/consistent-type-imports
import type { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import type { ModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { ComponentCodeRef } from '../../plugin-core/src/extension-points/types';

export type DeploymentStatus = {
  state: InferenceServiceModelState;
  message?: string;
};

export type DeploymentEndpoint = {
  type: 'internal' | 'external';
  name?: string;
  url: string;
  error?: string;
};

//// Model serving platform extension

export type ServerResourceType = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations &
      Partial<{
        'opendatahub.io/apiProtocol': string;
      }>;
  };
};

export type ModelResourceType = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations;
  };
};

export type Deployment<
  ModelResource extends ModelResourceType = ModelResourceType,
  ServerResource extends ServerResourceType = ServerResourceType,
> = {
  modelServingPlatformId: string;
  model: ModelResource;
  server?: ServerResource;
  status?: DeploymentStatus;
  endpoints?: DeploymentEndpoint[];
  resources?: ModelServingPodSpecOptionsState;
};

export type ModelServingPlatformExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.platform',
  {
    id: D['modelServingPlatformId'];
    manage: {
      namespaceApplicationCase: NamespaceApplicationCase;
      enabledProjectMetadata: {
        annotations?: {
          [key: string]: string;
        };
        labels?: {
          [key: string]: string;
        };
      };
    };
    enableCardText: {
      title: string;
      description: string;
      selectText: string;
      enabledText: string;
      objectType: ProjectObjectType;
    };
    deployedModelsView: {
      startHintTitle: string;
      startHintDescription: string;
      deployButtonText: string;
    };
    // TODO: remove this once modelmesh and nim are fully supported plugins
    backport?: {
      ModelsProjectDetailsTab?: ComponentCodeRef;
      ServeModelsSection?: ComponentCodeRef;
    };
  }
>;
export const isModelServingPlatformExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformExtension<D> => extension.type === 'model-serving.platform';

export type ModelServingPlatformWatchDeployments =
  ResolvedExtension<ModelServingPlatformWatchDeploymentsExtension>;
export type ModelServingPlatformWatchDeploymentsExtension<D extends Deployment = Deployment> =
  Extension<
    'model-serving.platform/watch-deployments',
    {
      platform: D['modelServingPlatformId'];
      watch: CodeRef<
        (
          project: ProjectKind,
          opts?: K8sAPIOptions,
        ) => [D[] | undefined, boolean, Error | undefined]
      >;
    }
  >;
export const isModelServingPlatformWatchDeployments = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformWatchDeploymentsExtension<D> =>
  extension.type === 'model-serving.platform/watch-deployments';

export type ModelServingDeploymentResourcesExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/resources',
  {
    platform: D['modelServingPlatformId'];
    useResources: CodeRef<(deployment: D) => ModelServingPodSpecOptionsState | null>;
  }
>;
export const isModelServingDeploymentResourcesExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentResourcesExtension<D> =>
  extension.type === 'model-serving.deployment/resources';

export type ModelServingAuthExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.auth',
  {
    platform: D['modelServingPlatformId'];
    usePlatformAuthEnabled: CodeRef<(deployment?: D) => boolean>;
  }
>;
export const isModelServingAuthExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingAuthExtension<D> => extension.type === 'model-serving.auth';

// Model serving deployments table extension

export type DeploymentsTableColumn<D extends Deployment = Deployment> = SortableData<D> & {
  cellRenderer: (deployment: D, column: string) => React.ReactNode;
};

export type ModelServingDeploymentsTableExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployments-table',
  {
    platform: D['modelServingPlatformId'];
    columns: CodeRef<() => DeploymentsTableColumn<D>[]>;
  }
>;
export const isModelServingDeploymentsTableExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentsTableExtension<D> =>
  extension.type === 'model-serving.deployments-table';

export type ModelServingDeploymentsExpandedInfo<D extends Deployment = Deployment> = Extension<
  'model-serving.deployments-table/expanded-info',
  {
    platform: D['modelServingPlatformId'];
    useFramework: CodeRef<(deployment: D) => string | null>;
    useReplicas: CodeRef<(deployment: D) => number | null>;
  }
>;
export const isModelServingDeploymentsExpandedInfo = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentsExpandedInfo<D> =>
  extension.type === 'model-serving.deployments-table/expanded-info';

export type ModelServingDeleteModal<D extends Deployment = Deployment> = Extension<
  'model-serving.platform/delete-modal',
  {
    platform: D['modelServingPlatformId'];
    onDelete: CodeRef<(deployment: D) => Promise<void>>;
    title: string;
    submitButtonLabel: string;
  }
>;

export const isModelServingDeleteModal = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeleteModal<D> =>
  extension.type === 'model-serving.platform/delete-modal';

export type ModelServingMetricsExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.metrics',
  {
    platform: D['modelServingPlatformId'];
  }
>;

export const isModelServingMetricsExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingMetricsExtension<D> => extension.type === 'model-serving.metrics';

export type DeployedModelServingDetails<D extends Deployment = Deployment> = Extension<
  'model-serving.deployed-model/serving-runtime',
  {
    platform: D['modelServingPlatformId'];
    ServingDetailsComponent: ComponentCodeRef<{ deployment: D }>;
  }
>;

export const isDeployedModelServingDetails = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is DeployedModelServingDetails<D> =>
  extension.type === 'model-serving.deployed-model/serving-runtime';
