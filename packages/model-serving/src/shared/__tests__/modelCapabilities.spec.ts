import { parseModelCapabilities, MODEL_CAPABILITIES_ANNOTATION } from '../modelCapabilities';

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
