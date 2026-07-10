import {
  getExistingVersionsForImageStream,
  getRelatedVersionDescription,
  checkVersionRecommended,
  getVersion,
  isEnvVariableDataValid,
} from '#~/pages/projects/screens/spawner/spawnerUtils';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { IMAGE_ANNOTATIONS } from '#~/pages/projects/screens/spawner/const';
import {
  EnvironmentVariableType,
  SecretCategory,
  ConfigMapCategory,
  EnvVariable,
} from '#~/pages/projects/types';

describe('getExistingVersionsForImageStream', () => {
  it('should handle no image tags', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: { spec: { tags: [] }, status: { tags: [] } },
    });
    expect(getExistingVersionsForImageStream(imageStream)).toHaveLength(0);
  });

  it('should return the only default value', () => {
    expect(getExistingVersionsForImageStream(mockImageStreamK8sResource({}))).toHaveLength(1);
  });

  it('should exclude the outdated items', () => {
    // Override the first value
    const imageStream = mockImageStreamK8sResource({
      opts: { spec: { tags: [{ annotations: { [IMAGE_ANNOTATIONS.OUTDATED]: 'true' } }] } },
    });
    expect(getExistingVersionsForImageStream(imageStream)).toHaveLength(0);

    // Add an outdated 2nd value
    const imageStream2 = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [{}, { name: 'test', annotations: { [IMAGE_ANNOTATIONS.OUTDATED]: 'true' } }],
        },
      },
    });
    expect(getExistingVersionsForImageStream(imageStream2)).toHaveLength(1);
  });

  it('should exclude removed tags', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [{ name: 'not-the-available-tag' }],
        },
      },
    });
    expect(getExistingVersionsForImageStream(imageStream)).toHaveLength(0);
  });

  it('should exclude removed tags & outdated ones', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [
            {},
            { name: 'not-the-available-tag' },
            { name: 'should-be-included' },
            { name: 'outdated', annotations: { [IMAGE_ANNOTATIONS.OUTDATED]: 'true' } },
          ],
        },
        status: {
          tags: [{ tag: 'should-be-included' }, { tag: 'outdated' }],
        },
      },
    });
    const result = getExistingVersionsForImageStream(imageStream);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'should-be-included' });
  });
});

describe('getRelatedVersionDescription', () => {
  it('should return undefined when there are no versions', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: { spec: { tags: [] }, status: { tags: [] } },
    });
    expect(getRelatedVersionDescription(imageStream)).toBeUndefined();
  });

  it('should return software string for a single version', () => {
    const imageStream = mockImageStreamK8sResource({});
    expect(getRelatedVersionDescription(imageStream)).toBe('Python v3.8');
  });

  it('should return software string for the recommended version when multiple versions exist', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [
            {
              name: '2023.1',
              annotations: {
                [IMAGE_ANNOTATIONS.SOFTWARE]: '[{"name":"Python","version":"v3.8"}]',
              },
            },
            {
              name: '2024.2',
              annotations: {
                [IMAGE_ANNOTATIONS.SOFTWARE]:
                  '[{"name":"Python","version":"v3.9"},{"name":"CUDA","version":"v11.8"}]',
                [IMAGE_ANNOTATIONS.RECOMMENDED]: 'true',
              },
            },
          ],
        },
        status: {
          tags: [{ tag: '2023.1' }, { tag: '2024.2' }],
        },
      },
    });
    expect(getRelatedVersionDescription(imageStream)).toBe('Python v3.9, CUDA v11.8');
  });

  it('should return software string for the latest version when none is recommended', () => {
    const imageStream = mockImageStreamK8sResource({
      opts: {
        spec: {
          tags: [
            {
              name: '2023.1',
              annotations: {
                [IMAGE_ANNOTATIONS.SOFTWARE]: '[{"name":"Python","version":"v3.8"}]',
              },
            },
            {
              name: '2024.2',
              annotations: {
                [IMAGE_ANNOTATIONS.SOFTWARE]: '[{"name":"Python","version":"v3.9"}]',
              },
            },
          ],
        },
        status: {
          tags: [{ tag: '2023.1' }, { tag: '2024.2' }],
        },
      },
    });
    expect(getRelatedVersionDescription(imageStream)).toBe('Python v3.9');
  });
});

