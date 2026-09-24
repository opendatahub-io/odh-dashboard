import { createNonDestructivePatches, createPatchesFromDiff, groupVersionKind } from '../k8sUtils';

describe('groupVersionKind', () => {
  it('maps core and grouped Kubernetes models', () => {
    expect(groupVersionKind({ apiVersion: 'v1', kind: 'Pod', plural: 'pods' })).toStrictEqual({
      group: undefined,
      version: 'v1',
      kind: 'Pod',
    });
    expect(
      groupVersionKind({
        apiGroup: 'apps',
        apiVersion: 'v1',
        kind: 'Deployment',
        plural: 'deployments',
      }),
    ).toStrictEqual({
      group: 'apps',
      version: 'v1',
      kind: 'Deployment',
    });
  });
});

describe('createPatchesFromDiff', () => {
  it('creates deterministic patches while excluding Kubernetes-managed fields', () => {
    const oldResource = {
      metadata: {
        name: 'model',
        resourceVersion: '1',
        labels: { retained: 'true', removed: 'true' },
      },
      spec: { replicas: 1, args: ['old'] },
      status: { ready: false },
    };
    const newResource = {
      metadata: {
        name: 'model',
        resourceVersion: '2',
        labels: { retained: 'true', 'example.com/key~name': 'new' },
      },
      spec: { replicas: 2, args: ['new'] },
      status: { ready: true },
    };

    expect(createPatchesFromDiff(oldResource, newResource)).toStrictEqual([
      { op: 'add', path: '/metadata/labels/example.com~1key~0name', value: 'new' },
      { op: 'remove', path: '/metadata/labels/removed' },
      { op: 'replace', path: '/spec/replicas', value: 2 },
      { op: 'replace', path: '/spec/args', value: ['new'] },
    ]);
    expect(oldResource.metadata.resourceVersion).toBe('1');
  });

  it('can omit destructive remove operations', () => {
    expect(createNonDestructivePatches({ keep: 1, remove: true }, { keep: 2 })).toStrictEqual([
      { op: 'replace', path: '/keep', value: 2 },
    ]);
  });
});
