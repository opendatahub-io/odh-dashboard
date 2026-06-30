import type {
  AreaExtension,
  ProjectDetailsSettingsCardExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import type {
  DeployedModelServingDetails,
  ModelServingAuthExtension,
  ModelServingExcludeDeploymentExtension,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingStartStopAction,
} from '@odh-dashboard/model-serving/extension-points';
import type {
  AssembleModelResourceExtension,
  DeploymentWizardFieldOverrideExtension,
  ModelServingDeploy,
  ModelServingDeploymentFormDataExtension,
  WizardFieldApplyExtension,
  WizardFieldDeploymentFunctionsExtension,
  WizardFieldExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
// Allow this import as it consists of types and enums only.
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { NIMDeployment } from './src/api/deployments/useWatchDeployments';
import type {
  NIMImageFieldType,
  NIMImageFieldValue,
} from './src/pages/deploymentWizard/fields/NIMImageField';
import type {
  NIMPVCFieldType,
  NIMPVCFieldValue,
} from './src/pages/deploymentWizard/fields/NIMPVCField';

export const NIM_ID = 'nvidia-nim';
export const NIM_MODEL_TYPE = 'NVIDIA NIM';

const nimImageFieldExtension: WizardFieldExtension<NIMImageFieldType> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    field: () =>
      import('./src/pages/deploymentWizard/fields/NIMImageField').then(
        (m) => m.NIMImageFieldWizardField,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimPVCFieldExtension: WizardFieldExtension<NIMPVCFieldType> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    field: () =>
      import('./src/pages/deploymentWizard/fields/NIMPVCField').then(
        (m) => m.NIMPVCFieldWizardField,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimImageApplyExtension: WizardFieldApplyExtension<NIMImageFieldValue, NIMDeployment> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'nim-serving/nimImage',
    platform: NIM_ID,
    apply: () =>
      import('./src/pages/deploymentWizard/fields/nimImageApplyExtract').then(
        (m) => m.applyNIMImageFieldData,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimImageExtractorExtension: WizardFieldExtractorExtension<NIMImageFieldValue, NIMDeployment> =
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    properties: {
      fieldId: 'nim-serving/nimImage',
      platform: NIM_ID,
      extract: () =>
        import('./src/pages/deploymentWizard/fields/nimImageApplyExtract').then(
          (m) => m.extractNIMImageFieldData,
        ),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  };

const nimPVCApplyExtension: WizardFieldApplyExtension<NIMPVCFieldValue, NIMDeployment> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_ID,
    apply: () =>
      import('./src/pages/deploymentWizard/fields/nimPVCApplyExtract').then(
        (m) => m.applyNIMPVCFieldData,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimPVCExtractorExtension: WizardFieldExtractorExtension<NIMPVCFieldValue, NIMDeployment> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_ID,
    extract: () =>
      import('./src/pages/deploymentWizard/fields/nimPVCApplyExtract').then(
        (m) => m.extractNIMPVCFieldData,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimPVCDeployFunctionsExtension: WizardFieldDeploymentFunctionsExtension<
  NIMPVCFieldValue,
  NIMDeployment
> = {
  type: 'model-serving.deployment/wizard-field-deployment-functions',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_ID,
    preDeploy: () =>
      import('./src/pages/deploymentWizard/fields/nimPVCDeployFunctions').then(
        (m) => m.nimPVCPreDeploy,
      ),
    postDeploy: () =>
      import('./src/pages/deploymentWizard/fields/nimPVCDeployFunctions').then(
        (m) => m.nimPVCPostDeploy,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const extensions: (
  | AreaExtension
  | ProjectDetailsSettingsCardExtension
  | ModelServingPlatformWatchDeploymentsExtension<NIMDeployment>
  | DeployedModelServingDetails<NIMDeployment>
  | ModelServingExcludeDeploymentExtension
  | ModelServingStartStopAction<NIMDeployment>
  | ModelServingAuthExtension<NIMDeployment>
  | ModelServingDeploy<NIMDeployment>
  | AssembleModelResourceExtension<NIMDeployment>
  | DeploymentWizardFieldOverrideExtension
  | ModelServingDeploymentFormDataExtension<NIMDeployment>
  | WizardFieldDeploymentFunctionsExtension<NIMPVCFieldValue, NIMDeployment>
  | WizardFieldExtension<NIMImageFieldType>
  | WizardFieldExtension<NIMPVCFieldType>
  | WizardFieldApplyExtension<NIMImageFieldValue, NIMDeployment>
  | WizardFieldApplyExtension<NIMPVCFieldValue, NIMDeployment>
  | WizardFieldExtractorExtension<NIMImageFieldValue, NIMDeployment>
  | WizardFieldExtractorExtension<NIMPVCFieldValue, NIMDeployment>
)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.NIM_WIZARD,
      featureFlags: ['nimWizard'],
      reliantAreas: [SupportedArea.NIM_MODEL],
    },
  },
  {
    type: 'app.project-details/settings-card',
    properties: {
      id: 'nim-settings',
      title: 'NVIDIA NIM',
      component: () => import('./src/pages/projectSettings/NIMSettingsCard'),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: NIM_ID,
      watch: () =>
        import('./src/api/deployments/useWatchDeployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: NIM_ID,
      ServingDetailsComponent: () => import('./src/pages/deployments/NIMServingDetails'),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.platform/exclude-deployment',
    properties: {
      platform: NIM_ID,
      excludeFromPlatform: 'kserve',
      filter: () => import('./src/nimOwnership').then((m) => m.isNIMOwned),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-override',
    properties: {
      platform: 'nim-wizard',
      field: () =>
        import('./src/wizardFields/overrides/NIMModelTypeOverride').then(
          (m) => m.NIMModelTypeOverride,
        ),
    },
  },
  nimImageFieldExtension,
  nimPVCFieldExtension,
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: NIM_ID,
      isActive: () => import('./src/api/deployments/deploy').then((m) => m.isNIMDeployActive),
      priority: 100,
      supportsOverwrite: true,
      deploy: () => import('./src/api/deployments/deploy').then((m) => m.deployNIMDeployment),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.deployment/assemble-model-resource',
    properties: {
      platform: NIM_ID,
      isActive: () => import('./src/api/deployments/deploy').then((m) => m.isNIMDeployActive),
      priority: 100,
      assemble: () => import('./src/api/deployments/deploy').then((m) => m.assembleNIMDeployment),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: NIM_ID,
      hardwareProfilePaths: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.NIM_SERVICE_HARDWARE_PROFILE_PATHS,
        ),
      extractHardwareProfileConfig: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMHardwareProfileConfig,
        ),
      extractReplicas: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then((m) => m.extractNIMReplicas),
      extractRuntimeArgs: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMRuntimeArgs,
        ),
      extractEnvironmentVariables: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMEnvironmentVariables,
        ),
      extractModelAvailabilityData: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelAvailabilityData,
        ),
      extractModelLocationData: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelLocationData,
        ),
      extractModelType: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelType,
        ),
      extractModelServerTemplate: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelServerTemplate,
        ),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  {
    type: 'model-serving.auth',
    properties: {
      platform: NIM_ID,
      usePlatformAuthEnabled: () =>
        import('./src/pages/deploymentWizard/extractNIMFormData').then((m) => m.isNIMAuthEnabled),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  nimImageApplyExtension,
  nimImageExtractorExtension,
  nimPVCApplyExtension,
  nimPVCExtractorExtension,
  nimPVCDeployFunctionsExtension,
  {
    type: 'model-serving.deployments-table/start-stop-action',
    properties: {
      platform: NIM_ID,
      patchDeploymentStoppedStatus: () =>
        import('./src/api/deployments/status').then((m) => m.patchDeploymentStoppedStatus),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
];

export default extensions;
