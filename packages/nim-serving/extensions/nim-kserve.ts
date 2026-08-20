import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import type {
  ModelServingDeploy,
  WizardFieldApplyExtension,
  WizardFieldDeploymentFunctionsExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
// eslint-disable-next-line no-restricted-syntax
import { NIM_LEGACY_ID } from '../src/constants';
import type { NIMImageFieldValue } from '../src/pages/deploymentWizard/fields/NIMImageField';
import type { NIMPVCFieldValue } from '../src/pages/deploymentWizard/fields/NIMPVCField';

const nimPVCApplyExtension: WizardFieldApplyExtension<NIMPVCFieldValue, KServeDeployment> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_LEGACY_ID,
    apply: () =>
      import('../src/nimKServe/fields/nimPVCApplyExtract').then((m) => m.applyNIMPVCFieldData),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimPVCExtractorExtension: WizardFieldExtractorExtension<NIMPVCFieldValue, KServeDeployment> =
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    properties: {
      fieldId: 'nim-serving/pvcStorage',
      platform: NIM_LEGACY_ID,
      extract: () =>
        import('../src/nimKServe/fields/nimPVCApplyExtract').then((m) => m.extractNIMPVCFieldData),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  };

const nimPVCDeployFunctionsExtension: WizardFieldDeploymentFunctionsExtension<
  NIMPVCFieldValue,
  KServeDeployment
> = {
  type: 'model-serving.deployment/wizard-field-deployment-functions',
  properties: {
    fieldId: 'nim-serving/pvcStorage',
    platform: NIM_LEGACY_ID,
    preDeploy: () =>
      import('../src/nimKServe/fields/nimPVCDeployFunctions').then((m) => m.nimPVCPreDeploy),
    postDeploy: null,
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimImageApplyExtension: WizardFieldApplyExtension<NIMImageFieldValue, KServeDeployment> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'nim-serving/nimImage',
    platform: NIM_LEGACY_ID,
    apply: () =>
      import('../src/nimKServe/fields/nimImageApplyExtract').then((m) => m.applyNIMImageFieldData),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const extensions: (
  | ModelServingDeploy<KServeDeployment>
  | WizardFieldExtractorExtension<NIMImageFieldValue, KServeDeployment>
  | WizardFieldExtractorExtension<NIMPVCFieldValue, KServeDeployment>
  | WizardFieldApplyExtension<NIMImageFieldValue, KServeDeployment>
  | WizardFieldApplyExtension<NIMPVCFieldValue, KServeDeployment>
  | WizardFieldDeploymentFunctionsExtension<NIMPVCFieldValue, KServeDeployment>
)[] = [
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: NIM_LEGACY_ID,
      isActive: () => import('../src/nimKServe/deploy').then((m) => m.isNIMKServeDeployActive),
      priority: 50,
      supportsOverwrite: true,
      deploy: () => import('../src/nimKServe/deploy').then((m) => m.deployNIMKServeDeployment),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
  nimImageApplyExtension,
  nimPVCApplyExtension,
  nimPVCExtractorExtension,
  nimPVCDeployFunctionsExtension,
];

export default extensions;
