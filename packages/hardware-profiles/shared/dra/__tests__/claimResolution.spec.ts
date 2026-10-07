import type { PodKind, PodResourceClaim, PodResourceClaimStatus } from '@odh-dashboard/k8s-core';
import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import type {
  DeviceRequest,
  DeviceRequestAllocationResult,
  ResourceClaimKind,
} from '@odh-dashboard/k8s-core/dra/types';
import {
  getAllocatedDevices,
  getClaimLookupNames,
  getClaimsAggregateState,
  getConsumedRequestNames,
  getDeclaredClaimReferences,
  getPodClaimReferences,
  hasDeclaredClaims,
  resolvePodClaim,
  resolvePodClaims,
} from '../claimResolution';
import { normalizeDeviceRequests } from '../requestNormalizer';
import type { ClaimsAggregateState, DraLookups, PodClaimReference, ResolvedClaim } from '../types';

const GPU_CLASS = 'gpu.nvidia.com';
const TEMPLATE = 'gpu-template';
const GENERATED_RC = 'workbench-0-gpu-x7k2p';
const DIRECT_RC = 'shared-gpu-claim';
const DRIVER = 'driver.example.com';

type ContainerSpec = { name: string; claims?: { name: string; request?: string }[] };

const mockPod = ({
  containers = [{ name: 'main', claims: [{ name: 'gpu' }] }],
  initContainers = [],
  resourceClaims = [{ name: 'gpu', resourceClaimTemplateName: TEMPLATE }],
  resourceClaimStatuses,
}: {
  containers?: ContainerSpec[];
  initContainers?: ContainerSpec[];
  resourceClaims?: PodResourceClaim[];
  resourceClaimStatuses?: PodResourceClaimStatus[];
}): PodKind => {
  const toContainer = (container: ContainerSpec) => ({
    name: container.name,
    image: 'quay.io/example/image:latest',
    env: [],
    resources: container.claims ? { claims: container.claims } : undefined,
  });
  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { name: 'workbench-0', namespace: 'test-project' },
    spec: {
      containers: containers.map(toContainer),
      initContainers: initContainers.map(toContainer),
      resourceClaims,
      nodeName: 'worker-1',
    },
    status: { phase: 'Running', resourceClaimStatuses },
  };
};

const generatedPod = (): PodKind =>
  mockPod({ resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }] });

const directPod = (): PodKind =>
  mockPod({
    resourceClaims: [{ name: 'gpu', resourceClaimName: DIRECT_RC }],
    // Status must be ignored for direct claims even if something odd is present.
    resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: 'should-not-be-used' }],
  });

const exactRequests = (): DeviceRequest[] => [
  { name: 'gpu', exactly: { deviceClassName: GPU_CLASS, count: 2 } },
];

const firstAvailableRequests = (): DeviceRequest[] => [
  {
    name: 'main',
    firstAvailable: [
      { name: 'large', deviceClassName: GPU_CLASS, count: 2 },
      { name: 'subrequest', deviceClassName: 'mig.nvidia.com' },
    ],
  },
];

const result = (
  request: string,
  device: string,
  driver = GPU_CLASS,
): DeviceRequestAllocationResult => ({ request, driver, pool: 'worker-1', device });

const allocatedClaim = (
  name: string,
  requests: DeviceRequest[],
  allocationResults: DeviceRequestAllocationResult[],
): ResourceClaimKind => mockResourceClaim({ name, requests, allocationResults });

const lookups = (overrides: Partial<DraLookups> = {}): DraLookups => ({
  claims: {},
  templates: {},
  ...overrides,
});

