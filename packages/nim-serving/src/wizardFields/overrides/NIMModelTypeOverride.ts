import type { RecursivePartial } from '@odh-dashboard/foundation';
import type {
  ModelTypeFieldOverride,
  WizardFormData,
} from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';
import { NIM_MODEL_TYPE } from '../../../extensions';

const isNIMModelTypeActive = (wizardFormData: RecursivePartial<WizardFormData['state']>): boolean =>
  wizardFormData.modelLocationData?.data?.type === NIMModelLocationKey;

export const NIMModelTypeOverride: ModelTypeFieldOverride = {
  id: 'modelType',
  type: 'modifier',
  isActive: isNIMModelTypeActive,
  extraOption: {
    key: NIM_MODEL_TYPE,
    label: NIM_MODEL_TYPE,
  },
  forced: true,
};
