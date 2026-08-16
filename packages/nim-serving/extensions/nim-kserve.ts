import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import type {
  ModelServingDeploy,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
// eslint-disable-next-line no-restricted-syntax
import { NIM_LEGACY_ID } from '../src/constants';
import type { NIMImageFieldValue } from '../src/pages/deploymentWizard/fields/NIMImageField';

const extensions: (
  | ModelServingDeploy<KServeDeployment>
  | WizardFieldExtractorExtension<NIMImageFieldValue, KServeDeployment>
  | WizardFieldApplyExtension<NIMImageFieldValue, KServeDeployment>
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
  {
    type: 'model-serving.deployment/wizard-field-apply',
    properties: {
      fieldId: 'nim-serving/nimImage',
      platform: NIM_LEGACY_ID,
      apply: () =>
        import('../src/nimKServe/fields/nimImageApplyExtract').then(
          (m) => m.applyNIMImageFieldData,
        ),
    },
    flags: {
      required: [SupportedArea.NIM_WIZARD],
    },
  },
];

export default extensions;