describe('getPodClaimReferences', () => {
  it('should resolve a generated claim name from Pod status only', () => {
    expect(getPodClaimReferences(generatedPod())).toEqual<PodClaimReference[]>([
      {
        alias: 'gpu',
        source: {
          type: 'template',
          resourceClaimTemplateName: TEMPLATE,
          resourceClaimName: GENERATED_RC,
          generation: 'generated',
        },
        consumers: [{ containerName: 'main', requestName: undefined }],
      },
    ]);
  });

  it('should mark a template claim without a status entry as pending generation', () => {
    const [reference] = getPodClaimReferences(mockPod({}));
    expect(reference.source).toEqual({
      type: 'template',
      resourceClaimTemplateName: TEMPLATE,
      generation: 'pending',
    });
  });

  it('should mark a status entry without a claim name as skipped', () => {
    const [reference] = getPodClaimReferences(
      mockPod({ resourceClaimStatuses: [{ name: 'gpu' }] }),
    );
    expect(reference.source).toEqual({
      type: 'template',
      resourceClaimTemplateName: TEMPLATE,
      resourceClaimName: undefined,
      generation: 'skipped',
    });
  });

  it('should resolve a direct claim without consulting Pod status', () => {
    const [reference] = getPodClaimReferences(directPod());
    expect(reference.source).toEqual({ type: 'direct', resourceClaimName: DIRECT_RC });
  });

  it('should mark a declaration with neither reference as unknown', () => {
    const [reference] = getPodClaimReferences(mockPod({ resourceClaims: [{ name: 'gpu' }] }));
    expect(reference.source).toEqual({ type: 'unknown' });
  });

  it('should handle a pod without init containers', () => {
    const pod = mockPod({});
    delete pod.spec.initContainers;
    expect(getPodClaimReferences(pod)[0].consumers).toEqual([
      { containerName: 'main', requestName: undefined },
    ]);
  });

  it('should preserve declaration order and collect consumers across containers', () => {
    const pod = mockPod({
      containers: [
        {
          name: 'main',
          claims: [
            { name: 'gpu', request: 'a' },
            { name: 'gpu', request: 'b' },
          ],
        },
        { name: 'sidecar', claims: [{ name: 'other' }] },
        { name: 'plain' },
      ],
      initContainers: [{ name: 'init', claims: [{ name: 'gpu' }] }],
      resourceClaims: [
        { name: 'other', resourceClaimName: 'other-rc' },
        { name: 'gpu', resourceClaimName: DIRECT_RC },
        { name: 'unused', resourceClaimName: 'unused-rc' },
      ],
    });
    const references = getPodClaimReferences(pod);
    expect(references.map((reference) => reference.alias)).toEqual(['other', 'gpu', 'unused']);
    expect(references[1].consumers).toEqual([
      { containerName: 'init', requestName: undefined },
      { containerName: 'main', requestName: 'a' },
      { containerName: 'main', requestName: 'b' },
    ]);
    expect(references[2].consumers).toEqual([]);
  });

  it('should filter to claims consumed by the named containers', () => {
    const pod = mockPod({
      containers: [
        { name: 'main', claims: [{ name: 'gpu', request: 'a' }] },
        { name: 'sidecar', claims: [{ name: 'gpu', request: 'b' }, { name: 'other' }] },
      ],
      resourceClaims: [
        { name: 'gpu', resourceClaimName: DIRECT_RC },
        { name: 'other', resourceClaimName: 'other-rc' },
      ],
    });
    const references = getPodClaimReferences(pod, { containerNames: ['main'] });
    expect(references).toHaveLength(1);
    expect(references[0].alias).toBe('gpu');
    expect(references[0].consumers).toEqual([{ containerName: 'main', requestName: 'a' }]);
  });

  it('should return an empty list without declared claims', () => {
    expect(getPodClaimReferences(mockPod({ resourceClaims: [] }))).toEqual([]);
    const pod = mockPod({});
    delete pod.spec.resourceClaims;
    expect(getPodClaimReferences(pod)).toEqual([]);
  });

  it('should return an empty list when the container filter matches nothing', () => {
    expect(getPodClaimReferences(mockPod({}), { containerNames: ['nope'] })).toEqual([]);
  });
});

describe('getConsumedRequestNames', () => {
  it('should return undefined when no consumer exists', () => {
    expect(getConsumedRequestNames([])).toBeUndefined();
  });

  it('should return undefined when any consumer wants every request', () => {
    expect(
      getConsumedRequestNames([{ containerName: 'a', requestName: 'x' }, { containerName: 'b' }]),
    ).toBeUndefined();
  });

  it('should collect the named requests', () => {
    expect(
      getConsumedRequestNames([
        { containerName: 'a', requestName: 'x' },
        { containerName: 'b', requestName: 'y' },
        { containerName: 'c', requestName: 'x' },
      ]),
    ).toEqual(new Set(['x', 'y']));
  });
});

