import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import type {
  DeployedModelServingDetails,
  ModelServingAuthExtension,
  ModelServingExcludeDeploymentExtension,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingStartStopAction,
} from '@odh-dashboard/model-serving/extension-points';
import type {
  AssembleModelResourceExtension,
  ModelServingDeploy,
  ModelServingDeploymentFormDataExtension,
  WizardFieldApplyExtension,
  WizardFieldDeploymentFunctionsExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
// Allow this import as it consists of types and enums only.
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { NIMDeployment } from '../src/api/deployments/useWatchDeployments';
import type { NIMImageFieldValue } from '../src/pages/deploymentWizard/fields/NIMImageField';
import type { NIMPVCFieldValue } from '../src/pages/deploymentWizard/fields/NIMPVCField';
// Allow this import as it consists of constants only.
// eslint-disable-next-line no-restricted-syntax
import { NIM_SERVICE_ID } from '../src/constants';

const nimImageApplyExtension: WizardFieldApplyExtension<NIMImageFieldValue, NIMDeployment> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'nim-serving/nimImage',
    platform: NIM_SERVICE_ID,
    apply: () =>
      import('../src/pages/deploymentWizard/fields/nimImageApplyExtract').then(
        (m) => m.applyNIMImageFieldData,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_SERVICE_OPERATOR],
  },
};

const nimImageExtractorExtension: WizardFieldExtractorExtension<NIMImageFieldValue, NIMDeployment> =
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    properties: {
      fieldId: 'nim-serving/nimImage',
      platform: NIM_SERVICE_ID,
      extract: () =>
        import('../src/pages/deploymentWizard/fields/nimImageApplyExtract').then(
          (m) => m.extractNIMImageFieldData,
        ),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  };

const nimPVCApplyExtension: WizardFieldApplyExtension<NIMPVCFieldValue, NIMDeployment> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_SERVICE_ID,
    apply: () =>
      import('../src/pages/deploymentWizard/fields/nimPVCApplyExtract').then(
        (m) => m.applyNIMPVCFieldData,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_SERVICE_OPERATOR],
  },
};

const nimPVCExtractorExtension: WizardFieldExtractorExtension<NIMPVCFieldValue, NIMDeployment> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_SERVICE_ID,
    extract: () =>
      import('../src/pages/deploymentWizard/fields/nimPVCApplyExtract').then(
        (m) => m.extractNIMPVCFieldData,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_SERVICE_OPERATOR],
  },
};

const nimPVCDeployFunctionsExtension: WizardFieldDeploymentFunctionsExtension<
  NIMPVCFieldValue,
  NIMDeployment
> = {
  type: 'model-serving.deployment/wizard-field-deployment-functions',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_SERVICE_ID,
    preDeploy: () =>
      import('../src/pages/deploymentWizard/fields/nimPVCDeployFunctions').then(
        (m) => m.nimPVCPreDeploy,
      ),
    postDeploy: () =>
      import('../src/pages/deploymentWizard/fields/nimPVCDeployFunctions').then(
        (m) => m.nimPVCPostDeploy,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_SERVICE_OPERATOR],
  },
};

/**
 * Everything backed by the k8s-nim-operator NIMService resource: watching,
 * deploying, assembling, auth, start/stop, serving details, and the wizard
 * field apply/extract/deploy functions that read and write NIMService data.
 */
const extensions: (
  | AreaExtension
  | ModelServingPlatformWatchDeploymentsExtension<NIMDeployment>
  | DeployedModelServingDetails<NIMDeployment>
  | ModelServingExcludeDeploymentExtension
  | ModelServingStartStopAction<NIMDeployment>
  | ModelServingAuthExtension<NIMDeployment>
  | ModelServingDeploy<NIMDeployment>
  | AssembleModelResourceExtension<NIMDeployment>
  | ModelServingDeploymentFormDataExtension<NIMDeployment>
  | WizardFieldDeploymentFunctionsExtension<NIMPVCFieldValue, NIMDeployment>
  | WizardFieldApplyExtension<NIMImageFieldValue, NIMDeployment>
  | WizardFieldApplyExtension<NIMPVCFieldValue, NIMDeployment>
  | WizardFieldExtractorExtension<NIMImageFieldValue, NIMDeployment>
  | WizardFieldExtractorExtension<NIMPVCFieldValue, NIMDeployment>
)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.NIM_SERVICE_OPERATOR,
      featureFlags: ['nimServiceOperator'],
      reliantAreas: [SupportedArea.NIM_MODEL],
    },
  },
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: NIM_SERVICE_ID,
      watch: () =>
        import('../src/api/deployments/useWatchDeployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  },
  {
    type: 'model-serving.deployed-model/serving-runtime',
    properties: {
      platform: NIM_SERVICE_ID,
      ServingDetailsComponent: () => import('../src/pages/deployments/NIMServingDetails'),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  },
  {
    type: 'model-serving.platform/exclude-deployment',
    properties: {
      platform: NIM_SERVICE_ID,
      excludeFromPlatform: 'kserve',
      filter: () => import('../src/nimOwnership').then((m) => m.isNIMOwned),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  },
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: NIM_SERVICE_ID,
      isActive: () => import('../src/api/deployments/deploy').then((m) => m.isNIMDeployActive),
      priority: 100,
      supportsOverwrite: true,
      deploy: () => import('../src/api/deployments/deploy').then((m) => m.deployNIMDeployment),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  },
  {
    type: 'model-serving.deployment/assemble-model-resource',
    properties: {
      platform: NIM_SERVICE_ID,
      isActive: () => import('../src/api/deployments/deploy').then((m) => m.isNIMDeployActive),
      priority: 100,
      assemble: () => import('../src/api/deployments/deploy').then((m) => m.assembleNIMDeployment),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: NIM_SERVICE_ID,
      isActive: true,
      priority: 0,
      hardwareProfilePaths: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.NIM_SERVICE_HARDWARE_PROFILE_PATHS,
        ),
      extractHardwareProfileConfig: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMHardwareProfileConfig,
        ),
      extractReplicas: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMReplicas,
        ),
      extractRuntimeArgs: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMRuntimeArgs,
        ),
      extractEnvironmentVariables: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMEnvironmentVariables,
        ),
      extractModelAvailabilityData: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelAvailabilityData,
        ),
      extractModelLocationData: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelLocationData,
        ),
      extractModelType: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelType,
        ),
      extractModelServerTemplate: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then(
          (m) => m.extractNIMModelServerTemplate,
        ),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  },
  {
    type: 'model-serving.auth',
    properties: {
      platform: NIM_SERVICE_ID,
      usePlatformAuthEnabled: () =>
        import('../src/pages/deploymentWizard/extractNIMFormData').then((m) => m.isNIMAuthEnabled),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
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
      platform: NIM_SERVICE_ID,
      patchDeploymentStoppedStatus: () =>
        import('../src/api/deployments/status').then((m) => m.patchDeploymentStoppedStatus),
    },
    flags: {
      required: [SupportedArea.NIM_SERVICE_OPERATOR],
    },
  },
];

export default extensions;
