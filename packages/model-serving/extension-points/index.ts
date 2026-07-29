import type { Extension, CodeRef, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type { SortableData, ToggleState, ProjectObjectType } from '@odh-dashboard/ui-core';
import type {
  DisplayNameAnnotations,
  K8sAPIOptions,
  NamespaceApplicationCase,
  ProjectKind,
} from '@odh-dashboard/k8s-core';
import type { ModelServingPodSpecOptionsState } from '@odh-dashboard/internal/concepts/hardwareProfiles/deprecated/useModelServingAcceleratorDeprecatedPodSpecOptionsState';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';

export type DeploymentConditionStatus = 'True' | 'False' | 'Warning' | 'Unknown';

export const toConditionStatus = (status?: string): DeploymentConditionStatus | undefined => {
  if (status === 'True' || status === 'False') {
    return status;
  }
  return status ? 'Unknown' : undefined;
};

export type DeploymentCondition = {
  type: string;
  label: string;
  status?: DeploymentConditionStatus;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  children?: DeploymentCondition[];
};

export type DeploymentStatus = {
  state: ModelDeploymentState;
  message?: string;
  stoppedStates?: ToggleState;
  conditions?: DeploymentCondition[];
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

/**
 * `server` is more of a template / config resource, not a server
 */
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
      priority: number | 0; // larger numbers are higher priority
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
  }
>;
export const isModelServingPlatformExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformExtension<D> => extension.type === 'model-serving.platform';

export type ModelServingPlatformWatchDeployments =
  ResolvedExtension<ModelServingPlatformWatchDeploymentsExtension>;
/**
 * Extension point for a `watch` hook to watch deployments for a given platform.
 *
 * @returns [deployments, loaded, errors]
 * - deployments: the deployments for the given platform
 * - loaded: whether the deployments are loaded (NOTE: loading should resolve to true if an error is encountered)
 * - errors: any errors encountered while loading the deployments
 */
export type ModelServingPlatformWatchDeploymentsExtension<D extends Deployment = Deployment> =
  Extension<
    'model-serving.platform/watch-deployments',
    {
      platform: D['modelServingPlatformId'];
      watch: CodeRef<
        (
          project: ProjectKind,
          labelSelectors?: { [key: string]: string },
          filterFn?: (model: D['model']) => boolean,
          opts?: K8sAPIOptions,
        ) => [D[] | undefined, boolean, Error[] | undefined]
      >;
    }
  >;
export const isModelServingPlatformWatchDeployments = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformWatchDeploymentsExtension<D> =>
  extension.type === 'model-serving.platform/watch-deployments';

export type ExtractionResult<T> = {
  data: T;
  error?: string;
};

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
  'model-serving.platform/delete-deployment',
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
  extension.type === 'model-serving.platform/delete-deployment';

export type ModelServingMetricsExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.metrics',
  {
    platform: D['modelServingPlatformId'];
  }
>;

export const isModelServingMetricsExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingMetricsExtension<D> => extension.type === 'model-serving.metrics';

export type DeployedModelServingDetails<
  D extends Deployment = Deployment,
  Data = unknown,
> = Extension<
  'model-serving.deployed-model/serving-runtime',
  {
    platform: D['modelServingPlatformId'];
    dataHook?: CodeRef<() => Data>;
    ServingDetailsComponent: ComponentCodeRef<{ deployment: D; data?: Data }>;
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

// TODO: remove this once modelmesh and nim are fully supported plugins
// Platform UI override extension points
// These allow platform packages to provide custom UI for the three main model-serving surfaces.

export type ModelServingPlatformProjectDetailsTabExtension<D extends Deployment = Deployment> =
  Extension<
    'model-serving.platform/project-details-tab',
    {
      platform: D['modelServingPlatformId'];
      component: ComponentCodeRef;
    }
  >;
export const isModelServingPlatformProjectDetailsTab = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformProjectDetailsTabExtension<D> =>
  extension.type === 'model-serving.platform/project-details-tab';

export type ModelServingPlatformOverviewSectionExtension<D extends Deployment = Deployment> =
  Extension<
    'model-serving.platform/overview-section',
    {
      platform: D['modelServingPlatformId'];
      component: ComponentCodeRef;
    }
  >;
export const isModelServingPlatformOverviewSection = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformOverviewSectionExtension<D> =>
  extension.type === 'model-serving.platform/overview-section';

export type ModelServingPlatformGlobalModelsPageExtension<D extends Deployment = Deployment> =
  Extension<
    'model-serving.platform/global-models-page',
    {
      platform: D['modelServingPlatformId'];
      component: ComponentCodeRef;
    }
  >;
export const isModelServingPlatformGlobalModelsPage = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingPlatformGlobalModelsPageExtension<D> =>
  extension.type === 'model-serving.platform/global-models-page';

/**
 * Extension point for platforms to declare resources that should be excluded from
 * another platform's deployment listings. This prevents duplicate entries when a
 * platform's operator creates child resources that another platform would also list.
 *
 * `platform` identifies the source platform registering the exclusion.
 * `excludeFromPlatform` identifies which platform should apply this filter.
 * `filter` returns true for resources that belong to this platform and should NOT
 * appear in the target platform's deployment table.
 */
export type ModelServingExcludeDeploymentExtension = Extension<
  'model-serving.platform/exclude-deployment',
  {
    platform: string;
    excludeFromPlatform: string;
    filter: CodeRef<(resource: K8sResourceCommon) => boolean>;
  }
>;
export type ResolvedModelServingExcludeDeployment =
  ResolvedExtension<ModelServingExcludeDeploymentExtension>;
export const isModelServingExcludeDeployment = (
  extension: Extension,
): extension is ModelServingExcludeDeploymentExtension =>
  extension.type === 'model-serving.platform/exclude-deployment';