describe('getAllocatedDevices', () => {
  it('should return multiple devices for one request in result order', () => {
    const claim = allocatedClaim(GENERATED_RC, exactRequests(), [
      result('gpu', 'gpu-3', DRIVER),
      result('gpu', 'gpu-1', DRIVER),
    ]);
    const devices = getAllocatedDevices(claim, normalizeDeviceRequests(exactRequests()));
    expect(devices.map((device) => device.result.device)).toEqual(['gpu-3', 'gpu-1']);
    expect(devices[0]).toEqual(
      expect.objectContaining({
        requestName: 'gpu',
        subrequestName: undefined,
        requestedDeviceClassName: GPU_CLASS,
      }),
    );
    expect(devices[0].result.driver).toBe(DRIVER);
  });

  it('should map main/subrequest back to the chosen firstAvailable alternative', () => {
    const claim = allocatedClaim(GENERATED_RC, firstAvailableRequests(), [
      result('main/subrequest', 'mig-1g.5gb-0', DRIVER),
    ]);
    const [device] = getAllocatedDevices(claim, normalizeDeviceRequests(firstAvailableRequests()));
    expect(device.requestName).toBe('main');
    expect(device.subrequestName).toBe('subrequest');
    expect(device.alternative?.name).toBe('subrequest');
    // Class comes from the spec alternative, not from the result driver.
    expect(device.requestedDeviceClassName).toBe('mig.nvidia.com');
    expect(device.result.driver).toBe(DRIVER);
  });

  it('should keep a result whose request is not in the spec', () => {
    const claim = allocatedClaim(GENERATED_RC, exactRequests(), [result('ghost', 'gpu-0')]);
    const [device] = getAllocatedDevices(claim, normalizeDeviceRequests(exactRequests()));
    expect(device.request).toBeUndefined();
    expect(device.requestedDeviceClassName).toBeUndefined();
  });

  it('should apply a request filter', () => {
    const requests: DeviceRequest[] = [
      { name: 'a', exactly: { deviceClassName: GPU_CLASS } },
      { name: 'b', exactly: { deviceClassName: GPU_CLASS } },
    ];
    const claim = allocatedClaim(GENERATED_RC, requests, [
      result('a', 'gpu-0'),
      result('b', 'gpu-1'),
    ]);
    const devices = getAllocatedDevices(claim, normalizeDeviceRequests(requests), new Set(['b']));
    expect(devices.map((device) => device.result.device)).toEqual(['gpu-1']);
  });

  it('should return an empty list without an allocation', () => {
    const claim = mockResourceClaim({ requests: exactRequests() });
    expect(getAllocatedDevices(claim, normalizeDeviceRequests(exactRequests()))).toEqual([]);
  });
});

