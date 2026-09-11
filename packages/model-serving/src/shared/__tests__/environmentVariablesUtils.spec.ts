import {
  EnvironmentVariableType,
  createDefaultEnvironmentVariable,
  formatEnvironmentVariableForReview,
  isSecretEnvVar,
  isValidSecretDataKey,
  isValidSecretName,
  isValueEnvVar,
  mapEnvironmentVariableToK8sEnv,
  mapEnvironmentVariablesToK8sEnv,
  mapK8sEnvToEnvironmentVariable,
  mergeEnvironmentVariableUpdates,
  normalizeEnvironmentVariable,
} from '../environmentVariablesUtils';

describe('mapEnvironmentVariableToK8sEnv', () => {
  it('should map value-type environment variables', () => {
    expect(
      mapEnvironmentVariableToK8sEnv({
        type: EnvironmentVariableType.Value,
        name: 'MY_VAR',
        value: 'hello',
      }),
    ).toEqual({
      name: 'MY_VAR',
      value: 'hello',
    });
  });

  it('should map secret-type environment variables', () => {
    expect(
      mapEnvironmentVariableToK8sEnv({
        type: EnvironmentVariableType.Secret,
        name: 'HF_TOKEN',
        secretName: 'hf-secret',
        secretKey: 'HF_TOKEN',
      }),
    ).toEqual({
      name: 'HF_TOKEN',
      valueFrom: {
        secretKeyRef: {
          name: 'hf-secret',
          key: 'HF_TOKEN',
        },
      },
    });
  });

  it('should preserve optional secretKeyRef on write', () => {
    expect(
      mapEnvironmentVariableToK8sEnv({
        type: EnvironmentVariableType.Secret,
        name: 'HF_TOKEN',
        secretName: 'hf-secret',
        secretKey: 'HF_TOKEN',
        optional: true,
      }),
    ).toEqual({
      name: 'HF_TOKEN',
      valueFrom: {
        secretKeyRef: {
          name: 'hf-secret',
          key: 'HF_TOKEN',
          optional: true,
        },
      },
    });
  });
});

describe('mapK8sEnvToEnvironmentVariable', () => {
  it('should map plain value env vars', () => {
    expect(
      mapK8sEnvToEnvironmentVariable({
        name: 'MY_VAR',
        value: 'hello',
      }),
    ).toEqual({
      type: EnvironmentVariableType.Value,
      name: 'MY_VAR',
      value: 'hello',
    });
  });

  it('should map secretKeyRef env vars', () => {
    expect(
      mapK8sEnvToEnvironmentVariable({
        name: 'HF_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: 'hf-secret',
            key: 'HF_TOKEN',
          },
        },
      }),
    ).toEqual({
      type: EnvironmentVariableType.Secret,
      name: 'HF_TOKEN',
      secretName: 'hf-secret',
      secretKey: 'HF_TOKEN',
    });
  });

  it('should preserve optional secretKeyRef on read', () => {
    expect(
      mapK8sEnvToEnvironmentVariable({
        name: 'HF_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: 'hf-secret',
            key: 'HF_TOKEN',
            optional: true,
          },
        },
      }),
    ).toEqual({
      type: EnvironmentVariableType.Secret,
      name: 'HF_TOKEN',
      secretName: 'hf-secret',
      secretKey: 'HF_TOKEN',
      optional: true,
    });
  });

  it('should default empty values to empty string', () => {
    expect(
      mapK8sEnvToEnvironmentVariable({
        name: 'MY_VAR',
        value: '',
      }),
    ).toEqual({
      type: EnvironmentVariableType.Value,
      name: 'MY_VAR',
      value: '',
    });
  });
});

describe('mapEnvironmentVariablesToK8sEnv', () => {
  it('should map mixed environment variable types', () => {
    expect(
      mapEnvironmentVariablesToK8sEnv([
        {
          type: EnvironmentVariableType.Value,
          name: 'PLAIN',
          value: 'value',
        },
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: 'hf-secret',
          secretKey: 'HF_TOKEN',
        },
      ]),
    ).toEqual([
      { name: 'PLAIN', value: 'value' },
      {
        name: 'HF_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: 'hf-secret',
            key: 'HF_TOKEN',
          },
        },
      },
    ]);
  });
});

