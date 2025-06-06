import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { addOwnerReference } from '#~/api/k8sUtils';

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
