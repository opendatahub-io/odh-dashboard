import { SecretCategory, EnvironmentVariableType } from '#~/pages/projects/types';
import type { ExistingSecretRef, EnvVariable, StartNotebookData } from '#~/pages/projects/types';

describe('Type system for existing secrets', () => {
  it('should include EXISTING in SecretCategory', () => {
    expect(SecretCategory.EXISTING).toBe('secret existing');
  });

  it('should allow ExistingSecretRef type to be used in EnvVariable', () => {
    const ref: ExistingSecretRef = {
      secretName: 'my-secret',
      allKeys: true,
      selectedKeys: ['KEY_A', 'KEY_B'],
      availableKeys: ['KEY_A', 'KEY_B'],
    };
    const envVar: EnvVariable = {
      type: EnvironmentVariableType.SECRET,
      values: { category: SecretCategory.EXISTING, data: [] },
      existingSecretRefs: [ref],
    };
    expect(envVar.existingSecretRefs).toHaveLength(1);
    expect(envVar.existingSecretRefs?.[0].secretName).toBe('my-secret');
  });

  it('should support error and missingKeys fields on ExistingSecretRef', () => {
    const ref: ExistingSecretRef = {
      secretName: 'deleted-secret',
      allKeys: false,
      selectedKeys: ['GONE_KEY'],
      availableKeys: [],
      error: 'not-found',
      missingKeys: ['GONE_KEY'],
    };
    expect(ref.error).toBe('not-found');
    expect(ref.missingKeys).toEqual(['GONE_KEY']);
  });

  it('should support existingSecretEnvVars in StartNotebookData', () => {
    const data: Pick<StartNotebookData, 'existingSecretEnvVars'> = {
      existingSecretEnvVars: [
        {
          name: 'MY_VAR',
          valueFrom: {
            secretKeyRef: {
              name: 'my-secret',
              key: 'KEY_A',
            },
          },
        },
      ],
    };
    expect(data.existingSecretEnvVars).toHaveLength(1);
    expect(data.existingSecretEnvVars?.[0].valueFrom.secretKeyRef.name).toBe('my-secret');
  });
});
