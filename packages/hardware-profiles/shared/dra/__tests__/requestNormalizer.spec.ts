import { mockResourceClaim } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaim';
import { mockResourceClaimTemplate } from '@odh-dashboard/k8s-core/__mocks__/mockResourceClaimTemplate';
import { DeviceAllocationMode, type DeviceRequest } from '@odh-dashboard/k8s-core/dra/types';
import {
  findRequestForAllocation,
  getRequestedDeviceClassName,
  normalizeDeviceCount,
  normalizeDeviceRequest,
  normalizeDeviceRequests,
  normalizeDeviceSelection,
  normalizeResourceClaimRequests,
  normalizeResourceClaimTemplateRequests,
} from '../requestNormalizer';
import { DeviceFilterOperator, type DeviceCount, type NormalizedDeviceRequest } from '../types';

const GPU_CLASS = 'gpu.nvidia.com';
const SUPPORTED_CEL = 'device.attributes["gpu.nvidia.com"].productName.startsWith("NVIDIA A100")';
const UNSUPPORTED_CEL = 'has(device.attributes["gpu.nvidia.com"].productName)';

const firstAvailableRequest = (): DeviceRequest => ({
  name: 'gpu',
  firstAvailable: [
    { name: 'large', deviceClassName: GPU_CLASS, count: 2 },
    { name: 'mig', deviceClassName: 'mig.nvidia.com' },
    { name: 'any', deviceClassName: GPU_CLASS, allocationMode: DeviceAllocationMode.ALL },
  ],
});

describe('normalizeDeviceCount', () => {
  it.each<[string, DeviceAllocationMode | string | undefined, number | undefined, DeviceCount]>([
    ['omitted mode and count', undefined, undefined, { mode: 'ExactCount', count: 1 }],
    ['omitted mode with count', undefined, 4, { mode: 'ExactCount', count: 4 }],
    [
      'ExactCount without count',
      DeviceAllocationMode.EXACT_COUNT,
      undefined,
      { mode: 'ExactCount', count: 1 },
    ],
    [
      'ExactCount with count',
      DeviceAllocationMode.EXACT_COUNT,
      8,
      { mode: 'ExactCount', count: 8 },
    ],
    ['All without count', DeviceAllocationMode.ALL, undefined, { mode: 'All' }],
    ['All ignores a stray count', DeviceAllocationMode.ALL, 3, { mode: 'All' }],
    ['unknown mode stays explicit', 'Future', 2, { mode: 'Unknown', rawMode: 'Future' }],
  ])('should normalize %s', (_label, mode, count, expected) => {
    expect(normalizeDeviceCount(mode, count)).toStrictEqual(expected);
  });
});

describe('normalizeDeviceSelection', () => {
  it('should default to one device with no filters', () => {
    expect(normalizeDeviceSelection({ deviceClassName: GPU_CLASS })).toEqual({
      deviceClassName: GPU_CLASS,
      count: { mode: 'ExactCount', count: 1 },
      filters: [],
    });
  });

  it('should keep selector order and mark unsupported selectors without raw text', () => {
    const result = normalizeDeviceSelection({
      deviceClassName: GPU_CLASS,
      selectors: [
        { cel: { expression: UNSUPPORTED_CEL } },
        { cel: { expression: SUPPORTED_CEL } },
        {},
      ],
    });
    expect(result.filters).toEqual([
      { type: 'unsupported' },
      {
        type: 'supported',
        clauses: [
          {
            attribute: 'gpu.nvidia.com/productName',
            category: 'attribute',
            operator: DeviceFilterOperator.STARTS_WITH,
            value: 'NVIDIA A100',
            valueType: 'string',
          },
        ],
      },
      { type: 'unsupported' },
    ]);
    expect(JSON.stringify(result)).not.toContain('has(');
  });
});

describe('normalizeDeviceRequest', () => {
  it.each<[string, DeviceRequest, NormalizedDeviceRequest]>([
    [
      'exact request with explicit count',
      { name: 'gpu', exactly: { deviceClassName: GPU_CLASS, count: 2 } },
      {
        name: 'gpu',
        type: 'exactly',
        selection: {
          deviceClassName: GPU_CLASS,
          count: { mode: 'ExactCount', count: 2 },
          filters: [],
        },
      },
    ],
    [
      'exact request with omitted count',
      { name: 'gpu', exactly: { deviceClassName: GPU_CLASS } },
      {
        name: 'gpu',
        type: 'exactly',
        selection: {
          deviceClassName: GPU_CLASS,
          count: { mode: 'ExactCount', count: 1 },
          filters: [],
        },
      },
    ],
    [
      'exact request with All mode',
      {
        name: 'gpu',
        exactly: { deviceClassName: GPU_CLASS, allocationMode: DeviceAllocationMode.ALL },
      },
      {
        name: 'gpu',
        type: 'exactly',
        selection: { deviceClassName: GPU_CLASS, count: { mode: 'All' }, filters: [] },
      },
    ],
    [
      'firstAvailable preserves alternative order',
      firstAvailableRequest(),
      {
        name: 'gpu',
        type: 'firstAvailable',
        alternatives: [
          {
            name: 'large',
            deviceClassName: GPU_CLASS,
            count: { mode: 'ExactCount', count: 2 },
            filters: [],
          },
          {
            name: 'mig',
            deviceClassName: 'mig.nvidia.com',
            count: { mode: 'ExactCount', count: 1 },
            filters: [],
          },
          { name: 'any', deviceClassName: GPU_CLASS, count: { mode: 'All' }, filters: [] },
        ],
      },
    ],
    ['request with neither shape', { name: 'gpu' }, { name: 'gpu', type: 'unknown' }],
    [
      'request with both shapes is not guessed',
      { name: 'gpu', exactly: { deviceClassName: GPU_CLASS }, firstAvailable: [] },
      { name: 'gpu', type: 'unknown' },
    ],
  ])('should normalize %s', (_label, request, expected) => {
    expect(normalizeDeviceRequest(request)).toEqual(expected);
  });
});

