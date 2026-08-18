import {
  parseModelCapabilities,
  MODEL_CAPABILITIES_ANNOTATION,
  getModelCapabilityLabelColor,
  includesModelCapability,
  isSameModelCapability,
  normalizeModelCapability,
  resolveWellKnownModelCapability,
} from '../modelCapabilities';

describe('parseModelCapabilities', () => {
  it('should return undefined when annotations are undefined', () => {
    expect(parseModelCapabilities(undefined)).toBeUndefined();
  });

  it('should return undefined when the annotation is absent', () => {
    expect(parseModelCapabilities({ 'some-other-annotation': 'value' })).toBeUndefined();
  });

  it('should return undefined when the annotation is empty string', () => {
    expect(parseModelCapabilities({ [MODEL_CAPABILITIES_ANNOTATION]: '' })).toBeUndefined();
  });

  it('should return undefined when the annotation is malformed JSON', () => {
    expect(parseModelCapabilities({ [MODEL_CAPABILITIES_ANNOTATION]: 'not-json' })).toBeUndefined();
  });

  it('should return undefined when the annotation is not a string array', () => {
    expect(
      parseModelCapabilities({ [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify({ key: 'value' }) }),
    ).toBeUndefined();
  });

  it('should return undefined when the array contains non-string elements', () => {
    expect(
      parseModelCapabilities({ [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify([1, 2, 3]) }),
    ).toBeUndefined();
  });

  it('should parse a valid single-capability annotation', () => {
    expect(
      parseModelCapabilities({
        [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(['Vision']),
      }),
    ).toEqual(['Vision']);
  });

  it('should parse a valid multi-capability annotation', () => {
    expect(
      parseModelCapabilities({
        [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(['Vision', 'Transcription']),
      }),
    ).toEqual(['Vision', 'Transcription']);
  });

  it('should return an empty array for an empty JSON array', () => {
    expect(parseModelCapabilities({ [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify([]) })).toEqual(
      [],
    );
  });
});

describe('modelCapabilities', () => {
  describe('getModelCapabilityLabelColor', () => {
    it('should return blue for Vision', () => {
      expect(getModelCapabilityLabelColor('Vision')).toBe('blue');
    });

    it('should return orange for Transcription', () => {
      expect(getModelCapabilityLabelColor('Transcription')).toBe('orange');
    });

    it('should return well-known colors for case-insensitive matches', () => {
      expect(getModelCapabilityLabelColor('vision')).toBe('blue');
      expect(getModelCapabilityLabelColor('TRANSCRIPTION')).toBe('orange');
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
