import { ModelLocationType } from '../../../shared/types/form-data';
import { isEditingNimModelLocation, shouldHideNimModelLocationOption } from '../utils';

describe('isEditingNimModelLocation', () => {
  it('should return true when editing a NIM deployment', () => {
    expect(isEditingNimModelLocation(true, ModelLocationType.NIM)).toBe(true);
  });

  it('should return false when editing a non-NIM deployment', () => {
    expect(isEditingNimModelLocation(true, ModelLocationType.EXISTING)).toBe(false);
  });

  it('should return false when not editing', () => {
    expect(isEditingNimModelLocation(false, ModelLocationType.NIM)).toBe(false);
  });
});

describe('shouldHideNimModelLocationOption', () => {
  it('should hide NIM when editing a non-NIM deployment', () => {
    expect(shouldHideNimModelLocationOption(true, ModelLocationType.EXISTING)).toBe(true);
  });

  it('should not hide NIM when editing a NIM deployment', () => {
    expect(shouldHideNimModelLocationOption(true, ModelLocationType.NIM)).toBe(false);
  });

  it('should not hide NIM when creating a deployment', () => {
    expect(shouldHideNimModelLocationOption(false, ModelLocationType.EXISTING)).toBe(false);
  });
});
