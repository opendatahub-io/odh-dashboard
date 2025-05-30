import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { addOwnerReference, deepReplaceUndefinedWithNull } from '#~/api/k8sUtils';

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

describe('deepReplaceUndefinedWithNull', () => {
  it('replaces undefined with null in object properties', () => {
    expect(deepReplaceUndefinedWithNull({ a: 1, b: undefined })).toEqual({ a: 1, b: null });
    expect(deepReplaceUndefinedWithNull({ a: { b: undefined } })).toEqual({ a: { b: null } });
  });

  it('does not replace undefined with null in arrays', () => {
    expect(deepReplaceUndefinedWithNull([1, undefined, 3])).toEqual([1, undefined, 3]);
    expect(deepReplaceUndefinedWithNull([undefined, undefined])).toEqual([undefined, undefined]);
  });

  it('recurses into objects inside arrays', () => {
    expect(deepReplaceUndefinedWithNull([{ a: undefined }, 2])).toEqual([{ a: null }, 2]);
    expect(deepReplaceUndefinedWithNull([1, { b: undefined }, 3])).toEqual([1, { b: null }, 3]);
  });

  it('leaves primitives, null, false, 0, and empty string unchanged', () => {
    expect(deepReplaceUndefinedWithNull(5)).toBe(5);
    expect(deepReplaceUndefinedWithNull('test')).toBe('test');
    expect(deepReplaceUndefinedWithNull(null)).toBe(null);
    expect(deepReplaceUndefinedWithNull(false)).toBe(false);
    expect(deepReplaceUndefinedWithNull(0)).toBe(0);
    expect(deepReplaceUndefinedWithNull('')).toBe('');
  });

  it('handles deeply nested structures', () => {
    const input = { a: [{ b: undefined }, { c: [undefined, 2] }], d: undefined };
    const expected = { a: [{ b: null }, { c: [undefined, 2] }], d: null };
    expect(deepReplaceUndefinedWithNull(input)).toEqual(expected);
  });
});
