import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import {
  addOwnerReference,
  createPatchesFromDiff,
  createNonDestructivePatches,
} from '#~/api/k8sUtils';

const resource = mockSecretK8sResource({});

describe('addOwnerReference', () => {
  it('should not add any owner reference for undefined owner', () => {
    const target = addOwnerReference(resource, undefined);
    expect(target).toBe(resource);
    expect(target.metadata.ownerReferences).toBeUndefined();
  });

  it('should add owner reference only once', () => {
    const owner = mockProjectK8sResource({});
    let target = addOwnerReference(resource, owner);
    expect(target).not.toBe(resource);
    expect(target).toStrictEqual({
      ...resource,
      metadata: {
        ...resource.metadata,
        ownerReferences: [
          {
            uid: owner.metadata.uid,
            name: owner.metadata.name,
            apiVersion: owner.apiVersion,
            kind: owner.kind,
            blockOwnerDeletion: false,
          },
        ],
      },
    });
    target = addOwnerReference(resource, owner);
    expect(target.metadata.ownerReferences).toHaveLength(1);
  });

  it('should not add owner reference when uid is not present', () => {
    const owner = mockProjectK8sResource({});
    owner.metadata.uid = '';
    const target = addOwnerReference(resource, owner);
    expect(target).not.toBe(resource);
    expect(target).toStrictEqual({
      ...resource,
      metadata: {
        ...resource.metadata,
        ownerReferences: [],
      },
    });
  });

  it('should not add owner reference when name is not present', () => {
    const owner = mockProjectK8sResource({});
    owner.metadata.name = '';
    const target = addOwnerReference(resource, owner);
    expect(target).not.toBe(resource);
    expect(target).toStrictEqual({
      ...resource,
      metadata: {
        ...resource.metadata,
        ownerReferences: [],
      },
    });
  });

  it('should return owner reference when owner reference uid is equal to owner uid', () => {
    const owner = mockProjectK8sResource({});
    const resourceMock = mockSecretK8sResource({ uid: 'test2' });
    resourceMock.metadata.ownerReferences = [{ apiVersion: '', kind: '', name: '', uid: 'test2' }];
    const target = addOwnerReference(resourceMock, owner);
    expect(target).not.toBe(resourceMock);
    expect(target).toStrictEqual({
      ...resourceMock,
      metadata: {
        ...resourceMock.metadata,
        ownerReferences: resourceMock.metadata.ownerReferences,
      },
    });
  });
  it('should override blockOwnerDeletion', () => {
    const owner = mockProjectK8sResource({});
    const target = addOwnerReference(resource, owner, true);
    expect(target).toStrictEqual({
      ...resource,
      metadata: {
        ...resource.metadata,
        ownerReferences: [
          {
            uid: owner.metadata.uid,
            name: owner.metadata.name,
            apiVersion: owner.apiVersion,
            kind: owner.kind,
            blockOwnerDeletion: true,
          },
        ],
      },
    });
  });
});

