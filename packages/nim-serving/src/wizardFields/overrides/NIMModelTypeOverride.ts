import { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type {
  ModelTypeFieldOverride,
  WizardFormData,
} from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';

const isNIMModelTypeActive = (wizardFormData: RecursivePartial<WizardFormData['state']>): boolean =>
  wizardFormData.modelLocationData?.data?.type === NIMModelLocationKey;

export const NIMModelTypeOverride: ModelTypeFieldOverride = {
  id: 'modelType',
  type: 'modifier',
  isActive: isNIMModelTypeActive,
  extraOption: {
    key: 'NVIDIA NIM',
    label: 'NVIDIA NIM',
  },
  forced: true,
};
