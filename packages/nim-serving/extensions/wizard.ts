import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import type {
  DeploymentWizardFieldOverrideExtension,
  WizardFieldExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
// Allow this import as it consists of types and enums only.
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { NIMImageFieldType } from '../src/pages/deploymentWizard/fields/NIMImageField';
import type { NIMPVCFieldType } from '../src/pages/deploymentWizard/fields/NIMPVCField';

const nimImageFieldExtension: WizardFieldExtension<NIMImageFieldType> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    field: () =>
      import('../src/pages/deploymentWizard/fields/NIMImageField').then(
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
      import('../src/pages/deploymentWizard/fields/NIMPVCField').then(
        (m) => m.NIMPVCFieldWizardField,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

const nimModelTypeOverride: DeploymentWizardFieldOverrideExtension = {
  type: 'model-serving.deployment/wizard-field-override',
  properties: {
    platform: 'nim-wizard',
    field: () =>
      import('../src/wizardFields/overrides/NIMModelTypeOverride').then(
        (m) => m.NIMModelTypeOverride,
      ),
  },
  flags: {
    required: [SupportedArea.NIM_WIZARD],
  },
};

/**
 * The NIM-specific fields rendered inside the model deployment wizard.
 */
const extensions: (
  | AreaExtension
  | DeploymentWizardFieldOverrideExtension
  | WizardFieldExtension<NIMImageFieldType>
  | WizardFieldExtension<NIMPVCFieldType>
)[] = [
  {
    type: 'app.area',
    properties: {
      id: SupportedArea.NIM_WIZARD,
      featureFlags: ['nimWizard'],
      reliantAreas: [SupportedArea.NIM_MODEL],
    },
  },
  nimModelTypeOverride,
  nimImageFieldExtension,
  nimPVCFieldExtension,
];

export default extensions;