describe('normalizeDeviceRequests', () => {
  it.each<[string, DeviceRequest[] | null | undefined]>([
    ['undefined', undefined],
    ['null', null],
    ['empty', []],
  ])('should return an empty list for %s requests', (_label, requests) => {
    expect(normalizeDeviceRequests(requests)).toEqual([]);
  });

  it('should preserve request order', () => {
    const result = normalizeDeviceRequests([
      { name: 'b', exactly: { deviceClassName: GPU_CLASS } },
      { name: 'a', exactly: { deviceClassName: GPU_CLASS } },
    ]);
    expect(result.map((request) => request.name)).toEqual(['b', 'a']);
  });
});

describe('normalizeResourceClaimTemplateRequests', () => {
  it('should read requests from the nested template spec', () => {
    const template = mockResourceClaimTemplate({ requests: [firstAvailableRequest()] });
    const result = normalizeResourceClaimTemplateRequests(template);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('firstAvailable');
  });

  it('should handle a template without devices', () => {
    const template = mockResourceClaimTemplate({});
    template.spec.spec.devices = undefined;
    expect(normalizeResourceClaimTemplateRequests(template)).toEqual([]);
  });
});

describe('normalizeResourceClaimRequests', () => {
  it('should read requests from the claim spec', () => {
    const claim = mockResourceClaim({
      requests: [{ name: 'gpu', exactly: { deviceClassName: GPU_CLASS } }],
    });
    expect(normalizeResourceClaimRequests(claim)).toEqual([
      {
        name: 'gpu',
        type: 'exactly',
        selection: {
          deviceClassName: GPU_CLASS,
          count: { mode: 'ExactCount', count: 1 },
          filters: [],
        },
      },
    ]);
  });

  it('should treat null requests as empty', () => {
    const claim = mockResourceClaim({});
    claim.spec.devices = { requests: null };
    expect(normalizeResourceClaimRequests(claim)).toEqual([]);
  });
});

describe('findRequestForAllocation', () => {
  const requests = normalizeDeviceRequests([
    { name: 'main', exactly: { deviceClassName: GPU_CLASS } },
    firstAvailableRequest(),
  ]);

  it('should match a plain request name', () => {
    const match = findRequestForAllocation(requests, 'main');
    expect(match.requestName).toBe('main');
    expect(match.subrequestName).toBeUndefined();
    expect(match.request?.name).toBe('main');
    expect(match.alternative).toBeUndefined();
  });

  it('should map a subrequest name to the correct firstAvailable alternative', () => {
    const match = findRequestForAllocation(requests, 'gpu/mig');
    expect(match).toEqual({
      requestName: 'gpu',
      subrequestName: 'mig',
      request: requests[1],
      alternative: expect.objectContaining({ name: 'mig', deviceClassName: 'mig.nvidia.com' }),
    });
  });

  it('should leave the alternative undefined for an unknown subrequest', () => {
    const match = findRequestForAllocation(requests, 'gpu/other');
    expect(match.request?.name).toBe('gpu');
    expect(match.alternative).toBeUndefined();
  });

  it('should not pick an alternative for a subrequest on an exact request', () => {
    const match = findRequestForAllocation(requests, 'main/large');
    expect(match.subrequestName).toBe('large');
    expect(match.alternative).toBeUndefined();
  });

  it('should return only the parsed names for an unknown request', () => {
    expect(findRequestForAllocation(requests, 'missing')).toEqual({
      requestName: 'missing',
      subrequestName: undefined,
      request: undefined,
      alternative: undefined,
    });
  });
});

describe('getRequestedDeviceClassName', () => {
  const [exact, alternatives] = normalizeDeviceRequests([
    { name: 'main', exactly: { deviceClassName: GPU_CLASS } },
    firstAvailableRequest(),
  ]);

  it('should prefer the matched alternative', () => {
    const alternative =
      alternatives.type === 'firstAvailable' ? alternatives.alternatives[1] : undefined;
    expect(getRequestedDeviceClassName(alternatives, alternative)).toBe('mig.nvidia.com');
  });

  it('should use the exact selection class', () => {
    expect(getRequestedDeviceClassName(exact, undefined)).toBe(GPU_CLASS);
  });

  it.each<[string, NormalizedDeviceRequest | undefined]>([
    ['a firstAvailable request without a matched alternative', alternatives],
    ['an unknown request shape', { name: 'x', type: 'unknown' }],
    ['no request', undefined],
  ])('should return undefined for %s', (_label, request) => {
    expect(getRequestedDeviceClassName(request, undefined)).toBeUndefined();
  });
});
