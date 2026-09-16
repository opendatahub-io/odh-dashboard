import { NIMModelLocationKey } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { NIMModelLocationOverride } from '../NIMModelLocationOverride';

describe('NIMModelLocationOverride', () => {
  it('should target the NIM model location key', () => {
    expect(NIMModelLocationOverride.locationKey).toBe(NIMModelLocationKey);
  });

  it('should disable location selection when editing a NIM deployment', () => {
    expect(NIMModelLocationOverride.disableWhenEditing).toBe(true);
    expect(NIMModelLocationOverride.disabledTooltip).toBeTruthy();
  });

  it('should hide the NIM option when editing other model locations', () => {
    expect(NIMModelLocationOverride.hideOptionWhenEditingOtherLocation).toBe(true);
  });
});
