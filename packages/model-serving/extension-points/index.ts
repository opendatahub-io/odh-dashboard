import type { Extension, CodeRef, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { SortableData } from '@odh-dashboard/internal/components/table/types';
import type {
  DisplayNameAnnotations,
  K8sAPIOptions,
  ProjectKind,
  SupportedModelFormats,
} from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/consistent-type-imports
import type { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import type { ModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { ToggleState } from '@odh-dashboard/internal/components/StateActionToggle';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import type { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import type { ModelLocationData } from '../src/components/deploymentWizard/fields/modelLocationFields/types';
import type { UseModelDeploymentWizardState } from '../src/components/deploymentWizard/useDeploymentWizard';

export type DeploymentStatus = {
  state: ModelDeploymentState;
  message?: string;
  stoppedStates?: ToggleState;
};

export type DeploymentEndpoint = {
  type: 'internal' | 'external';
  name?: string;
  description?: string;
  url: string;
  error?: string;
};

//// Model serving platform extension

export type ServerResourceType = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations;
  };
};

export type ModelResourceType = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations &
      Partial<{
        'opendatahub.io/model-type': string;
      }>;
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
  apiProtocol?: string;
  resources?: ModelServingPodSpecOptionsState;
};

export type ModelServingPlatformExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.platform',
  {
    id: D['modelServingPlatformId'];
    manage: {
      namespaceApplicationCase: NamespaceApplicationCase;
      priority?: number; // larger numbers are higher priority
      default?: boolean; // if true, this platform will be the default if no other has priority
      projectRequirements: {
        annotations?: {
          [key: string]: string;
        };
        labels?: {
          [key: string]: string;
        };
      };
      clusterRequirements?: {
        // for NIM mainly. May change in the future. other types of checks can be added here later.
        integrationAppName: string;
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
      GlobalModelsPage?: ComponentCodeRef;
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
          project?: ProjectKind,
          labelSelectors?: { [key: string]: string },
          mrName?: string,
          opts?: K8sAPIOptions,
        ) => [D[] | undefined, boolean, Error | undefined]
      >;
    }
  >;
export const isModelServingPlatformWatchDeployments = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformWatchDeploymentsExtension<D> =>
  extension.type === 'model-serving.platform/watch-deployments';

export type ModelServingDeploymentFormDataExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/form-data',
  {
    platform: D['modelServingPlatformId'];
    extractHardwareProfileConfig: CodeRef<
      (deployment: D) => Parameters<typeof useHardwareProfileConfig> | null
    >;
    extractModelFormat: CodeRef<(deployment: D) => SupportedModelFormats | null>;
    extractReplicas: CodeRef<(deployment: D) => number | null>;
    extractRuntimeArgs: CodeRef<(deployment: D) => { enabled: boolean; args: string[] } | null>;
    extractEnvironmentVariables: CodeRef<
      (deployment: D) => { enabled: boolean; variables: { name: string; value: string }[] } | null
    >;
    extractAiAssetData: CodeRef<
      (deployment: D) => { saveAsAiAsset: boolean; useCase: string } | null
    >;
    extractModelLocationData: CodeRef<
      (deployment: D, connectionTypes: ConnectionTypeConfigMapObj[]) => ModelLocationData | null
    >;
  }
>;
export const isModelServingDeploymentFormDataExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentFormDataExtension<D> =>
  extension.type === 'model-serving.deployment/form-data';

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

export type ModelServingStartStopAction<D extends Deployment = Deployment> = Extension<
  'model-serving.deployments-table/start-stop-action',
  {
    platform: D['modelServingPlatformId'];
    patchDeploymentStoppedStatus: CodeRef<
      (deployment: D, isStopped: boolean) => Promise<D['model']>
    >;
  }
>;

export const isModelServingStartStopAction = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingStartStopAction<D> =>
  extension.type === 'model-serving.deployments-table/start-stop-action';

export type ModelServingPlatformFetchDeploymentStatus<D extends Deployment = Deployment> =
  Extension<
    'model-serving.platform/fetch-deployment-status',
    {
      platform: D['modelServingPlatformId'];
      fetch: CodeRef<(name: string, namespace: string) => Promise<D | null>>;
    }
  >;

export const isModelServingPlatformFetchDeploymentStatus = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformFetchDeploymentStatus<D> =>
  extension.type === 'model-serving.platform/fetch-deployment-status';

export type ModelServingDeploy<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/deploy',
  {
    platform: D['modelServingPlatformId'];
    deploy: CodeRef<
      (
        wizardData: UseModelDeploymentWizardState['state'],
        projectName: string,
        existingDeployment?: D,
        serverResource?: D['server'],
        serverResourceTemplateName?: string,
        dryRun?: boolean,
      ) => Promise<D>
    >;
  }
>;

export const isModelServingDeploy = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploy<D> => extension.type === 'model-serving.deployment/deploy';
