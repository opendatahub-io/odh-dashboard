import {
  getModelCapabilityLabelColor,
  includesModelCapability,
  isSameModelCapability,
  MODEL_CAPABILITIES_ANNOTATION,
  normalizeModelCapability,
  resolveWellKnownModelCapability,
  WELL_KNOWN_MODEL_CAPABILITIES,
} from '../modelCapabilities';

describe('modelCapabilities', () => {
  describe('MODEL_CAPABILITIES_ANNOTATION', () => {
    it('should use the expected annotation key', () => {
      expect(MODEL_CAPABILITIES_ANNOTATION).toBe('opendatahub.io/model-capabilities');
    });
  });

  describe('WELL_KNOWN_MODEL_CAPABILITIES', () => {
    it('should include Vision and Transcription', () => {
      expect(WELL_KNOWN_MODEL_CAPABILITIES).toEqual(['Vision', 'Transcription']);
    });
  });

  describe('getModelCapabilityLabelColor', () => {
    it('should return blue for Vision', () => {
      expect(getModelCapabilityLabelColor('Vision')).toBe('blue');
    });

    it('should return orange for Transcription', () => {
      expect(getModelCapabilityLabelColor('Transcription')).toBe('orange');
    });

    it('should return grey for custom capabilities', () => {
      expect(getModelCapabilityLabelColor('Custom capability')).toBe('grey');
    });
  });

  describe('resolveWellKnownModelCapability', () => {
    it('should resolve case-insensitive matches to canonical well-known values', () => {
      expect(resolveWellKnownModelCapability('vision')).toBe('Vision');
      expect(resolveWellKnownModelCapability('TRANSCRIPTION')).toBe('Transcription');
    });

    it('should return undefined for unknown capabilities', () => {
      expect(resolveWellKnownModelCapability('MyCustomCap')).toBeUndefined();
    });
  });

  describe('normalizeModelCapability', () => {
    it('should use canonical well-known casing when matched', () => {
      expect(normalizeModelCapability('vision')).toBe('Vision');
    });

    it('should preserve custom capability text when not well-known', () => {
      expect(normalizeModelCapability('MyCustomCap')).toBe('MyCustomCap');
    });
  });

  describe('includesModelCapability', () => {
    it('should detect case-insensitive duplicates', () => {
      expect(includesModelCapability(['Vision'], 'vision')).toBe(true);
      expect(includesModelCapability(['custom-cap'], 'Custom-Cap')).toBe(true);
    });

    it('should not treat different capabilities as duplicates', () => {
      expect(isSameModelCapability('Vision', 'Transcription')).toBe(false);
      expect(includesModelCapability(['Vision'], 'Transcription')).toBe(false);
    });
  });
});
