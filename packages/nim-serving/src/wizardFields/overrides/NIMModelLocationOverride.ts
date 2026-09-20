import type { ModelLocationFieldOverride } from '@odh-dashboard/model-serving/shared/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/shared/wizard-fields';

export const NIM_EDIT_LOCATION_DISABLED_TOOLTIP =
  'Model location cannot be changed when editing an NVIDIA NIM deployment.';

export const NIMModelLocationOverride: ModelLocationFieldOverride = {
  id: 'modelLocation',
  type: 'modifier',
  isActive: () => true,
  locationKey: NIMModelLocationKey,
  disableWhenEditing: true,
  disabledTooltip: NIM_EDIT_LOCATION_DISABLED_TOOLTIP,
  hideOptionWhenEditingOtherLocation: true,
};