describe('resolvePodClaim', () => {
  const reference = (pod: PodKind): PodClaimReference => getPodClaimReferences(pod)[0];

  it('should treat a claim named like an Object prototype key as not yet looked up', () => {
    const direct: PodClaimReference = {
      alias: 'gpu',
      source: { type: 'direct', resourceClaimName: 'constructor' },
      consumers: [],
    };

    const resolved = resolvePodClaim(direct, { claims: {}, templates: {} });

    expect(resolved.state).toEqual({ status: 'loading' });
    expect(resolved.resourceClaimName).toBe('constructor');
  });

  it('should prefer the RC spec over the RCT once the claim is loaded', () => {
    const rcRequests: DeviceRequest[] = [{ name: 'gpu', exactly: { deviceClassName: 'rc.class' } }];
    const resolved = resolvePodClaim(
      reference(generatedPod()),
      lookups({
        claims: {
          [GENERATED_RC]: {
            status: 'loaded',
            resource: mockResourceClaim({ requests: rcRequests }),
          },
        },
        templates: {
          [TEMPLATE]: {
            status: 'loaded',
            resource: mockResourceClaimTemplate({ requests: exactRequests() }),
          },
        },
      }),
    );
    expect(resolved.requestsSource).toBe('resourceClaim');
    expect(resolved.requests[0]).toEqual(expect.objectContaining({ name: 'gpu', type: 'exactly' }));
    expect(
      resolved.requests[0].type === 'exactly' && resolved.requests[0].selection.deviceClassName,
    ).toBe('rc.class');
    expect(resolved.state).toEqual({ status: 'pending', reason: 'allocation' });
  });

  it('should fall back to the RCT while the claim is pending generation', () => {
    const resolved = resolvePodClaim(
      reference(mockPod({})),
      lookups({
        templates: {
          [TEMPLATE]: {
            status: 'loaded',
            resource: mockResourceClaimTemplate({ requests: exactRequests() }),
          },
        },
      }),
    );
    expect(resolved.resourceClaimName).toBeUndefined();
    expect(resolved.requestsSource).toBe('resourceClaimTemplate');
    expect(resolved.requests).toHaveLength(1);
    expect(resolved.state).toEqual({ status: 'pending', reason: 'generation' });
    expect(resolved.templateState?.status).toBe('loaded');
  });

  it('should report allocated devices for a generated claim', () => {
    const claim = allocatedClaim(GENERATED_RC, exactRequests(), [
      result('gpu', 'gpu-0'),
      result('gpu', 'gpu-1'),
    ]);
    const resolved = resolvePodClaim(
      reference(generatedPod()),
      lookups({ claims: { [GENERATED_RC]: { status: 'loaded', resource: claim } } }),
    );
    expect(resolved.resourceClaimName).toBe(GENERATED_RC);
    expect(resolved.state.status).toBe('allocated');
    if (resolved.state.status === 'allocated') {
      expect(resolved.state.devices.map((device) => device.result.device)).toEqual([
        'gpu-0',
        'gpu-1',
      ]);
    }
  });

  it('should resolve a direct claim without a template state', () => {
    const claim = allocatedClaim(DIRECT_RC, exactRequests(), [result('gpu', 'gpu-0')]);
    const resolved = resolvePodClaim(
      reference(directPod()),
      lookups({ claims: { [DIRECT_RC]: { status: 'loaded', resource: claim } } }),
    );
    expect(resolved.resourceClaimName).toBe(DIRECT_RC);
    expect(resolved.templateState).toBeUndefined();
    expect(resolved.state.status).toBe('allocated');
  });

  it.each<[string, DraLookups['claims'][string], ResolvedClaim['state']]>([
    ['not started', undefined, { status: 'loading' }],
    ['loading', { status: 'loading' }, { status: 'loading' }],
    ['missing', { status: 'missing' }, { status: 'missing' }],
    ['forbidden', { status: 'forbidden' }, { status: 'forbidden' }],
    [
      'failed',
      { status: 'error', error: new Error('boom') },
      { status: 'error', error: new Error('boom') },
    ],
  ])(
    'should surface the claim lookup state (%s) while keeping the known name',
    (_label, lookup, expected) => {
      const resolved = resolvePodClaim(
        reference(directPod()),
        lookups({ claims: { [DIRECT_RC]: lookup } }),
      );
      expect(resolved.resourceClaimName).toBe(DIRECT_RC);
      expect(resolved.state).toEqual(expected);
      expect(resolved.requests).toEqual([]);
      expect(resolved.requestsSource).toBe('none');
    },
  );

  it.each<[string, DraLookups['claims'][string]]>([
    ['missing', { status: 'missing' }],
    ['forbidden', { status: 'forbidden' }],
    ['error', { status: 'error', error: new Error('boom') }],
    ['loading', { status: 'loading' }],
  ])('should fall back to the RCT while the generated claim lookup is %s', (_label, lookup) => {
    const resolved = resolvePodClaim(
      reference(generatedPod()),
      lookups({
        claims: { [GENERATED_RC]: lookup },
        templates: {
          [TEMPLATE]: {
            status: 'loaded',
            resource: mockResourceClaimTemplate({ requests: exactRequests() }),
          },
        },
      }),
    );
    expect(resolved.resourceClaimName).toBe(GENERATED_RC);
    expect(resolved.state.status).toBe(lookup?.status);
    expect(resolved.requestsSource).toBe('resourceClaimTemplate');
    expect(resolved.requests).toHaveLength(1);
    expect(resolved.templateState?.status).toBe('loaded');
  });

  it('should drop the template state once the claim itself is loaded', () => {
    const resolved = resolvePodClaim(
      reference(generatedPod()),
      lookups({
        claims: {
          [GENERATED_RC]: {
            status: 'loaded',
            resource: mockResourceClaim({ requests: exactRequests() }),
          },
        },
      }),
    );
    expect(resolved.templateState).toBeUndefined();
    expect(resolved.state).toEqual({ status: 'pending', reason: 'allocation' });
  });

  it('should keep showing the allocation when the template was removed after allocation', () => {
    const resolved = resolvePodClaim(
      reference(generatedPod()),
      lookups({
        claims: {
          [GENERATED_RC]: {
            status: 'loaded',
            resource: mockResourceClaim({
              requests: exactRequests(),
              allocationResults: [
                { request: 'gpu', driver: DRIVER, pool: 'pool-a', device: 'gpu-0' },
              ],
            }),
          },
        },
        templates: { [TEMPLATE]: { status: 'missing' } },
      }),
    );
    expect(resolved.resourceClaimName).toBe(GENERATED_RC);
    expect(resolved.requestsSource).toBe('resourceClaim');
    expect(resolved.state).toEqual(
      expect.objectContaining({ status: 'allocated', devices: [expect.anything()] }),
    );
    // The RC spec wins, so the missing template never degrades the claim.
    expect(resolved.templateState).toBeUndefined();
  });

  it('should default a missing template lookup to loading', () => {
    const resolved = resolvePodClaim(reference(mockPod({})), lookups());
    expect(resolved.templateState).toEqual({ status: 'loading' });
    expect(resolved.state).toEqual({ status: 'pending', reason: 'generation' });
  });

  it('should keep the template reference when the template is missing or forbidden', () => {
    const missing = resolvePodClaim(
      reference(mockPod({})),
      lookups({ templates: { [TEMPLATE]: { status: 'missing' } } }),
    );
    expect(missing.reference.source).toEqual(
      expect.objectContaining({ resourceClaimTemplateName: TEMPLATE }),
    );
    expect(missing.templateState).toEqual({ status: 'missing' });
    const forbidden = resolvePodClaim(
      reference(mockPod({})),
      lookups({ templates: { [TEMPLATE]: { status: 'forbidden' } } }),
    );
    expect(forbidden.templateState).toEqual({ status: 'forbidden' });
  });

  it('should not consult the template for a skipped claim', () => {
    const resolved = resolvePodClaim(
      reference(mockPod({ resourceClaimStatuses: [{ name: 'gpu' }] })),
      lookups({ templates: { [TEMPLATE]: { status: 'forbidden' } } }),
    );
    expect(resolved.templateState).toBeUndefined();
  });

  it('should mark a skipped template claim', () => {
    const resolved = resolvePodClaim(
      reference(mockPod({ resourceClaimStatuses: [{ name: 'gpu' }] })),
      lookups(),
    );
    expect(resolved.state).toEqual({ status: 'skipped' });
  });

  it('should report an error for a declaration with no claim source', () => {
    const resolved = resolvePodClaim(
      reference(mockPod({ resourceClaims: [{ name: 'gpu' }] })),
      lookups(),
    );
    expect(resolved.state.status).toBe('error');
  });

  it('should filter by the top-level request name when the result names a subrequest', () => {
    const pod = mockPod({
      containers: [{ name: 'main', claims: [{ name: 'gpu', request: 'main' }] }],
      resourceClaims: [{ name: 'gpu', resourceClaimName: DIRECT_RC }],
    });
    const requests = [
      ...firstAvailableRequests(),
      { name: 'other', exactly: { deviceClassName: GPU_CLASS } },
    ];
    const claim = allocatedClaim(DIRECT_RC, requests, [
      result('main/subrequest', 'mig-0', 'mig.nvidia.com'),
      result('other', 'gpu-0'),
    ]);
    const resolved = resolvePodClaim(
      reference(pod),
      lookups({ claims: { [DIRECT_RC]: { status: 'loaded', resource: claim } } }),
    );
    expect(resolved.requests.map((request) => request.name)).toEqual(['main']);
    if (resolved.state.status !== 'allocated') {
      throw new Error(`expected allocated, got ${resolved.state.status}`);
    }
    expect(resolved.state.devices).toHaveLength(1);
    expect(resolved.state.devices[0].alternative?.name).toBe('subrequest');
  });

  it('should filter requests and devices to those the container consumes', () => {
    const requests: DeviceRequest[] = [
      { name: 'a', exactly: { deviceClassName: GPU_CLASS } },
      { name: 'b', exactly: { deviceClassName: GPU_CLASS } },
    ];
    const pod = mockPod({
      containers: [{ name: 'main', claims: [{ name: 'gpu', request: 'b' }] }],
      resourceClaims: [{ name: 'gpu', resourceClaimName: DIRECT_RC }],
    });
    const claim = allocatedClaim(DIRECT_RC, requests, [result('a', 'gpu-0'), result('b', 'gpu-1')]);
    const resolved = resolvePodClaim(
      reference(pod),
      lookups({ claims: { [DIRECT_RC]: { status: 'loaded', resource: claim } } }),
    );
    expect(resolved.requests.map((request) => request.name)).toEqual(['b']);
    if (resolved.state.status === 'allocated') {
      expect(resolved.state.devices.map((device) => device.result.device)).toEqual(['gpu-1']);
    } else {
      throw new Error(`expected allocated, got ${resolved.state.status}`);
    }
  });
});

