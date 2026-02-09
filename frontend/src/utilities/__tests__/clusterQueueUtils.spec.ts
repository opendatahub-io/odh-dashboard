import { ClusterQueueKind } from '#~/k8sTypes';
import { getAllConsumedResources } from '#~/utilities/clusterQueueUtils';

const COVERED_RESOURCES = ['cpu', 'memory', 'nvidia.com/gpu'];
const DEFAULT_FLAVOR = 'default-flavor';
const OTHER_FLAVOR = 'other-flavor';

const DEFAULT_SPEC_RESOURCES = [
  { name: 'cpu', nominalQuota: 100 },
  { name: 'memory', nominalQuota: '200Gi' },
  { name: 'nvidia.com/gpu', nominalQuota: 8 },
];

const DEFAULT_USAGE_RESOURCES = [
  { name: 'cpu', total: '9700m' },
  { name: 'memory', total: '18880Mi' },
  { name: 'nvidia.com/gpu', total: 0 },
];

const baseClusterQueue = (): ClusterQueueKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta1',
    kind: 'ClusterQueue',
    metadata: { name: 'default' },
    spec: {
      resourceGroups: [
        {
          coveredResources: COVERED_RESOURCES,
          flavors: [{ name: DEFAULT_FLAVOR, resources: DEFAULT_SPEC_RESOURCES }],
        },
      ],
    },
    status: {
      flavorsUsage: [{ name: DEFAULT_FLAVOR, resources: DEFAULT_USAGE_RESOURCES }],
    },
  } as ClusterQueueKind);

