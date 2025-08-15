import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { SortableData } from '@odh-dashboard/internal/components/table/types';
import type {
  DisplayNameAnnotations,
  K8sAPIOptions,
  ProjectKind,
} from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/consistent-type-imports
import { InferenceServiceModelState } from '@odh-dashboard/internal/pages/modelServing/screens/types';

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
    annotations?: DisplayNameAnnotations &
      Partial<{
        'opendatahub.io/apiProtocol': string;
      }>;
  };
};

export type ModelResourceType = K8sResourceCommon & {
  metadata: {
    name: string;
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
};

export type ModelServingPlatformExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.platform',
  {
    id: string;
    manage: {
      namespaceApplicationCase: NamespaceApplicationCase;
      enabledLabel: string;
      enabledLabelValue: string;
    };
    deployments: {
      watch: CodeRef<
        (
          project: ProjectKind,
          opts?: K8sAPIOptions,
        ) => [D[] | undefined, boolean, Error | undefined]
      >;
    };
    enableCardText: {
      title: string;
      description: string;
      selectText: string;
      enabledText: string;
    };
    deployedModelsView: {
      startHintTitle: string;
      startHintDescription: string;
      deployButtonText: string;
    };
  }
>;
export const isModelServingPlatformExtension = (
  extension: Extension,
): extension is ModelServingPlatformExtension => extension.type === 'model-serving.platform';

// Model serving deployments table extension

export type DeploymentsTableColumn<D extends Deployment = Deployment> = SortableData<D> & {
  cellRenderer: (deployment: D, column: string) => string;
};

export type ModelServingDeploymentsTableExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployments-table',
  {
    platform: string;
    columns: CodeRef<() => DeploymentsTableColumn<D>[]>;
  }
>;
export const isModelServingDeploymentsTableExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentsTableExtension<D> =>
  extension.type === 'model-serving.deployments-table';

export type ModelServingDeleteModal<D extends Deployment = Deployment> = Extension<
  'model-serving.platform/delete-modal',
  {
    platform: string;
    onDelete: CodeRef<(deployment: D) => Promise<void>>;
    title: string;
    submitButtonLabel: string;
  }
>;

export const isModelServingDeleteModal = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeleteModal<D> =>
  extension.type === 'model-serving.platform/delete-modal';
