import { resourcesArePositive } from '~/pages/modelServing/utils';
import { ContainerResources } from '~/types';

describe('resourcesArePositive', () => {
  it('should return true for undefined limits and request', () => {
    const resources: ContainerResources = {
      limits: undefined,
      requests: undefined,
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return false for resources with zero limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: 0, memory: '0Gi' },
      requests: { cpu: 0, memory: '0Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(false);
  });

  it('should return false for resources with negative limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '-1', memory: '-1Mi' },
      requests: { cpu: '-1', memory: '-1Mi' },
    };
    expect(resourcesArePositive(resources)).toBe(false);
  });

  it('should return true for resources with positive limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '1', memory: '1Gi' },
      requests: { cpu: '1', memory: '1Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return true for resources with positive limits and undefined requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: 1, memory: '1Gi' },
      requests: undefined,
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return true for resources with undefined limits and positive requests', () => {
    const resources: ContainerResources = {
      limits: undefined,
      requests: { cpu: 1, memory: '1Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });
});