describe('resolvePodClaims', () => {
  it('should resolve every declared claim with its own state', () => {
    const pod = mockPod({
      containers: [{ name: 'main', claims: [{ name: 'gpu' }, { name: 'shared' }] }],
      resourceClaims: [
        { name: 'gpu', resourceClaimTemplateName: TEMPLATE },
        { name: 'shared', resourceClaimName: DIRECT_RC },
      ],
      resourceClaimStatuses: [{ name: 'gpu', resourceClaimName: GENERATED_RC }],
    });
    const resolved = resolvePodClaims(
      pod,
      lookups({
        claims: {
          [GENERATED_RC]: {
            status: 'loaded',
            resource: allocatedClaim(GENERATED_RC, exactRequests(), [result('gpu', 'gpu-0')]),
          },
          [DIRECT_RC]: { status: 'forbidden' },
        },
      }),
    );
    expect(resolved.map((claim) => [claim.reference.alias, claim.state.status])).toEqual([
      ['gpu', 'allocated'],
      ['shared', 'forbidden'],
    ]);
  });

  it('should honour the container filter', () => {
    const pod = mockPod({
      containers: [
        { name: 'main', claims: [{ name: 'gpu' }] },
        { name: 'sidecar', claims: [{ name: 'shared' }] },
      ],
      resourceClaims: [
        { name: 'gpu', resourceClaimTemplateName: TEMPLATE },
        { name: 'shared', resourceClaimName: DIRECT_RC },
      ],
    });
    const resolved = resolvePodClaims(pod, lookups(), { containerNames: ['sidecar'] });
    expect(resolved.map((claim) => claim.reference.alias)).toEqual(['shared']);
  });
});

