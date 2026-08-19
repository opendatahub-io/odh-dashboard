// eslint-disable-next-line no-restricted-syntax
import type { TemplateKind } from '@odh-dashboard/k8s-core';
// eslint-disable-next-line no-restricted-syntax
import { NamespaceApplicationCase } from '@odh-dashboard/k8s-core';
// eslint-disable-next-line no-restricted-syntax
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import type {
  ModelServingPlatformExtension,
  ModelServingDeleteModal,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingMetricsExtension,
  ModelServingAuthExtension,
  DeployedModelServingDetails,
  ModelServingStartStopAction,
  ModelServingPlatformFetchDeploymentStatus,
} from '@odh-dashboard/model-serving/extension-points';
import type {
  ModelServingDeploymentFormDataExtension,
  ModelServingDeploy,
  WizardFieldExtension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
  DeploymentWizardFieldOverrideExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import type { WizardField } from '@odh-dashboard/model-serving/shared/types/form-data';
import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { DataScienceStackComponent, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { DeploymentMethodFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import type { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import type { TimeoutFieldValue } from './src/wizardFields/timeout/TimeoutField';
import type { KServeServingRuntimeFieldType } from './src/wizardFields/servingRuntime/KServeServingRuntimeField';
import type { KServeDeployment } from './src/types';

export const KSERVE_ID = 'kserve';
const ADMIN_USER = 'ADMIN_USER';

// Duplicated from src/settings/servingRuntimeTemplates/paths.ts — extensions.ts
// may not import runtime values from src (no-restricted-syntax). Kept in sync by
// extensions/__tests__/extensions.spec.ts.
const SERVING_RUNTIME_TEMPLATES_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates';

// Base path of the former standalone serving runtimes page, and the legacy v2
// bookmark base — kept only as redirect sources to the tab above (the standalone
// page itself has been removed).
const SERVING_RUNTIMES_STANDALONE_PATH = '/settings/model-resources-operations/serving-runtimes';
const SERVING_RUNTIMES_V2_PATH = '/servingRuntimes';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/plugin-core/routing').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

const kserveServingRuntimeFieldExtension: WizardFieldExtension<
  KServeServingRuntimeFieldType,
  KServeDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: KSERVE_ID,
    field: () =>
      import('./src/wizardFields/servingRuntime/KServeServingRuntimeField').then(
        (m) => m.KServeServingRuntimeFieldWizardField,
      ),
  },
  flags: {
    required: [SupportedArea.K_SERVE],
  },
};

const kserveTimeoutFieldExtension: WizardFieldExtension<
  WizardField<TimeoutFieldValue, undefined>,
  KServeDeployment
> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    platform: KSERVE_ID,
    field: () =>
      import('./src/wizardFields/timeout/TimeoutField').then((m) => m.TimeoutFieldWizardField),
  },
  flags: {
    required: [SupportedArea.K_SERVE],
  },
};

const timeoutExtractorExtension: WizardFieldExtractorExtension<
  TimeoutFieldValue,
  KServeDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'kserve/timeout',
    platform: KSERVE_ID,
    extract: () =>
      import('./src/wizardFields/timeout/timeoutApplyExtract').then(
        (m) => m.extractTimeoutFieldData,
      ),
  },
  flags: {
    required: [SupportedArea.K_SERVE],
  },
};

const deploymentMethodExtractorExtension: WizardFieldExtractorExtension<
  DeploymentMethodFieldData,
  KServeDeployment
> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'deploymentMethod',
    platform: KSERVE_ID,
    extract: () => import('./src/deployUtils').then((m) => m.extractDeploymentMethod),
  },
  flags: {
    required: [SupportedArea.K_SERVE],
  },
};

