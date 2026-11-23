import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { resolveDeploymentEventSources } from '../resolveDeploymentEventSources';

const resource = (uid: string, owner: string): K8sResourceCommon => ({
  apiVersion: 'v1',
  kind: 'TestKind',
  metadata: {
    uid,
    ownerReferences: [{ uid: owner, kind: 'TestKind', apiVersion: 'v1', name: 'test' }],
  },
});

describe('resolveDeploymentEventSources', () => {
  it('should retain the root even without descendants', () => {
    expect(resolveDeploymentEventSources('root', [])).toEqual(['root']);
  });

  it('should find a zero-Pod ReplicaSet and exclude an old same-name model branch', () => {
    expect(
      resolveDeploymentEventSources('root', [
        resource('rs', 'deployment'),
        resource('deployment', 'root'),
        resource('old-rs', 'old-root'),
      ]),
    ).toEqual(['root', 'deployment', 'rs']);
  });

  it('should include prefill, decode and EPP through alternating Pod and controller edges', () => {
    const edges = [
      ['prefill-lws', 'root'],
      ['leader-sts', 'prefill-lws'],
      ['leader-pod', 'leader-sts'],
      ['worker-sts', 'leader-pod'],
      ['worker-pod', 'worker-sts'],
      ['decode', 'root'],
      ['decode-rs', 'decode'],
      ['decode-pod', 'decode-rs'],
      ['epp', 'root'],
      ['epp-rs', 'epp'],
      ['epp-pod', 'epp-rs'],
    ];
    expect(
      new Set(
        resolveDeploymentEventSources(
          'root',
          edges.map(([uid, owner]) => resource(uid, owner)).reverse(),
        ),
      ),
    ).toEqual(new Set(['root', ...edges.map(([uid]) => uid)]));
  });

  it('should skip malformed metadata and terminate on duplicate and cyclic UIDs', () => {
    const invalid = {
      metadata: { uid: 'bad', ownerReferences: 'root' },
    } as unknown as K8sResourceCommon;
    expect(
      resolveDeploymentEventSources('root', [
        invalid,
        resource('', 'root'),
        resource('child', 'root'),
        resource('child', 'root'),
        resource('root', 'child'),
      ]),
    ).toEqual(['root', 'child']);
  });
});