describe('getClaimsAggregateState', () => {
  const claim = (status: ResolvedClaim['state']['status']): ResolvedClaim => {
    const [reference] = getPodClaimReferences(directPod());
    const state: ResolvedClaim['state'] =
      status === 'error'
        ? { status, error: new Error('boom') }
        : status === 'pending'
        ? { status, reason: 'allocation' }
        : status === 'allocated'
        ? { status, devices: [] }
        : { status };
    return { reference, resourceClaimName: DIRECT_RC, state, requests: [], requestsSource: 'none' };
  };

  it.each<[string, ResolvedClaim['state']['status'][], ClaimsAggregateState]>([
    ['no claims', [], 'empty'],
    ['all allocated', ['allocated', 'allocated'], 'resolved'],
    ['pending and allocated', ['pending', 'allocated'], 'resolved'],
    ['skipped only', ['skipped'], 'resolved'],
    ['one still loading', ['loading', 'allocated'], 'loading'],
    ['one forbidden among successes', ['allocated', 'forbidden'], 'partialFailure'],
    ['one missing among loading', ['loading', 'missing'], 'partialFailure'],
    ['all failed', ['missing', 'forbidden', 'error'], 'failed'],
  ])('should report %s as %s', (_label, statuses, expected) => {
    expect(getClaimsAggregateState(statuses.map(claim))).toBe(expected);
  });

  const pendingGeneration = (templateState: ResolvedClaim['templateState']): ResolvedClaim => ({
    reference: getPodClaimReferences(mockPod({}))[0],
    state: { status: 'pending', reason: 'generation' },
    requests: [],
    requestsSource: 'none',
    templateState,
  });

  it.each<[string, ResolvedClaim['templateState'], ClaimsAggregateState]>([
    ['loading', { status: 'loading' }, 'loading'],
    ['missing', { status: 'missing' }, 'failed'],
    ['forbidden', { status: 'forbidden' }, 'failed'],
    ['error', { status: 'error', error: new Error('boom') }, 'failed'],
    ['loaded', { status: 'loaded', resource: mockResourceClaimTemplate({}) }, 'resolved'],
    ['absent', undefined, 'resolved'],
  ])('should use the %s template state for a pending-generation claim', (_l, state, expected) => {
    expect(getClaimsAggregateState([pendingGeneration(state)])).toBe(expected);
  });

  it('should report a failed template beside an allocated claim as a partial failure', () => {
    expect(
      getClaimsAggregateState([pendingGeneration({ status: 'forbidden' }), claim('allocated')]),
    ).toBe('partialFailure');
  });
});