const extensions: (
  | AreaExtension
  | ModelServingPlatformExtension<KServeDeployment>
  | ModelServingPlatformWatchDeploymentsExtension<KServeDeployment>
  | ModelServingDeploymentFormDataExtension<KServeDeployment>
  | ModelServingAuthExtension<KServeDeployment>
  | ModelServingDeleteModal<KServeDeployment>
  | ModelServingMetricsExtension<KServeDeployment>
  | DeployedModelServingDetails<KServeDeployment, FetchStateObject<TemplateKind[]>>
  | ModelServingStartStopAction<KServeDeployment>
  | ModelServingPlatformFetchDeploymentStatus<KServeDeployment>
  | ModelServingDeploy<KServeDeployment>
  | WizardFieldExtension<KServeServingRuntimeFieldType, KServeDeployment>
  | WizardFieldExtension<WizardField<TimeoutFieldValue, undefined>, KServeDeployment>
  | WizardFieldApplyExtension<TimeoutFieldValue, KServeDeployment>
  | WizardFieldExtractorExtension<TimeoutFieldValue, KServeDeployment>
  | WizardFieldExtractorExtension<DeploymentMethodFieldData, KServeDeployment>
  | DeploymentWizardFieldOverrideExtension<KServeDeployment>
  | TabRouteTabExtension
  | RouteExtension
)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.K_SERVE,
      featureFlags: ['disableKServe'],
      requiredComponents: [DataScienceStackComponent.K_SERVE],
      reliantAreas: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'model-serving.platform',
    properties: {
      id: KSERVE_ID,
      manage: {
        namespaceApplicationCase: NamespaceApplicationCase.KSERVE_PROMOTION,
        priority: 0,
        default: true,
        projectRequirements: {
          labels: {
            'modelmesh-enabled': 'false',
          },
        },
      },
      enableCardText: {
        title: 'Enable model serving',
        description:
          'Enable users to serve models using the single-model serving platform which deploys each model on its own dedicated model server. ',
        selectText: 'Select single-model',
        enabledText: 'Single-model serving enabled',
        objectType: ProjectObjectType.singleModel,
      },
      deployedModelsView: {
        startHintTitle: 'Start by deploying a model',
        startHintDescription: 'Each model is deployed on its own model server',
        deployButtonText: 'Deploy model',
      },
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: KSERVE_ID,
      watch: () => import('./src/deployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'model-serving.platform/delete-deployment',
    properties: {
      platform: KSERVE_ID,
      onDelete: () => import('./src/deployments').then((m) => m.deleteDeployment),
      title: 'Delete model deployment?',
      submitButtonLabel: 'Delete model deployment',
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'model-serving.metrics',
    properties: {
      platform: KSERVE_ID,
    },
    flags: {
      required: [SupportedArea.K_SERVE, SupportedArea.K_SERVE_METRICS],
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: KSERVE_ID,
      dataHook: () =>
        import('./src/components/deploymentServingDetails').then((m) => m.useServingDetailsData),
      ServingDetailsComponent: () =>
        import('./src/components/deploymentServingDetails').then((m) => ({
          default: m.default,
        })),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'model-serving.deployments-table/start-stop-action',
    properties: {
      platform: KSERVE_ID,
      patchDeploymentStoppedStatus: () =>
        import('./src/deploymentStatus').then((m) => m.patchDeploymentStoppedStatus),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'model-serving.platform/fetch-deployment-status',
    properties: {
      platform: KSERVE_ID,
      fetch: () => import('./src/deployments').then((m) => m.fetchDeploymentStatus),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: KSERVE_ID,
      extractHardwareProfileConfig: () =>
        import('./src/hardware').then((m) => (deployment) => ({
          data: m.extractHardwareProfileConfig(deployment),
        })),
      extractModelType: () => import('./src/deployUtils').then((m) => m.extractModelType),
      extractModelFormat: () => import('./src/modelFormat').then((m) => m.extractKServeModelFormat),
      extractReplicas: () =>
        import('./src/hardware').then((m) => (deployment) => ({
          data: m.extractReplicas(deployment),
        })),
      extractRuntimeArgs: () => import('./src/hardware').then((m) => m.extractRuntimeArgs),
      extractEnvironmentVariables: () =>
        import('./src/hardware').then((m) => m.extractEnvironmentVariables),
      extractModelAvailabilityData: () =>
        import('./src/aiAssets').then((m) => m.extractModelAvailabilityData),
      extractModelLocationData: () =>
        import('./src/modelLocationData').then((m) => m.extractKServeModelLocationData),
      extractDeploymentStrategy: () =>
        import('./src/deployUtils').then((m) => m.extractDeploymentStrategy),
      extractModelServerTemplate: () =>
        import('./src/deployServer').then((m) => m.extractModelServerTemplate),
      hardwareProfilePaths: () =>
        import('./src/hardware').then((m) => m.INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: KSERVE_ID,
      isActive: true,
      priority: 0,
      supportsOverwrite: true,
      deploy: () => import('./src/deploy').then((m) => m.deployKServeDeployment),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  kserveServingRuntimeFieldExtension,
  kserveTimeoutFieldExtension,
  {
    type: 'model-serving.deployment/wizard-field-apply',
    properties: {
      fieldId: 'kserve/timeout',
      platform: KSERVE_ID,
      apply: () =>
        import('./src/wizardFields/timeout/timeoutApplyExtract').then(
          (m) => m.applyTimeoutFieldData,
        ),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  timeoutExtractorExtension,
  deploymentMethodExtractorExtension,
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: KSERVE_ID,
      field: () =>
        import('./src/wizardFields/deploymentStrategy').then(
          (m) => m.kserveDeploymentStrategyOverride,
        ),
    },
    flags: {
      required: [KSERVE_ID],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: KSERVE_ID,
      field: () =>
        import('./src/wizardFields/deploymentMethodField').then(
          (m) => m.legacyDeploymentMethodOverride,
        ),
    },
    flags: {
      required: [SupportedArea.K_SERVE],
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.CUSTOM_RUNTIMES, ADMIN_USER],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'serving-runtime-templates',
      title: 'Serving runtime templates',
      component: () =>
        import('./src/settings/servingRuntimeTemplates/ServingRuntimeTemplatesTabRoutes'),
      group: '2_serving-runtimes',
    },
  },
  // Full-page breakout routes for the serving runtime add/edit/duplicate forms,
  // gated identically to the tab so they only exist when the tab does.
  ...(
    [
      `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/add`,
      `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/edit/:servingRuntimeName`,
      `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/duplicate/:servingRuntimeName`,
    ] as const
  ).map(
    (path): RouteExtension => ({
      type: 'app.route',
      flags: {
        required: [SupportedArea.CUSTOM_RUNTIMES, ADMIN_USER],
      },
      properties: {
        path,
        component: () =>
          import('./src/settings/servingRuntimeTemplates/ServingRuntimeTemplatesFormRoutes'),
      },
    }),
  ),
  // Redirect the former standalone serving runtimes URL and the legacy v2 bookmark
  // URLs to the tab. The general wildcard redirects splice the tail onto the tab
  // base path; the two specific v2 aliases need dedicated routes (more specific, so
  // they win) because the old URL segment names (addServingRuntime /
  // editServingRuntime) differ from the tab's (add / edit). The edit alias uses the
  // /* wildcard form so buildV2RedirectElement preserves the captured runtime name;
  // an absolute non-wildcard `to` would resolve to a fixed AbsoluteRedirect and drop
  // the param.
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.CUSTOM_RUNTIMES, ADMIN_USER],
    },
    properties: {
      path: `${SERVING_RUNTIMES_STANDALONE_PATH}/*`,
      component: createRedirectComponent({
        from: `${SERVING_RUNTIMES_STANDALONE_PATH}/*`,
        to: `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.CUSTOM_RUNTIMES, ADMIN_USER],
    },
    properties: {
      path: `${SERVING_RUNTIMES_V2_PATH}/*`,
      component: createRedirectComponent({
        from: `${SERVING_RUNTIMES_V2_PATH}/*`,
        to: `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.CUSTOM_RUNTIMES, ADMIN_USER],
    },
    properties: {
      path: `${SERVING_RUNTIMES_V2_PATH}/addServingRuntime`,
      component: createRedirectComponent({
        from: `${SERVING_RUNTIMES_V2_PATH}/addServingRuntime`,
        to: `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/add`,
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.CUSTOM_RUNTIMES, ADMIN_USER],
    },
    properties: {
      path: `${SERVING_RUNTIMES_V2_PATH}/editServingRuntime/*`,
      component: createRedirectComponent({
        from: `${SERVING_RUNTIMES_V2_PATH}/editServingRuntime/*`,
        to: `${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/edit/*`,
      }),
    },
  },
];

export default extensions;
