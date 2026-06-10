/* eslint-disable camelcase */
import { ModelRegistryMetadataType, ModelRegistryCustomProperties } from '~/app/types';
import {
  getValueLabels,
  getValidatedOnPlatforms,
  getValidatedDeploymentResources,
} from '~/app/pages/modelRegistry/screens/utils';

describe('getValueLabels', () => {
  it('should return empty array when customProperties is empty', () => {
    expect(getValueLabels({}, ['foo'])).toEqual([]);
  });

  it('should return empty array when keys list is empty', () => {
    const customProperties: ModelRegistryCustomProperties = {
      hardware_tag: {
        string_value: 'Example Tag',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    expect(getValueLabels(customProperties, [])).toEqual([]);
  });

  it('should return value when key is present with a valid string value', () => {
    const customProperties: ModelRegistryCustomProperties = {
      hardware_tag: {
        string_value: 'Example Tag',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    expect(getValueLabels(customProperties, ['hardware_tag'])).toEqual(['Example Tag']);
  });

  it('should exclude key whose string_value is empty', () => {
    const customProperties: ModelRegistryCustomProperties = {
      hardware_tag: {
        string_value: '',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    expect(getValueLabels(customProperties, ['hardware_tag'])).toEqual([]);
  });

  it('should exclude key with non-STRING metadata type', () => {
    const customProperties: ModelRegistryCustomProperties = {
      count: {
        int_value: '42',
        metadataType: ModelRegistryMetadataType.INT,
      },
    };
    expect(getValueLabels(customProperties, ['count'])).toEqual([]);
  });

  it('should skip keys that are missing from customProperties', () => {
    const customProperties: ModelRegistryCustomProperties = {
      hardware_tag: {
        string_value: 'Example Tag',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    expect(getValueLabels(customProperties, ['missing_key'])).toEqual([]);
  });

  it('should return values only for matching keys in order', () => {
    const customProperties: ModelRegistryCustomProperties = {
      hardware_tag: {
        string_value: 'Example Tag',
        metadataType: ModelRegistryMetadataType.STRING,
      },
      provider: {
        string_value: 'Red Hat',
        metadataType: ModelRegistryMetadataType.STRING,
      },
      count: {
        int_value: '5',
        metadataType: ModelRegistryMetadataType.INT,
      },
    };
    expect(
      getValueLabels(customProperties, ['provider', 'missing', 'count', 'hardware_tag']),
    ).toEqual(['Red Hat', 'Example Tag']);
  });
});

describe('getValidatedOnPlatforms', () => {
  it('should return empty array when customProperties is undefined', () => {
    const result = getValidatedOnPlatforms(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array when customProperties is empty', () => {
    const result = getValidatedOnPlatforms({});
    expect(result).toEqual([]);
  });

  it('should return empty array when validated_on property does not exist', () => {
    const customProperties: ModelRegistryCustomProperties = {
      other_property: {
        string_value: 'some value',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual([]);
  });

  it('should return empty array when validated_on property has empty string value', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual([]);
  });

  it('should return single platform when validated_on has one platform', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["OpenShift"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['OpenShift']);
  });

  it('should return multiple platforms when validated_on has JSON array of platforms', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["OpenShift","Kubernetes","Docker"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['OpenShift', 'Kubernetes', 'Docker']);
  });

  it('should trim whitespace from platform names', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '[" OpenShift "," Kubernetes "," Docker "]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['OpenShift', 'Kubernetes', 'Docker']);
  });

  it('should filter out empty platform names after trimming', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["OpenShift","","Kubernetes","  ","Docker"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['OpenShift', 'Kubernetes', 'Docker']);
  });

  it('should handle platforms with special characters', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["OpenShift 4.x","Kubernetes 1.28","Red Hat Enterprise Linux"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['OpenShift 4.x', 'Kubernetes 1.28', 'Red Hat Enterprise Linux']);
  });

  it('should handle mixed case platform names', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["openshift","KUBERNETES","Docker"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['openshift', 'KUBERNETES', 'Docker']);
  });

  it('should return empty array when validated_on property has wrong metadata type', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        int_value: '123',
        metadataType: ModelRegistryMetadataType.INT, // Wrong type
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual([]);
  });

  it('should handle customProperties with multiple properties including validated_on', () => {
    const customProperties: ModelRegistryCustomProperties = {
      provider: {
        string_value: 'Red Hat',
        metadataType: ModelRegistryMetadataType.STRING,
      },
      validated_on: {
        string_value: '["OpenShift","Kubernetes"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
      license: {
        string_value: 'Apache 2.0',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['OpenShift', 'Kubernetes']);
  });

  it('should return empty array when validated_on contains invalid JSON', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: 'not valid json',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual([]);
  });

  it('should return empty array when validated_on JSON is not an array', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '{"platform": "OpenShift"}',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual([]);
  });

  it('should filter out non-string items from JSON array', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["OpenShift",123,null,"Kubernetes",true]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['OpenShift', 'Kubernetes']);
  });

  it('should exclude deployment resource entries starting with vllm', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["rhoai-3.5","vllm 0.20.0 - CUDA","RHAIIS 3.0"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['rhoai-3.5', 'RHAIIS 3.0']);
  });

  it('should exclude deployment resources case-insensitively', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["RHOAI 2.20","VLLM v0.8.5 - CUDA"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedOnPlatforms(customProperties);
    expect(result).toEqual(['RHOAI 2.20']);
  });
});

describe('getValidatedDeploymentResources', () => {
  it('should return empty array when customProperties is undefined', () => {
    const result = getValidatedDeploymentResources(undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array when customProperties is empty', () => {
    const result = getValidatedDeploymentResources({});
    expect(result).toEqual([]);
  });

  it('should return empty array when no deployment resources exist', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["rhoai-3.5","RHAIIS 3.0"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedDeploymentResources(customProperties);
    expect(result).toEqual([]);
  });

  it('should return deployment resources starting with vllm', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["rhoai-3.5","vllm 0.20.0 - CUDA"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedDeploymentResources(customProperties);
    expect(result).toEqual(['vllm 0.20.0 - CUDA']);
  });

  it('should handle case-insensitive matching for vllm prefix', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["RHOAI 2.20","VLLM v0.8.5 - CUDA","vLLM v0.9.0"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedDeploymentResources(customProperties);
    expect(result).toEqual(['VLLM v0.8.5 - CUDA', 'vLLM v0.9.0']);
  });

  it('should return multiple deployment resources', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: '["rhoai-3.5","vllm 0.20.0 - CUDA","vllm 0.8.5 - ROCm"]',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedDeploymentResources(customProperties);
    expect(result).toEqual(['vllm 0.20.0 - CUDA', 'vllm 0.8.5 - ROCm']);
  });

  it('should return empty array when validated_on contains invalid JSON', () => {
    const customProperties: ModelRegistryCustomProperties = {
      validated_on: {
        string_value: 'not valid json',
        metadataType: ModelRegistryMetadataType.STRING,
      },
    };
    const result = getValidatedDeploymentResources(customProperties);
    expect(result).toEqual([]);
  });
});
