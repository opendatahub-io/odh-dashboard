import {
  getModelCapabilityLabelColor,
  MODEL_CAPABILITIES_ANNOTATION,
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
});
