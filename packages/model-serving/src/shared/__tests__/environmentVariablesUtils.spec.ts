import {
  EnvironmentVariableType,
  createDefaultEnvironmentVariable,
  formatEnvironmentVariableForReview,
  mapEnvironmentVariableToK8sEnv,
  mapEnvironmentVariablesToK8sEnv,
  mapK8sEnvToEnvironmentVariable,
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

describe('createDefaultEnvironmentVariable', () => {
  it('should create a value-type environment variable', () => {
    expect(createDefaultEnvironmentVariable()).toEqual({
      type: EnvironmentVariableType.Value,
      name: '',
      value: '',
    });
  });
});
