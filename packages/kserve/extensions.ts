// eslint-disable-next-line no-restricted-syntax, @odh-dashboard/no-restricted-imports
import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
// eslint-disable-next-line no-restricted-syntax
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
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
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import { DataScienceStackComponent, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { DeploymentMethodFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/DeploymentMethodSelectField';
import type { TimeoutFieldValue } from './src/wizardFields/timeout/TimeoutField';
import type { KServeServingRuntimeFieldType } from './src/wizardFields/servingRuntime/KServeServingRuntimeField';
import type { KServeDeployment } from './src/deployments';

export const KSERVE_ID = 'kserve';

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
  | DeployedModelServingDetails<KServeDeployment>
  | ModelServingStartStopAction<KServeDeployment>
  | ModelServingPlatformFetchDeploymentStatus<KServeDeployment>
  | ModelServingDeploy<KServeDeployment>
  | WizardFieldExtension<KServeServingRuntimeFieldType, KServeDeployment>
  | WizardFieldExtension<WizardField<TimeoutFieldValue, undefined>, KServeDeployment>
  | WizardFieldApplyExtension<TimeoutFieldValue, KServeDeployment>
  | WizardFieldExtractorExtension<TimeoutFieldValue, KServeDeployment>
  | WizardFieldExtractorExtension<DeploymentMethodFieldData, KServeDeployment>
  | DeploymentWizardFieldOverrideExtension<KServeDeployment>
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
      ServingDetailsComponent: () => import('./src/components/deploymentServingDetails'),
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
];

export default extensions;
