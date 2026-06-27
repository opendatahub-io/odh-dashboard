import { SecretCategory } from '#~/pages/projects/types';
import { isExistingSecretCategory } from '#~/pages/projects/screens/spawner/environmentVariables/utils';

describe('SecretCategory', () => {
  it('should have EXISTING as a valid enum value', () => {
    expect(SecretCategory.EXISTING).toBe('existing secret');
  });

  it('should include all expected enum values', () => {
    expect(Object.values(SecretCategory)).toEqual([
      'secret key-value',
      'aws',
      'secret upload',
      'existing secret',
    ]);
  });
});

describe('isExistingSecretCategory', () => {
  it('should return true for EXISTING category', () => {
    expect(isExistingSecretCategory(SecretCategory.EXISTING)).toBe(true);
  });

  it('should return false for GENERIC category', () => {
    expect(isExistingSecretCategory(SecretCategory.GENERIC)).toBe(false);
  });

  it('should return false for AWS category', () => {
    expect(isExistingSecretCategory(SecretCategory.AWS)).toBe(false);
  });

  it('should return false for UPLOAD category', () => {
    expect(isExistingSecretCategory(SecretCategory.UPLOAD)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isExistingSecretCategory(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isExistingSecretCategory(undefined)).toBe(false);
  });

  it('should return false for arbitrary string', () => {
    expect(isExistingSecretCategory('random string' as SecretCategory)).toBe(false);
  });
});
