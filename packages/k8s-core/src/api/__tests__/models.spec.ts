import { PodModel, ResourceClaimModel, ResourceClaimTemplateModel } from '../models';

describe('PodModel', () => {
  it('should describe the core Kubernetes Pod resource', () => {
    expect(PodModel).toStrictEqual({
      apiVersion: 'v1',
      kind: 'Pod',
      plural: 'pods',
    });
  });
});

describe('ResourceClaimModel', () => {
  it('should describe the resource.k8s.io/v1 ResourceClaim resource', () => {
    expect(ResourceClaimModel).toStrictEqual({
      apiVersion: 'v1',
      apiGroup: 'resource.k8s.io',
      kind: 'ResourceClaim',
      plural: 'resourceclaims',
    });
  });
});

describe('ResourceClaimTemplateModel', () => {
  it('should describe the resource.k8s.io/v1 ResourceClaimTemplate resource', () => {
    expect(ResourceClaimTemplateModel).toStrictEqual({
      apiVersion: 'v1',
      apiGroup: 'resource.k8s.io',
      kind: 'ResourceClaimTemplate',
      plural: 'resourceclaimtemplates',
    });
  });
});
