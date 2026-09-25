import { PodModel } from '../models';

describe('PodModel', () => {
  it('describes the core Kubernetes Pod resource', () => {
    expect(PodModel).toStrictEqual({
      apiVersion: 'v1',
      kind: 'Pod',
      plural: 'pods',
    });
  });
});
