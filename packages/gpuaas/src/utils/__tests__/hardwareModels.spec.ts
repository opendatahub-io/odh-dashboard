import { ClusterQueueKind, ResourceFlavorKind } from '@odh-dashboard/internal/k8sTypes';
import { resolveHardwareModels, resolvePerModelGpuCounts } from '../hardwareModels';

const makeGpuCQ = (
  name: string,
  flavorName: string,
  {
    nominal = 8,
    used = 0,
    borrowed,
  }: { nominal?: number | string; used?: number | string; borrowed?: number | string } = {},
): ClusterQueueKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'ClusterQueue',
    metadata: { name },
    spec: {
      resourceGroups: [
        {
          coveredResources: ['nvidia.com/gpu'],
          flavors: [
            {
              name: flavorName,
              resources: [{ name: 'nvidia.com/gpu', nominalQuota: String(nominal) }],
            },
          ],
        },
      ],
    },
    status: {
      admittedWorkloads: 0,
      pendingWorkloads: 0,
      reservingWorkloads: 0,
      conditions: [],
      flavorsReservation: [],
      flavorsUsage: [
        {
          name: flavorName,
          resources: [
            {
              name: 'nvidia.com/gpu',
              total: String(used),
              ...(borrowed !== undefined && { borrowed: String(borrowed) }),
            },
          ],
        },
      ],
    },
  } as unknown as ClusterQueueKind);

const makeRF = (name: string, gpuProduct?: string): ResourceFlavorKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'ResourceFlavor',
    metadata: { name },
    spec: {
      nodeLabels: gpuProduct ? { 'nvidia.com/gpu.product': gpuProduct } : {},
    },
  } as unknown as ResourceFlavorKind);

describe('resolveHardwareModels', () => {
  it('returns GPU product label for a CQ whose flavor has the label', () => {
    const cq = makeGpuCQ('cq-a', 'a100-flavor');
    const rf = makeRF('a100-flavor', 'NVIDIA A100');
    const result = resolveHardwareModels([cq], [rf]);
    expect(result.get('cq-a')).toEqual(['NVIDIA A100']);
  });

  it('returns empty array when flavor has no gpu.product label', () => {
    const cq = makeGpuCQ('cq-b', 'generic-flavor');
    const rf = makeRF('generic-flavor'); // no gpuProduct
    const result = resolveHardwareModels([cq], [rf]);
    expect(result.get('cq-b')).toEqual([]);
  });

  it('returns empty array for a CQ with no resourceGroups', () => {
    const cq = {
      metadata: { name: 'cq-empty' },
      spec: { resourceGroups: [] },
      status: {},
    } as unknown as ClusterQueueKind;
    const result = resolveHardwareModels([cq], []);
    expect(result.get('cq-empty')).toEqual([]);
  });

  it('deduplicates models when multiple flavors share the same product label', () => {
    const cq = {
      metadata: { name: 'cq-dup' },
      spec: {
        resourceGroups: [
          {
            coveredResources: ['nvidia.com/gpu'],
            flavors: [
              {
                name: 'flavor-1',
                resources: [{ name: 'nvidia.com/gpu', nominalQuota: '4' }],
              },
              {
                name: 'flavor-2',
                resources: [{ name: 'nvidia.com/gpu', nominalQuota: '4' }],
              },
            ],
          },
        ],
      },
      status: { admittedWorkloads: 0, pendingWorkloads: 0, flavorsUsage: [] },
    } as unknown as ClusterQueueKind;
    const rf1 = makeRF('flavor-1', 'NVIDIA H100');
    const rf2 = makeRF('flavor-2', 'NVIDIA H100');
    const result = resolveHardwareModels([cq], [rf1, rf2]);
    expect(result.get('cq-dup')).toEqual(['NVIDIA H100']);
  });
});

describe('resolvePerModelGpuCounts', () => {
  it('returns nominal, used, borrowed for a CQ with a labelled flavor', () => {
    const cq = makeGpuCQ('cq-a', 'a100-flavor', { nominal: 8, used: 3, borrowed: 1 });
    const rf = makeRF('a100-flavor', 'NVIDIA A100');
    const result = resolvePerModelGpuCounts([cq], [rf]);
    expect(result.get('cq-a')).toEqual([
      { model: 'NVIDIA A100', nominal: 8, used: 3, borrowed: 1 },
    ]);
  });

  it('sets borrowed to undefined when the usage entry has no borrowed field', () => {
    const cq = makeGpuCQ('cq-b', 'a100-flavor', { nominal: 4, used: 2 });
    const rf = makeRF('a100-flavor', 'NVIDIA A100');
    const result = resolvePerModelGpuCounts([cq], [rf]);
    expect(result.get('cq-b')).toEqual([
      { model: 'NVIDIA A100', nominal: 4, used: 2, borrowed: undefined },
    ]);
  });

  it('skips flavors with no matching ResourceFlavor or no gpu.product label', () => {
    const cq = makeGpuCQ('cq-c', 'unknown-flavor', { nominal: 8, used: 0 });
    const rf = makeRF('unknown-flavor'); // no gpuProduct
    const result = resolvePerModelGpuCounts([cq], [rf]);
    expect(result.get('cq-c')).toEqual([]);
  });

  it.each([
    ['plain integer string', '8', 8],
    ['zero string', '0', 0],
  ])('parses nominalQuota as k8s quantity: %s', (_label, quantityStr, expected) => {
    const cq = makeGpuCQ('cq-qty', 'a100-flavor', { nominal: quantityStr });
    const rf = makeRF('a100-flavor', 'NVIDIA A100');
    const result = resolvePerModelGpuCounts([cq], [rf]);
    expect(result.get('cq-qty')?.[0].nominal).toBe(expected);
  });

  it('returns empty counts for a CQ with no GPU resource groups', () => {
    const cq = {
      metadata: { name: 'cpu-only' },
      spec: {
        resourceGroups: [
          {
            coveredResources: ['cpu'],
            flavors: [{ name: 'cpu-flavor', resources: [{ name: 'cpu', nominalQuota: '100' }] }],
          },
        ],
      },
      status: { admittedWorkloads: 0, pendingWorkloads: 0, flavorsUsage: [] },
    } as unknown as ClusterQueueKind;
    const result = resolvePerModelGpuCounts([cq], []);
    expect(result.get('cpu-only')).toEqual([]);
  });

  it('handles multiple CQs independently', () => {
    const cq1 = makeGpuCQ('cq-1', 'a100-flavor', { nominal: 8, used: 2 });
    const cq2 = makeGpuCQ('cq-2', 'h100-flavor', { nominal: 4, used: 4, borrowed: 2 });
    const rf1 = makeRF('a100-flavor', 'NVIDIA A100');
    const rf2 = makeRF('h100-flavor', 'NVIDIA H100');
    const result = resolvePerModelGpuCounts([cq1, cq2], [rf1, rf2]);
    expect(result.get('cq-1')).toEqual([
      { model: 'NVIDIA A100', nominal: 8, used: 2, borrowed: undefined },
    ]);
    expect(result.get('cq-2')).toEqual([
      { model: 'NVIDIA H100', nominal: 4, used: 4, borrowed: 2 },
    ]);
  });
});
