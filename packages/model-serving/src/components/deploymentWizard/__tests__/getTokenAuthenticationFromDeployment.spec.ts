import type { SecretKind } from '@odh-dashboard/k8s-core';
import { getTokenAuthenticationFromDeployment } from '../utils';
import type { Deployment } from '../../../../extension-points';

const buildDeployment = (annotations?: Record<string, string>, resourceVersion?: string) =>
  ({
    modelServingPlatformId: 'llmd-serving',
    model: {
      apiVersion: 'llmd.ai/v1alpha1',
      kind: 'LLMInferenceService',
      metadata: {
        name: 'test-model',
        namespace: 'test-ns',
        ...(annotations ? { annotations } : {}),
        ...(resourceVersion ? { resourceVersion } : {}),
      },
    },
  } as unknown as Deployment);

const mockSecret = (name: string, uid: string, displayName?: string) =>
  ({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      namespace: 'test-ns',
      uid,
      ...(displayName ? { annotations: { 'openshift.io/display-name': displayName } } : {}),
    },
  } as SecretKind);

describe('getTokenAuthenticationFromDeployment', () => {
  it('should return an empty list when auth is explicitly disabled, even if not persisted', () => {
    const deployment = buildDeployment({ 'security.opendatahub.io/enable-auth': 'false' });
    const result = getTokenAuthenticationFromDeployment(deployment, []);
    expect(result).toStrictEqual([]);
  });

  it('should return undefined for an unpersisted deployment with auth enabled so the field default applies', () => {
    const deployment = buildDeployment();
    const result = getTokenAuthenticationFromDeployment(deployment, []);
    expect(result).toBeUndefined();
  });

  it('should map the deployment secrets to tokens for a persisted deployment', () => {
    const deployment = buildDeployment(undefined, '123');
    const secrets = [mockSecret('token-secret', 'uid-1', 'My Token')];
    const result = getTokenAuthenticationFromDeployment(deployment, secrets);
    expect(result).toStrictEqual([
      { uuid: 'uid-1', k8sName: 'token-secret', displayName: 'My Token', error: '' },
    ]);
  });

  it('should return an empty list for a persisted deployment with auth enabled but no secrets', () => {
    const deployment = buildDeployment(undefined, '123');
    const result = getTokenAuthenticationFromDeployment(deployment, []);
    expect(result).toStrictEqual([]);
  });
});