describe('getAllConsumedResources', () => {
  it('returns empty array when status.flavorsUsage is missing or empty', () => {
    const cq = baseClusterQueue();
    expect(
      getAllConsumedResources({
        ...cq,
        status: { ...cq.status, flavorsUsage: undefined },
      } as ClusterQueueKind),
    ).toEqual([]);
    expect(
      getAllConsumedResources({
        ...cq,
        status: { ...cq.status, flavorsUsage: [] },
      } as ClusterQueueKind),
    ).toEqual([]);
  });

  it('returns empty array when spec.resourceGroups is missing or empty', () => {
    const cq = baseClusterQueue();
    expect(
      getAllConsumedResources({
        ...cq,
        spec: { ...cq.spec, resourceGroups: undefined },
      } as ClusterQueueKind),
    ).toEqual([]);
    expect(
      getAllConsumedResources({
        ...cq,
        spec: { ...cq.spec, resourceGroups: [] },
      } as ClusterQueueKind),
    ).toEqual([]);
  });

  it('computes CPU and memory with correct percentages, labels, and display values', () => {
    const cq = baseClusterQueue();
    const result = getAllConsumedResources(cq);

    const cpu = result.find((r) => r.name === 'cpu');
    expect(cpu).toMatchObject({
      name: 'cpu',
      label: 'CPU',
      total: '100',
      consumed: '9700m',
      percentage: 10,
    });

    const memory = result.find((r) => r.name === 'memory');
    expect(memory).toMatchObject({
      name: 'memory',
      label: 'Memory',
      total: '200Gi',
      consumed: '18880Mi',
    });
    expect(memory?.percentage).toBeGreaterThanOrEqual(0);
    expect(memory?.percentage).toBeLessThanOrEqual(100);
  });

  it('handles countable resources (e.g. nvidia.com/gpu) with numeric quota and consumed', () => {
    const cq = baseClusterQueue();
    const cqWithGpuConsumed = {
      ...cq,
      status: {
        ...cq.status,
        flavorsUsage: [
          {
            name: DEFAULT_FLAVOR,
            resources: [
              DEFAULT_USAGE_RESOURCES[0],
              DEFAULT_USAGE_RESOURCES[1],
              { name: 'nvidia.com/gpu', total: 3 },
            ],
          },
        ],
      },
    };

    const result = getAllConsumedResources(cqWithGpuConsumed as ClusterQueueKind);

    const gpu = result.find((r) => r.name === 'nvidia.com/gpu');
    expect(gpu).toBeDefined();
    expect(gpu).toMatchObject({
      name: 'nvidia.com/gpu',
      label: 'nvidia.com/gpu',
      total: '8',
      consumed: '3',
      percentage: 38,
    });
  });

  it('returns resources in sort order (cpu, memory, others) with correct labels', () => {
    const cq = baseClusterQueue();
    const result = getAllConsumedResources(cq);

    expect(result.map((r) => r.name)).toEqual(COVERED_RESOURCES);
    expect(result.find((r) => r.name === 'cpu')?.label).toBe('CPU');
    expect(result.find((r) => r.name === 'memory')?.label).toBe('Memory');
    expect(result.find((r) => r.name === 'nvidia.com/gpu')?.label).toBe('nvidia.com/gpu');
  });

  it('returns 0 percentage when quota is zero', () => {
    const cq = baseClusterQueue();
    const cqZeroQuota = {
      ...cq,
      spec: {
        ...cq.spec,
        resourceGroups: [
          {
            coveredResources: COVERED_RESOURCES,
            flavors: [
              {
                name: DEFAULT_FLAVOR,
                resources: [
                  { name: 'cpu', nominalQuota: 0 },
                  DEFAULT_SPEC_RESOURCES[1],
                  DEFAULT_SPEC_RESOURCES[2],
                ],
              },
            ],
          },
        ],
      },
    };

    const result = getAllConsumedResources(cqZeroQuota as ClusterQueueKind);
    const cpu = result.find((r) => r.name === 'cpu');

    expect(cpu?.percentage).toBe(0);
  });

  it('handles string nominalQuota for CPU (e.g. "100")', () => {
    const cq = baseClusterQueue();
    const cqStringQuota = {
      ...cq,
      spec: {
        ...cq.spec,
        resourceGroups: [
          {
            coveredResources: COVERED_RESOURCES,
            flavors: [
              {
                name: DEFAULT_FLAVOR,
                resources: [
                  { name: 'cpu', nominalQuota: '100' },
                  DEFAULT_SPEC_RESOURCES[1],
                  DEFAULT_SPEC_RESOURCES[2],
                ],
              },
            ],
          },
        ],
      },
    };

    const result = getAllConsumedResources(cqStringQuota as ClusterQueueKind);
    const cpu = result.find((r) => r.name === 'cpu');
    expect(cpu?.total).toBe('100');
    expect(cpu?.percentage).toBe(10);
  });

  it('handles multiple flavors and uses first occurrence per resource', () => {
    const cq = baseClusterQueue();
    const cqMultiFlavor = {
      ...cq,
      spec: {
        ...cq.spec,
        resourceGroups: [
          {
            coveredResources: COVERED_RESOURCES,
            flavors: [
              { name: DEFAULT_FLAVOR, resources: DEFAULT_SPEC_RESOURCES },
              {
                name: OTHER_FLAVOR,
                resources: [
                  { name: 'cpu', nominalQuota: 50 },
                  { name: 'memory', nominalQuota: '100Gi' },
                ],
              },
            ],
          },
        ],
      },
      status: {
        ...cq.status,
        flavorsUsage: [
          { name: DEFAULT_FLAVOR, resources: DEFAULT_USAGE_RESOURCES },
          {
            name: OTHER_FLAVOR,
            resources: [
              { name: 'cpu', total: '5000m' },
              { name: 'memory', total: '50Gi' },
            ],
          },
        ],
      },
    };

    const result = getAllConsumedResources(cqMultiFlavor as ClusterQueueKind);

    expect(result).toHaveLength(3);
    const cpu = result.find((r) => r.name === 'cpu');
    expect(cpu?.total).toBe('100');
    expect(cpu?.consumed).toBe('9700m');
  });
});
