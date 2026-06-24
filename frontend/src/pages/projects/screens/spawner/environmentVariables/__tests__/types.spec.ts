import { SecretCategory, ExistingSecretRef, EnvVariable } from '#~/pages/projects/types';

describe('SecretCategory', () => {
  it('should include EXISTING value', () => {
    expect(SecretCategory.EXISTING).toBe('secret existing');
  });
});

describe('ExistingSecretRef', () => {
  it('should be usable as a type with required fields', () => {
    const ref: ExistingSecretRef = {
      secretName: 'my-secret',
      selectedKeys: ['key1', 'key2'],
      allKeys: false,
    };

    expect(ref.secretName).toBe('my-secret');
    expect(ref.selectedKeys).toEqual(['key1', 'key2']);
    expect(ref.allKeys).toBe(false);
  });
});

describe('EnvVariable', () => {
  it('should accept optional existingSecretRefs field', () => {
    const envVar: EnvVariable = {
      type: null,
      existingSecretRefs: [
        {
          secretName: 'my-secret',
          selectedKeys: ['key1'],
          allKeys: true,
        },
      ],
    };

    expect(envVar.existingSecretRefs).toHaveLength(1);
    expect(envVar.existingSecretRefs?.[0].secretName).toBe('my-secret');
  });

  it('should work without existingSecretRefs field', () => {
    const envVar: EnvVariable = {
      type: null,
    };

    expect(envVar.existingSecretRefs).toBeUndefined();
  });
});
