import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockModelServingPlatform, mockProjectWithPlatform } from '../../__tests__/mockUtils';
import {
  resolvePlatformOverride,
  resolveMultiProjectPlatformOverride,
} from '../resolvePlatformOverride';

type PlatformScopedExtension = {
  properties: { platform: string; component: () => Promise<unknown> };
};

const mockPlatformExtension = (platform: string): PlatformScopedExtension => ({
  properties: {
    platform,
    component: () => Promise.resolve({ default: () => null }),
  },
});

describe('resolvePlatformOverride', () => {
  it('should return the extension matching the active platform id', () => {
    const platform = mockModelServingPlatform({ id: 'nim' });
    const extensions = [mockPlatformExtension('kserve'), mockPlatformExtension('nim')];

    const result = resolvePlatformOverride(platform, extensions);
    expect(result).toBe(extensions[1]);
  });

  it('should return undefined when no extension matches the active platform', () => {
    const platform = mockModelServingPlatform({ id: 'nim' });
    const extensions = [mockPlatformExtension('kserve')];

    expect(resolvePlatformOverride(platform, extensions)).toBeUndefined();
  });

  it('should return undefined when activePlatform is null', () => {
    const extensions = [mockPlatformExtension('kserve')];
    expect(resolvePlatformOverride(null, extensions)).toBeUndefined();
  });

  it('should return undefined when activePlatform is undefined', () => {
    const extensions = [mockPlatformExtension('kserve')];
    expect(resolvePlatformOverride(undefined, extensions)).toBeUndefined();
  });

  it('should return the first match when duplicates exist', () => {
    const platform = mockModelServingPlatform({ id: 'nim' });
    const extensions = [mockPlatformExtension('nim'), mockPlatformExtension('nim')];

    const result = resolvePlatformOverride(platform, extensions);
    expect(result).toBe(extensions[0]);
  });

  it('should return undefined with empty extensions list', () => {
    const platform = mockModelServingPlatform({ id: 'kserve' });
    expect(resolvePlatformOverride(platform, [])).toBeUndefined();
  });

  it('should return undefined when no platform is active and no extensions registered', () => {
    expect(resolvePlatformOverride(null, [])).toBeUndefined();
  });
});

describe('resolveMultiProjectPlatformOverride', () => {
  it('should return the extension for the project-matched platform', () => {
    const platformA = mockModelServingPlatform({ id: 'kserve' });
    const platformB = mockModelServingPlatform({
      id: 'nim',
      enabledProjectMetadata: {
        annotations: { 'opendatahub.io/nim-support': 'true' },
      },
    });
    const project = mockProjectWithPlatform(mockProjectK8sResource({}), platformB);

    const extensions = [mockPlatformExtension('kserve'), mockPlatformExtension('nim')];

    const result = resolveMultiProjectPlatformOverride(
      [project],
      [platformA, platformB],
      extensions,
    );
    expect(result?.properties.platform).toBe('nim');
  });

  it('should return undefined when no extension matches any active platform', () => {
    const platform = mockModelServingPlatform({ id: 'kserve' });
    const project = mockProjectWithPlatform(mockProjectK8sResource({}), platform);
    const extensions = [mockPlatformExtension('other')];

    expect(resolveMultiProjectPlatformOverride([project], [platform], extensions)).toBeUndefined();
  });

  it('should return undefined when there are no projects', () => {
    const platform = mockModelServingPlatform({ id: 'kserve' });
    const extensions = [mockPlatformExtension('kserve')];

    expect(resolveMultiProjectPlatformOverride([], [platform], extensions)).toBeUndefined();
  });

  it('should skip platforms without registered extensions', () => {
    const platformA = mockModelServingPlatform({ id: 'kserve' });
    const platformB = mockModelServingPlatform({
      id: 'nim',
      enabledProjectMetadata: {
        annotations: { 'opendatahub.io/nim-support': 'true' },
      },
    });

    const projectA = mockProjectWithPlatform(mockProjectK8sResource({ k8sName: 'p1' }), platformA);
    const projectB = mockProjectWithPlatform(mockProjectK8sResource({ k8sName: 'p2' }), platformB);

    const extensions = [mockPlatformExtension('nim')];

    const result = resolveMultiProjectPlatformOverride(
      [projectA, projectB],
      [platformA, platformB],
      extensions,
    );
    expect(result?.properties.platform).toBe('nim');
  });

  it('should respect project iteration order for precedence', () => {
    const platformA = mockModelServingPlatform({ id: 'kserve' });
    const platformB = mockModelServingPlatform({
      id: 'nim',
      enabledProjectMetadata: {
        annotations: { 'opendatahub.io/nim-support': 'true' },
      },
    });

    const projectA = mockProjectWithPlatform(mockProjectK8sResource({ k8sName: 'p1' }), platformA);
    const projectB = mockProjectWithPlatform(mockProjectK8sResource({ k8sName: 'p2' }), platformB);

    const extensions = [mockPlatformExtension('kserve'), mockPlatformExtension('nim')];

    const result = resolveMultiProjectPlatformOverride(
      [projectA, projectB],
      [platformA, platformB],
      extensions,
    );
    expect(result?.properties.platform).toBe('kserve');
  });

  it('should return undefined with no extensions', () => {
    const platform = mockModelServingPlatform({ id: 'kserve' });
    const project = mockProjectWithPlatform(mockProjectK8sResource({}), platform);
    expect(resolveMultiProjectPlatformOverride([project], [platform], [])).toBeUndefined();
  });
});