describe('checkVersionRecommended', () => {
  it('should return true if the image version is recommended', () => {
    const imageVersion = {
      name: 'test-image',
      annotations: {
        [IMAGE_ANNOTATIONS.RECOMMENDED]: 'true',
      },
    };
    expect(checkVersionRecommended(imageVersion)).toBe(true);
  });

  it('should return false if the image version is not recommended', () => {
    const imageVersion = {
      name: 'test-image',
      annotations: {
        [IMAGE_ANNOTATIONS.RECOMMENDED]: 'false',
      },
    };
    expect(checkVersionRecommended(imageVersion)).toBe(false);
  });

  it('should return false if the image version does not have the recommended annotation', () => {
    const imageVersion = {
      name: 'test-image',
    };
    expect(checkVersionRecommended(imageVersion)).toBe(false);
  });

  it('should return false if the image version is invalid JSON', () => {
    const imageVersion = {
      name: 'test-image',
      annotations: {
        [IMAGE_ANNOTATIONS.RECOMMENDED]: 'invalid-json',
      },
    };
    expect(checkVersionRecommended(imageVersion)).toBe(false);
  });

  it('should get version with a prefix and string parameter', () => {
    expect(getVersion('v3.9', 'v')).toEqual('v3.9');
    expect(getVersion('4.9', 'V')).toEqual('V4.9');
    expect(getVersion('3.1', 'Randomprefix')).toEqual('Randomprefix3.1');
    expect(getVersion('0.1')).toEqual('0.1');
  });

  it('should get version with a number as the parameter', () => {
    expect(getVersion(0.1)).toEqual('0.1');
    expect(getVersion(3.1, 'v')).toEqual('v3.1');
    expect(getVersion(1000.5, 'V')).toEqual('V1000.5');
  });
});

describe('isEnvVariableDataValid', () => {
  it('should return true for empty env variables array', () => {
    expect(isEnvVariableDataValid([])).toBe(true);
  });

  it('should return true for valid generic secret', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'MY_KEY', value: 'my-value' }],
        },
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(true);
  });

  it('should return true for valid generic config map', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.CONFIG_MAP,
        values: {
          category: ConfigMapCategory.GENERIC,
          data: [{ key: 'MY_KEY', value: 'my-value' }],
        },
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(true);
  });

  it('should return false when type is null', () => {
    const envVars: EnvVariable[] = [
      {
        type: null,
        values: {
          category: SecretCategory.GENERIC,
          data: [{ key: 'MY_KEY', value: 'my-value' }],
        },
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  it('should return false when values are missing', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  it('should return false when data array is empty', () => {
    const envVars: EnvVariable[] = [
      {
        type: EnvironmentVariableType.SECRET,
        values: {
          category: SecretCategory.GENERIC,
          data: [],
        },
      },
    ];
    expect(isEnvVariableDataValid(envVars)).toBe(false);
  });

  describe('existing secret category', () => {
    it('should return true when secret name is set and keys are selected', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [
              { key: 'DB_HOST', value: '' },
              { key: 'DB_PORT', value: '' },
            ],
          },
        },
      ];
      expect(isEnvVariableDataValid(envVars)).toBe(true);
    });

    it('should return false when secret name is empty', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: '',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'DB_HOST', value: '' }],
          },
        },
      ];
      expect(isEnvVariableDataValid(envVars)).toBe(false);
    });

    it('should return false when secret name is not set', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'DB_HOST', value: '' }],
          },
        },
      ];
      expect(isEnvVariableDataValid(envVars)).toBe(false);
    });

    it('should return false when no keys are selected (empty data array)', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [],
          },
        },
      ];
      expect(isEnvVariableDataValid(envVars)).toBe(false);
    });

    it('should return true alongside other valid env variables', () => {
      const envVars: EnvVariable[] = [
        {
          type: EnvironmentVariableType.SECRET,
          values: {
            category: SecretCategory.GENERIC,
            data: [{ key: 'INLINE_KEY', value: 'inline-value' }],
          },
        },
        {
          type: EnvironmentVariableType.SECRET,
          existingName: 'my-secret',
          values: {
            category: SecretCategory.EXISTING,
            data: [{ key: 'DB_HOST', value: '' }],
          },
        },
      ];
      expect(isEnvVariableDataValid(envVars)).toBe(true);
    });
  });
});
