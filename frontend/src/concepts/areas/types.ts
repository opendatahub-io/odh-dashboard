import { EitherOrBoth } from '~/typeHelpers';
import {
  DashboardCommonConfig,
  DashboardConfigKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
} from '~/k8sTypes';

export type FeatureFlag = keyof DashboardCommonConfig;

export type IsAreaAvailableStatus = {
  /** A single boolean status */
  status: boolean;
  /* Each status portion broken down -- null if no check made */
  featureFlags: { [key in FeatureFlag]?: 'on' | 'off' } | null; // simplified. `disableX` flags are weird to read
  reliantAreas: { [key in SupportedArea]?: boolean } | null; // only needs 1 to be true
  requiredComponents: { [key in StackComponent]?: boolean } | null;
  requiredCapabilities: { [key in StackCapability]?: boolean } | null;
  customCondition: (conditionFunc: CustomConditionFunction) => boolean;
};

/** All areas that we need to support in some fashion or another */
export enum SupportedArea {
  HOME = 'home',

  /* Standalone areas */
  // TODO: Jupyter Tile Support? (outside of feature flags today)
  WORKBENCHES = 'workbenches',
  // TODO: Support Applications/Tile area
  // TODO: Support resources area

  /* Pipelines areas */
  DS_PIPELINES = 'ds-pipelines',
  PIPELINE_EXPERIMENTS = 'pipeline-experiments',

  /* Admin areas */
  BYON = 'bring-your-own-notebook',
  CLUSTER_SETTINGS = 'cluster-settings',
  USER_MANAGEMENT = 'user-management',
  ACCELERATOR_PROFILES = 'accelerator-profiles',
  CONNECTION_TYPES = 'connections-types',

  /* DS Projects specific areas */
  DS_PROJECTS_PERMISSIONS = 'ds-projects-permission',
  DS_PROJECTS_VIEW = 'ds-projects',

  /* Model Serving areas */
  MODEL_SERVING = 'model-serving-shell',
  CUSTOM_RUNTIMES = 'custom-serving-runtimes',
  K_SERVE = 'kserve',
  K_SERVE_AUTH = 'kserve-auth',
  K_SERVE_METRICS = 'kserve-metrics',
  MODEL_MESH = 'model-mesh',
  BIAS_METRICS = 'bias-metrics',
  PERFORMANCE_METRICS = 'performance-metrics',
  TRUSTY_AI = 'trusty-ai',

  /* Distributed Workloads areas */
  DISTRIBUTED_WORKLOADS = 'distributed-workloads',

  /* Model Registry areas */
  MODEL_REGISTRY = 'model-registry',
}

/** Components deployed by the Operator. Part of the DSC Status. */
export enum StackComponent {
  CODE_FLARE = 'codeflare',
  DS_PIPELINES = 'data-science-pipelines-operator',
  K_SERVE = 'kserve',
  MODEL_MESH = 'model-mesh',
  // Bug: https://github.com/opendatahub-io/opendatahub-operator/issues/641
  DASHBOARD = 'odh-dashboard',
  RAY = 'ray',
  WORKBENCHES = 'workbenches',
  TRUSTY_AI = 'trustyai',
  KUEUE = 'kueue',
  MODEL_REGISTRY = 'model-registry-operator',
}

/** Capabilities of the Operator. Part of the DSCI Status. */
export enum StackCapability {
  SERVICE_MESH = 'CapabilityServiceMesh',
  SERVICE_MESH_AUTHZ = 'CapabilityServiceMeshAuthorization',
}

/**
 * Optional function to check for a condition that is not covered by other checks.
 *
 * Example, checking there exists a specific condition in the DSC status.
 *
 * @param state.dashboardConfigSpec The dashboard config spec
 * @param state.dscStatus The data science cluster status
 * @param state.dsciStatus The data science cluster initialization status
 * @returns True if the condition is met, false otherwise
 */
export type CustomConditionFunction = (state: {
  dashboardConfigSpec: DashboardConfigKind['spec'];
  dscStatus: DataScienceClusterKindStatus | null;
  dsciStatus: DataScienceClusterInitializationKindStatus | null;
}) => boolean;

// TODO: Support extra operators, like the pipelines operator -- maybe as a "external dependency need?"
type SupportedComponentFlagValue = {
  /**
   * An area can be reliant on another area being enabled. The list is "OR"-ed together.
   *
   * Example, Model Serving is a shell for either KServe or ModelMesh. It has no value on its own.
   * It can also be a chain of reliance... example, Custom Runtimes is a Model Serving feature.
   *
   * TODO: support AND -- maybe double array?
   */
  reliantAreas?: SupportedArea[];
  /**
   * Required capabilities supported by the Operator. The list is "AND"-ed together.
   * If the Operator does not support the capability, the area is not available.
   * The capabilities are retrieved from the DSCI status.
   */
  requiredCapabilities?: StackCapability[];
} & EitherOrBoth<
  {
    /**
     * Refers to OdhDashboardConfig's feature flags, any number of them to be "enabled", the result
     * is AND-ed. Omit to not be related to any feature flag.
     *
     * Note: "disable<FlagName>" methodology is confusing and needs to be removed
     * Note: "Enabled" will mean "disable<FlagName>" is false
     * @see https://github.com/opendatahub-io/odh-dashboard/issues/1108
     */
    featureFlags: FeatureFlag[];
  },
  {
    /**
     * Refers to the related stack component names. If a backend component is not installed, this
     * can prevent the feature flag from enabling the item. Omit to not be reliant on a backend
     * component.
     */
    requiredComponents: StackComponent[];
  }
>;

/**
 * Relationships between areas and the state of the cluster.
 */
export type SupportedAreasState = {
  [key in SupportedArea]: SupportedComponentFlagValue;
};
