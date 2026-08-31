import {
  RESOURCE_CATEGORIES,
  buildResourceToApiGroupMap,
} from '#~/pages/projects/projectRoles/resourceCategories';

describe('buildResourceToApiGroupMap', () => {
  it('should use static categories when discovery is empty', () => {
    const map = buildResourceToApiGroupMap([]);

    expect(map.get('pods')).toBe('');
    expect(map.get('deployments')).toBe('apps');
    expect(map.get('persistentvolumeclaims')).toBe('');
    expect(map.get('storageclasses')).toBe('storage.k8s.io');
    expect(map.size).toBe(RESOURCE_CATEGORIES.flatMap((c) => c.resources).length);
  });

  it('should prefer the first discovered API group over static', () => {
    const map = buildResourceToApiGroupMap([
      { name: 'pods', apiGroup: '' },
      { name: 'pods', apiGroup: 'metrics.k8s.io' },
    ]);

    expect(map.get('pods')).toBe('');
  });

  it('should fill names missing from discovery from static categories', () => {
    const map = buildResourceToApiGroupMap([{ name: 'widgets', apiGroup: 'example.io' }]);

    expect(map.get('widgets')).toBe('example.io');
    expect(map.get('notebooks')).toBe('kubeflow.org');
  });
});
