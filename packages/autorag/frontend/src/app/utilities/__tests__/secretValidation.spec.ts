import { getMissingRequiredKeys, formatMissingKeysMessage } from '~/app/utilities/secretValidation';

describe('getMissingRequiredKeys', () => {
  it('should return empty array when all required keys are present', () => {
    const requiredKeys = ['key1', 'key2', 'key3'];
    const availableKeys = ['key1', 'key2', 'key3'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual([]);
  });

  it('should return missing keys when some required keys are not available', () => {
    const requiredKeys = ['key1', 'key2', 'key3'];
    const availableKeys = ['key1', 'key3'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual(['key2']);
  });

  it('should return all required keys when no keys are available', () => {
    const requiredKeys = ['key1', 'key2', 'key3'];
    const availableKeys: string[] = [];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual(['key1', 'key2', 'key3']);
  });

  it('should return empty array when no keys are required', () => {
    const requiredKeys: string[] = [];
    const availableKeys = ['key1', 'key2', 'key3'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual([]);
  });

  it('should return empty array when both arrays are empty', () => {
    const requiredKeys: string[] = [];
    const availableKeys: string[] = [];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual([]);
  });

  it('should be case-sensitive', () => {
    const requiredKeys = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const availableKeys = ['aws_access_key_id', 'AWS_SECRET_ACCESS_KEY'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    // Should return AWS_ACCESS_KEY_ID because case doesn't match
    expect(result).toEqual(['AWS_ACCESS_KEY_ID']);
  });

  it('should handle duplicate required keys', () => {
    const requiredKeys = ['key1', 'key1', 'key2'];
    const availableKeys = ['key1'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    // Should return only key2 (key1 duplicates are filtered by Set logic)
    expect(result).toEqual(['key2']);
  });

  it('should handle duplicate available keys', () => {
    const requiredKeys = ['key1', 'key2'];
    const availableKeys = ['key1', 'key1', 'key3'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual(['key2']);
  });

  it('should return multiple missing keys in order', () => {
    const requiredKeys = ['key1', 'key2', 'key3', 'key4'];
    const availableKeys = ['key2', 'key4'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual(['key1', 'key3']);
  });

  it('should handle extra available keys that are not required', () => {
    const requiredKeys = ['key1', 'key2'];
    const availableKeys = ['key1', 'key2', 'key3', 'key4', 'key5'];
    const result = getMissingRequiredKeys(requiredKeys, availableKeys);
    expect(result).toEqual([]);
  });
});

describe('formatMissingKeysMessage', () => {
  it('should return empty string when no keys are missing', () => {
    const missingKeys: string[] = [];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toBe('');
  });

  it('should format message with singular "key" for one missing key', () => {
    const missingKeys = ['AWS_ACCESS_KEY_ID'];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toBe('Required key "AWS_ACCESS_KEY_ID" is not set in this secret');
  });

  it('should format message with plural "keys" for two missing keys', () => {
    const missingKeys = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toBe(
      'Required keys "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY" are not set in this secret',
    );
  });

  it('should format message with plural "keys" for multiple missing keys', () => {
    const missingKeys = ['key1', 'key2', 'key3'];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toBe('Required keys "key1", "key2", "key3" are not set in this secret');
  });

  it('should format message with comma-separated list for many keys', () => {
    const missingKeys = ['key1', 'key2', 'key3', 'key4', 'key5'];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toBe(
      'Required keys "key1", "key2", "key3", "key4", "key5" are not set in this secret',
    );
  });

  it('should wrap each key in quotes', () => {
    const missingKeys = ['AWS_S3_BUCKET', 'REGION'];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toContain('"AWS_S3_BUCKET"');
    expect(result).toContain('"REGION"');
  });

  it('should handle keys with special characters', () => {
    const missingKeys = ['key-with-dash', 'key_with_underscore', 'KEY.WITH.DOTS'];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toBe(
      'Required keys "key-with-dash", "key_with_underscore", "KEY.WITH.DOTS" are not set in this secret',
    );
  });

  it('should preserve key order in message', () => {
    const missingKeys = ['z-key', 'a-key', 'm-key'];
    const result = formatMissingKeysMessage(missingKeys);
    expect(result).toBe('Required keys "z-key", "a-key", "m-key" are not set in this secret');
  });
});
