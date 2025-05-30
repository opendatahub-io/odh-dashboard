import { ContainerResources } from '#~/types';
import { extractAcceleratorResources } from '#~/pages/projects/screens/detail/notebooks/utils';

describe('extractAcceleratorResources', () => {
  it('should return empty object if no resources are provided', () => {
    const result = extractAcceleratorResources();
    expect(result).toEqual({});
  });

  it('should return empty object if resources do not contain accelerators', () => {
    const resources: ContainerResources = {
      limits: { cpu: '1000m', memory: '2Gi' },
      requests: { cpu: '500m', memory: '1Gi' },
    };
    const result = extractAcceleratorResources(resources);
    expect(result).toEqual({});
  });

  it('should extract accelerator resources from limits', () => {
    const resources: ContainerResources = {
      limits: { cpu: '1000m', memory: '2Gi', 'nvidia.com/gpu': '1' },
      requests: { cpu: '500m', memory: '1Gi' },
    };
    const result = extractAcceleratorResources(resources);
    expect(result).toEqual({
      limits: '1',
      requests: undefined,
      identifier: 'nvidia.com/gpu',
    });
  });

  it('should extract accelerator resources from requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '1000m', memory: '2Gi' },
      requests: { cpu: '500m', memory: '1Gi', 'nvidia.com/gpu': '1' },
    };
    const result = extractAcceleratorResources(resources);
    expect(result).toEqual({
      limits: undefined,
      requests: '1',
      identifier: 'nvidia.com/gpu',
    });
  });

  it('should extract accelerator resources from both limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '1000m', memory: '2Gi', 'nvidia.com/gpu': '2' },
      requests: { cpu: '500m', memory: '1Gi', 'nvidia.com/gpu': '1' },
    };
    const result = extractAcceleratorResources(resources);
    expect(result).toEqual({
      limits: '2',
      requests: '1',
      identifier: 'nvidia.com/gpu',
    });
  });
});