describe('normalizeEnvironmentVariable', () => {
  it('should default legacy value env vars to value type', () => {
    expect(
      normalizeEnvironmentVariable({
        name: 'MY_VAR',
        value: 'hello',
      }),
    ).toEqual({
      type: EnvironmentVariableType.Value,
      name: 'MY_VAR',
      value: 'hello',
    });
  });

  it('should preserve secret env vars', () => {
    expect(
      normalizeEnvironmentVariable({
        type: EnvironmentVariableType.Secret,
        name: 'HF_TOKEN',
        secretName: 'hf-secret',
        secretKey: 'HF_TOKEN',
      }),
    ).toEqual({
      type: EnvironmentVariableType.Secret,
      name: 'HF_TOKEN',
      secretName: 'hf-secret',
      secretKey: 'HF_TOKEN',
    });
  });
});

describe('formatEnvironmentVariableForReview', () => {
  it('should format value env vars', () => {
    expect(
      formatEnvironmentVariableForReview({
        type: EnvironmentVariableType.Value,
        name: 'MY_VAR',
        value: 'hello',
      }),
    ).toBe('MY_VAR, hello');
  });

  it('should format secret env vars', () => {
    expect(
      formatEnvironmentVariableForReview({
        type: EnvironmentVariableType.Secret,
        name: 'HF_TOKEN',
        secretName: 'hf-secret',
        secretKey: 'HF_TOKEN',
      }),
    ).toBe('HF_TOKEN, secret/hf-secret:HF_TOKEN');
  });
});

describe('mergeEnvironmentVariableUpdates', () => {
  it('should preserve optional when editing secret fields', () => {
    expect(
      mergeEnvironmentVariableUpdates(
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: 'hf-secret',
          secretKey: 'HF_TOKEN',
          optional: true,
        },
        { secretName: 'hf-secret-updated' },
      ),
    ).toEqual({
      type: EnvironmentVariableType.Secret,
      name: 'HF_TOKEN',
      secretName: 'hf-secret-updated',
      secretKey: 'HF_TOKEN',
      optional: true,
    });
  });

  it('should switch from value to secret type', () => {
    expect(
      mergeEnvironmentVariableUpdates(
        { type: EnvironmentVariableType.Value, name: 'HF_TOKEN', value: 'plain' },
        { type: EnvironmentVariableType.Secret },
      ),
    ).toEqual({
      type: EnvironmentVariableType.Secret,
      name: 'HF_TOKEN',
      secretName: '',
      secretKey: '',
    });
  });
});

describe('type guards', () => {
  it('should identify secret and value env vars', () => {
    expect(
      isSecretEnvVar({
        type: EnvironmentVariableType.Secret,
        name: 'HF_TOKEN',
        secretName: 'hf-secret',
        secretKey: 'HF_TOKEN',
      }),
    ).toBe(true);
    expect(
      isValueEnvVar({
        type: EnvironmentVariableType.Value,
        name: 'MY_VAR',
        value: 'hello',
      }),
    ).toBe(true);
  });
});

describe('secret reference validation', () => {
  it('should accept valid secret names and keys', () => {
    expect(isValidSecretName('hf-token-test')).toBe(true);
    expect(isValidSecretName('my.secret.name')).toBe(true);
    expect(isValidSecretDataKey('HF_TOKEN')).toBe(true);
    expect(isValidSecretDataKey('tls.crt')).toBe(true);
    expect(isValidSecretDataKey('.dockerconfigjson')).toBe(true);
  });

  it('should reject invalid secret names and keys', () => {
    expect(isValidSecretName('')).toBe(false);
    expect(isValidSecretName('INVALID_NAME')).toBe(false);
    expect(isValidSecretName('bad name')).toBe(false);
    expect(isValidSecretDataKey('')).toBe(false);
    expect(isValidSecretDataKey('bad key')).toBe(false);
  });
});

describe('createDefaultEnvironmentVariable', () => {
  it('should create a value-type environment variable', () => {
    expect(createDefaultEnvironmentVariable()).toEqual({
      type: EnvironmentVariableType.Value,
      name: '',
      value: '',
    });
  });
});
