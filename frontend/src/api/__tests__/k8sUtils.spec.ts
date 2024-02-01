import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { addOwnerReference } from '~/api/k8sUtils';

describe('addOwnerReference', () => {
  it('should not add any owner reference for undefined owner', () => {
    const resource = mockSecretK8sResource({});
    const target = addOwnerReference(resource, undefined);
    expect(target).toBe(resource);
    expect(target.metadata.ownerReferences).toBeUndefined();
  });

  it('should add owner reference only once', () => {
    const resource = mockSecretK8sResource({});
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

  it('should override blockOwnerDeletion', () => {
    const resource = mockSecretK8sResource({});
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
