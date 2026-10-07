import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import type { DraLookups } from '../types';
import { resolveWorkloadClaims, selectWorkloadPod } from '../workloadClaims';

const TEMPLATE = 'gpu-template';
const GENERATED_RC = 'wb-0-gpu-abc12';
const EMPTY: DraLookups = { claims: {}, templates: {} };

describe('selectWorkloadPod', () => {
  it('should return undefined for no Pods', () => {
    expect(selectWorkloadPod([], 'uid')).toBeUndefined();
  });

  it('should prefer the Pod with the running uid', () => {
    const older = mockPodK8sResource({ name: 'old', uid: 'old', creationTimestamp: '2026-01-01' });
    const running = mockPodK8sResource({
      name: 'run',
      uid: 'run',
      creationTimestamp: '2025-01-01',
    });

    expect(selectWorkloadPod([older, running], 'run')).toBe(running);
  });

  it('should fall back to the newest Pod, then to the name', () => {
    const a = mockPodK8sResource({ name: 'a', uid: 'a', creationTimestamp: '2026-01-01' });
    const b = mockPodK8sResource({ name: 'b', uid: 'b', creationTimestamp: '2026-02-01' });
    const c = mockPodK8sResource({ name: 'c', uid: 'c', creationTimestamp: '2026-02-01' });

    expect(selectWorkloadPod([a, b, c], 'missing')).toBe(b);
    expect(selectWorkloadPod([a, c])).toBe(c);
  });

  it.each<[string, Partial<Parameters<typeof mockPodK8sResource>[0]>]>([
    ['terminating', { deletionTimestamp: '2026-03-01T00:00:00Z' }],
    ['failed', { phase: 'Failed' }],
    ['succeeded', { phase: 'Succeeded' }],
  ])('should skip a newer %s Pod even when it carries the running uid', (_l, opts) => {
    const live = mockPodK8sResource({ name: 'live', uid: 'live', creationTimestamp: '2026-01-01' });
    const stale = mockPodK8sResource({
      name: 'stale',
      uid: 'stale',
      creationTimestamp: '2026-02-01',
      ...opts,
    });

    expect(selectWorkloadPod([stale, live])).toBe(live);
    expect(selectWorkloadPod([stale])).toBeUndefined();
    expect(selectWorkloadPod([stale, live], 'stale')).toBe(live);
  });
});

describe('resolveWorkloadClaims', () => {
  const pod = mockPodK8sResource({
    name: 'wb-0',
    nodeName: 'worker-1',
    resourceClaims: [
      { name: 'gpu', resourceClaimTemplateName: TEMPLATE },
      { name: 'other', resourceClaimTemplateName: TEMPLATE },
    ],
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
    containerClaims: [{ name: 'gpu' }],
  });

  it('should copy the Pod identity and resolve every declared claim', () => {
    const group = resolveWorkloadClaims({ pod }, EMPTY, { containerNames: ['wb-0'] });

    expect(group.pod).toEqual({ name: 'wb-0', nodeName: 'worker-1' });
    expect(group.claims.map((claim) => claim.reference.alias)).toEqual(['gpu', 'other']);
    expect(group.claims[0].resourceClaimName).toBe(GENERATED_RC);
    expect(group.claims[0].reference.consumers).toEqual([
      { containerName: 'wb-0', requestName: undefined },
    ]);
    expect(group.claims[1].reference.consumers).toEqual([]);
  });

  it('should scope requests to the filtered containers but keep every consumer on the reference', () => {
    const shared = mockPodK8sResource({
      name: 'wb-0',
      resourceClaims: [{ name: 'gpu', resourceClaimName: 'shared-gpu' }],
      containerClaims: [{ name: 'gpu', request: 'main' }],
    });
    shared.spec.containers[1].resources = { claims: [{ name: 'gpu', request: 'side' }] };
    const lookups: DraLookups = {
      claims: {
        'shared-gpu': {
          status: 'loaded',
          resource: mockResourceClaim({
            name: 'shared-gpu',
            requests: [
              { name: 'main', exactly: { deviceClassName: 'a', count: 1 } },
              { name: 'side', exactly: { deviceClassName: 'b', count: 1 } },
            ],
          }),
        },
      },
      templates: {},
    };

    const [claim] = resolveWorkloadClaims({ pod: shared }, lookups, {
      containerNames: ['wb-0'],
    }).claims;

    expect(claim.requests.map((request) => request.name)).toEqual(['main']);
    expect(claim.reference.consumers.map((consumer) => consumer.containerName)).toEqual([
      'wb-0',
      'kube-rbac-proxy',
    ]);
  });

  it("should not follow another container's request names for a claim the filtered ones do not use", () => {
    const shared = mockPodK8sResource({
      name: 'wb-0',
      resourceClaims: [{ name: 'gpu', resourceClaimName: 'shared-gpu' }],
    });
    shared.spec.containers[1].resources = { claims: [{ name: 'gpu', request: 'side' }] };
    const lookups: DraLookups = {
      claims: {
        'shared-gpu': {
          status: 'loaded',
          resource: mockResourceClaim({
            name: 'shared-gpu',
            requests: [
              { name: 'main', exactly: { deviceClassName: 'a', count: 1 } },
              { name: 'side', exactly: { deviceClassName: 'b', count: 1 } },
            ],
          }),
        },
      },
      templates: {},
    };

    const [claim] = resolveWorkloadClaims({ pod: shared }, lookups, {
      containerNames: ['wb-0'],
    }).claims;

    expect(claim.requests.map((request) => request.name)).toEqual(['main', 'side']);
    expect(claim.reference.consumers.map((consumer) => consumer.containerName)).toEqual([
      'kube-rbac-proxy',
    ]);
  });

  it('should never carry a Pod, claim name or allocation for a spec-only source', () => {
    const lookups: DraLookups = {
      claims: {
        [GENERATED_RC]: {
          status: 'loaded',
          resource: mockResourceClaim({
            name: GENERATED_RC,
            allocationResults: [{ request: 'gpu', driver: 'd', pool: 'p', device: 'x' }],
          }),
        },
      },
      templates: {},
    };
    const group = resolveWorkloadClaims({ spec: pod.spec }, lookups, {
      containerNames: ['wb-0'],
    });

    expect(group.pod).toBeUndefined();
    expect(group.claims[0].resourceClaimName).toBeUndefined();
    expect(group.claims[0].state).toEqual({ status: 'pending', reason: 'generation' });
  });
});