describe('createPatchesFromDiff', () => {
  describe('basic operations', () => {
    it('should return empty array when objects are identical', () => {
      const obj = { spec: { replicas: 1, image: 'v1' } };
      const patches = createPatchesFromDiff(obj, obj);
      expect(patches).toEqual([]);
    });

    it('should generate replace patches for changed primitive values', () => {
      const oldObj = { spec: { replicas: 1, image: 'v1' } };
      const newObj = { spec: { replicas: 3, image: 'v2' } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([
        { op: 'replace', path: '/spec/replicas', value: 3 },
        { op: 'replace', path: '/spec/image', value: 'v2' },
      ]);
    });

    it('should generate add patches for new fields', () => {
      const oldObj = { spec: { replicas: 1 } };
      const newObj = { spec: { replicas: 1, image: 'v1' } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'add', path: '/spec/image', value: 'v1' }]);
    });

    it('should generate remove patches for deleted fields', () => {
      const oldObj = { spec: { replicas: 1, image: 'v1' } };
      const newObj = { spec: { replicas: 1 } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'remove', path: '/spec/image' }]);
    });

    it('should remove field when value is null', () => {
      const oldObj = { spec: { value: 'test' } };
      const newObj = { spec: { value: null } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'remove', path: '/spec/value' }]);
    });

    it('should remove field when value is undefined', () => {
      const oldObj = { spec: { value: 'test' } };
      const newObj = { spec: { value: undefined } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'remove', path: '/spec/value' }]);
    });
  });

  describe('nested objects', () => {
    it('should handle deeply nested changes', () => {
      const oldObj = {
        spec: {
          template: {
            spec: {
              containers: [{ name: 'main', image: 'v1' }],
            },
          },
        },
      };
      const newObj = {
        spec: {
          template: {
            spec: {
              containers: [{ name: 'main', image: 'v2' }],
            },
          },
        },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([
        {
          op: 'replace',
          path: '/spec/template/spec/containers',
          value: [{ name: 'main', image: 'v2' }],
        },
      ]);
    });

    it('should handle adding nested objects', () => {
      const oldObj = { spec: { replicas: 1 } };
      const newObj = {
        spec: {
          replicas: 1,
          resources: {
            limits: { cpu: '1', memory: '2Gi' },
          },
        },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([
        {
          op: 'add',
          path: '/spec/resources',
          value: { limits: { cpu: '1', memory: '2Gi' } },
        },
      ]);
    });

    it('should handle removing nested objects', () => {
      const oldObj = {
        spec: {
          replicas: 1,
          resources: {
            limits: { cpu: '1', memory: '2Gi' },
          },
        },
      };
      const newObj = { spec: { replicas: 1 } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'remove', path: '/spec/resources' }]);
    });
  });

  describe('array handling', () => {
    it('should replace entire array when changed', () => {
      const oldObj = { spec: { items: [1, 2, 3] } };
      const newObj = { spec: { items: [1, 2, 4] } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/items', value: [1, 2, 4] }]);
    });

    it('should not generate patch for identical arrays', () => {
      const oldObj = { spec: { items: [1, 2, 3] } };
      const newObj = { spec: { items: [1, 2, 3] } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([]);
    });

    it('should handle array of objects', () => {
      const oldObj = { spec: { envVars: [{ name: 'VAR1', value: 'val1' }] } };
      const newObj = {
        spec: {
          envVars: [
            { name: 'VAR1', value: 'val1' },
            { name: 'VAR2', value: 'val2' },
          ],
        },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([
        {
          op: 'replace',
          path: '/spec/envVars',
          value: [
            { name: 'VAR1', value: 'val1' },
            { name: 'VAR2', value: 'val2' },
          ],
        },
      ]);
    });
  });

  describe('kubernetes managed fields filtering', () => {
    it('should ignore status field', () => {
      const oldObj = {
        spec: { replicas: 1 },
        status: { ready: true, phase: 'Running' },
      };
      const newObj = {
        spec: { replicas: 3 },
        status: { ready: false, phase: 'Pending' },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/replicas', value: 3 }]);
    });

    it('should ignore resourceVersion in metadata', () => {
      const oldObj = {
        metadata: { name: 'test', resourceVersion: '12345' },
        spec: { replicas: 1 },
      };
      const newObj = {
        metadata: { name: 'test', resourceVersion: '99999' },
        spec: { replicas: 3 },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/replicas', value: 3 }]);
    });

    it('should ignore multiple managed metadata fields', () => {
      const oldObj = {
        metadata: {
          name: 'test',
          resourceVersion: '12345',
          uid: 'abc-123',
          generation: 1,
          creationTimestamp: '2024-01-01T00:00:00Z',
          managedFields: [],
          labels: { app: 'old' },
        },
        spec: { replicas: 1 },
      };
      const newObj = {
        metadata: {
          name: 'test',
          resourceVersion: '99999',
          uid: 'xyz-789',
          generation: 2,
          creationTimestamp: '2024-01-02T00:00:00Z',
          managedFields: [{ manager: 'test' }],
          labels: { app: 'new' },
        },
        spec: { replicas: 1 },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/metadata/labels/app', value: 'new' }]);
    });

    it('should allow patching user-managed metadata fields', () => {
      const oldObj = {
        metadata: {
          name: 'test',
          labels: { app: 'old' },
          annotations: { description: 'old' },
        },
      };
      const newObj = {
        metadata: {
          name: 'test',
          labels: { app: 'new', version: 'v2' },
          annotations: { description: 'new' },
        },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toContainEqual({ op: 'replace', path: '/metadata/labels/app', value: 'new' });
      expect(patches).toContainEqual({ op: 'add', path: '/metadata/labels/version', value: 'v2' });
      expect(patches).toContainEqual({
        op: 'replace',
        path: '/metadata/annotations/description',
        value: 'new',
      });
    });

    it('should not generate patches for ownerReferences', () => {
      const oldObj = {
        metadata: {
          name: 'test',
          ownerReferences: [{ uid: 'owner1', name: 'parent1' }],
        },
        spec: { replicas: 1 },
      };
      const newObj = {
        metadata: {
          name: 'test',
          ownerReferences: [{ uid: 'owner2', name: 'parent2' }],
        },
        spec: { replicas: 3 },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/replicas', value: 3 }]);
    });
  });

  describe('special characters handling', () => {
    it('should escape forward slashes in keys', () => {
      const oldObj = {
        metadata: {
          annotations: {
            'app.kubernetes.io/name': 'old-value',
          },
        },
      };
      const newObj = {
        metadata: {
          annotations: {
            'app.kubernetes.io/name': 'new-value',
          },
        },
      };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([
        {
          op: 'replace',
          path: '/metadata/annotations/app.kubernetes.io~1name',
          value: 'new-value',
        },
      ]);
    });

    it('should escape tildes in keys', () => {
      const oldObj = { spec: { 'key~with~tildes': 'old' } };
      const newObj = { spec: { 'key~with~tildes': 'new' } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/key~0with~0tildes', value: 'new' }]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const patches = createPatchesFromDiff({}, {});
      expect(patches).toEqual([]);
    });

    it('should handle adding fields to empty object', () => {
      const oldObj = {};
      const newObj = { spec: { replicas: 1 } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'add', path: '/spec', value: { replicas: 1 } }]);
    });

    it('should handle boolean values', () => {
      const oldObj = { spec: { enabled: true } };
      const newObj = { spec: { enabled: false } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/enabled', value: false }]);
    });

    it('should handle number zero', () => {
      const oldObj = { spec: { replicas: 1 } };
      const newObj = { spec: { replicas: 0 } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/replicas', value: 0 }]);
    });

    it('should handle empty strings', () => {
      const oldObj = { spec: { value: 'test' } };
      const newObj = { spec: { value: '' } };
      const patches = createPatchesFromDiff(oldObj, newObj);
      expect(patches).toEqual([{ op: 'replace', path: '/spec/value', value: '' }]);
    });
  });

  describe('with basePath parameter', () => {
    it('should apply basePath to all patches', () => {
      const oldObj = { replicas: 1 };
      const newObj = { replicas: 3 };
      const patches = createPatchesFromDiff(oldObj, newObj, '/spec');
      expect(patches).toEqual([{ op: 'replace', path: '/spec/replicas', value: 3 }]);
    });
  });
});

describe('createNonDestructivePatches', () => {
  it('should filter out remove operations', () => {
    const oldObj = { spec: { replicas: 1, image: 'v1', oldField: 'remove-me' } };
    const newObj = { spec: { replicas: 3, image: 'v2' } };
    const patches = createNonDestructivePatches(oldObj, newObj);
    expect(patches).toEqual([
      { op: 'replace', path: '/spec/replicas', value: 3 },
      { op: 'replace', path: '/spec/image', value: 'v2' },
    ]);
    expect(patches).not.toContainEqual(expect.objectContaining({ op: 'remove' }));
  });

  it('should include add operations', () => {
    const oldObj = { spec: { replicas: 1 } };
    const newObj = { spec: { replicas: 1, image: 'v1' } };
    const patches = createNonDestructivePatches(oldObj, newObj);
    expect(patches).toEqual([{ op: 'add', path: '/spec/image', value: 'v1' }]);
  });

  it('should include replace operations', () => {
    const oldObj = { spec: { replicas: 1 } };
    const newObj = { spec: { replicas: 3 } };
    const patches = createNonDestructivePatches(oldObj, newObj);
    expect(patches).toEqual([{ op: 'replace', path: '/spec/replicas', value: 3 }]);
  });

  it('should still filter out managed k8s fields', () => {
    const oldObj = {
      metadata: { resourceVersion: '12345' },
      spec: { replicas: 1 },
      status: { ready: true },
    };
    const newObj = {
      metadata: { resourceVersion: '99999' },
      spec: { replicas: 3 },
      status: { ready: false },
    };
    const patches = createNonDestructivePatches(oldObj, newObj);
    expect(patches).toEqual([{ op: 'replace', path: '/spec/replicas', value: 3 }]);
  });
});