describe('hasDeclaredClaims', () => {
  it('should be false for a plain spec', () => {
    expect(
      hasDeclaredClaims(mockPod({ resourceClaims: [], containers: [{ name: 'main' }] }).spec),
    ).toBe(false);
  });

  it('should be true when a claim is declared or consumed', () => {
    expect(hasDeclaredClaims(mockPod({ containers: [{ name: 'main' }] }).spec)).toBe(true);
    expect(hasDeclaredClaims(mockPod({ resourceClaims: [] }).spec)).toBe(true);
  });
});

describe('getDeclaredClaimReferences', () => {
  it('should treat template claims as pending generation when there is no Pod status', () => {
    const [reference] = getDeclaredClaimReferences(mockPod({}).spec, undefined);

    expect(reference.source).toEqual({
      type: 'template',
      resourceClaimTemplateName: TEMPLATE,
      generation: 'pending',
    });
  });
});

describe('getClaimLookupNames', () => {
  it('should collect direct and generated claim names and pending templates once each', () => {
    const references = getPodClaimReferences(
      mockPod({
        containers: [
          { name: 'main', claims: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }] },
        ],
        resourceClaims: [
          { name: 'a', resourceClaimName: DIRECT_RC },
          { name: 'b', resourceClaimTemplateName: TEMPLATE },
          { name: 'c', resourceClaimTemplateName: TEMPLATE },
          { name: 'd', resourceClaimTemplateName: TEMPLATE },
        ],
        resourceClaimStatuses: [{ name: 'b', resourceClaimName: GENERATED_RC }, { name: 'd' }],
      }),
    );

    expect(getClaimLookupNames(references)).toEqual({
      claimNames: [DIRECT_RC, GENERATED_RC],
      templateNames: [TEMPLATE],
    });
  });

  it('should return nothing for an unknown source', () => {
    expect(
      getClaimLookupNames([{ alias: 'x', source: { type: 'unknown' }, consumers: [] }]),
    ).toEqual({ claimNames: [], templateNames: [] });
  });
});
