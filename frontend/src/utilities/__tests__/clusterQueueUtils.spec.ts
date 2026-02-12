import { ClusterQueueKind, WorkloadKind } from '#~/k8sTypes';
import {
  getAllConsumedResources,
  getAssignedFlavorFromWorkload,
} from '#~/utilities/clusterQueueUtils';

const COVERED_RESOURCES = ['cpu', 'memory', 'nvidia.com/gpu'];
const DEFAULT_FLAVOR = 'default-flavor';
const OTHER_FLAVOR = 'other-flavor';
const KUEUE_API_VERSION = 'kueue.x-k8s.io/v1beta1';

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
    apiVersion: KUEUE_API_VERSION,
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

describe('getAssignedFlavorFromWorkload', () => {
  const admittedWorkload = (flavors: Record<string, string>): WorkloadKind =>
    ({
      apiVersion: KUEUE_API_VERSION,
      kind: 'Workload',
      metadata: { name: 'test-workload' },
      spec: { podSets: [], queueName: 'my-queue' },
      status: {
        admission: {
          clusterQueue: 'default',
          podSetAssignments: [{ name: 'main', flavors }],
        },
      },
    } as WorkloadKind);

  it('returns undefined when workload is null or undefined', () => {
    expect(getAssignedFlavorFromWorkload(null)).toBeUndefined();
    expect(getAssignedFlavorFromWorkload(undefined)).toBeUndefined();
  });

  it('returns undefined when status.admission is missing', () => {
    const wNoStatus = { ...admittedWorkload({ cpu: 'small' }), status: undefined };
    expect(getAssignedFlavorFromWorkload(wNoStatus as WorkloadKind)).toBeUndefined();
    const wEmptyStatus = { ...admittedWorkload({ cpu: 'small' }), status: {} };
    expect(getAssignedFlavorFromWorkload(wEmptyStatus as WorkloadKind)).toBeUndefined();
  });

  it('returns undefined when podSetAssignments is missing or empty', () => {
    const base = admittedWorkload({ cpu: 'small' });
    const admission = base.status?.admission;
    const wNoAssignments = {
      ...base,
      status: {
        ...base.status,
        admission: {
          ...admission,
          clusterQueue: admission?.clusterQueue ?? 'default',
          podSetAssignments: undefined as unknown as NonNullable<
            typeof admission
          >['podSetAssignments'],
        },
      },
    };
    expect(getAssignedFlavorFromWorkload(wNoAssignments as WorkloadKind)).toBeUndefined();
    const wEmptyAssignments = {
      ...base,
      status: { ...base.status, admission: { clusterQueue: 'default', podSetAssignments: [] } },
    };
    expect(getAssignedFlavorFromWorkload(wEmptyAssignments as WorkloadKind)).toBeUndefined();
  });

  it('returns undefined when flavors is missing or not an object', () => {
    const base = admittedWorkload({ cpu: 'small' });
    const wNoFlavors = {
      ...base,
      status: {
        ...base.status,
        admission: {
          clusterQueue: 'default',
          podSetAssignments: [
            { name: 'main', flavors: undefined as unknown as Record<string, string> },
          ],
        },
      },
    };
    expect(getAssignedFlavorFromWorkload(wNoFlavors as WorkloadKind)).toBeUndefined();
    const wFlavorsArray = {
      ...base,
      status: {
        ...base.status,
        admission: {
          clusterQueue: 'default',
          podSetAssignments: [{ name: 'main', flavors: [] as unknown as Record<string, string> }],
        },
      },
    };
    expect(getAssignedFlavorFromWorkload(wFlavorsArray as WorkloadKind)).toBeUndefined();
  });

  it('returns the flavor name from the first resource in flavors', () => {
    expect(getAssignedFlavorFromWorkload(admittedWorkload({ cpu: 'small', memory: 'small' }))).toBe(
      'small',
    );
    expect(
      getAssignedFlavorFromWorkload(
        admittedWorkload({ cpu: 'large', memory: 'large', 'nvidia.com/gpu': 'large' }),
      ),
    ).toBe('large');
  });

  it('returns undefined when first flavor value is not a string', () => {
    const base = admittedWorkload({ cpu: 'small' });
    const w = {
      ...base,
      status: {
        ...base.status,
        admission: {
          clusterQueue: 'default',
          podSetAssignments: [
            { name: 'main', flavors: { cpu: 1 } as unknown as Record<string, string> },
          ],
        },
      },
    };
    expect(getAssignedFlavorFromWorkload(w as WorkloadKind)).toBeUndefined();
  });
});

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

  it('filters by assignedFlavorName when provided (single-flavor usage/quota)', () => {
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

    const resultDefault = getAllConsumedResources(
      cqMultiFlavor as ClusterQueueKind,
      DEFAULT_FLAVOR,
    );
    expect(resultDefault).toHaveLength(3);
    expect(resultDefault.find((r) => r.name === 'cpu')).toMatchObject({
      total: '100',
      consumed: '9700m',
    });

    const resultOther = getAllConsumedResources(cqMultiFlavor as ClusterQueueKind, OTHER_FLAVOR);
    expect(resultOther).toHaveLength(2);
    expect(resultOther.find((r) => r.name === 'cpu')).toMatchObject({
      total: '50',
      consumed: '5000m',
    });
    expect(resultOther.find((r) => r.name === 'memory')).toMatchObject({
      total: '100Gi',
      consumed: '50Gi',
    });
  });

  it('returns empty array when assignedFlavorName does not match any flavor', () => {
    const cq = baseClusterQueue();
    expect(getAllConsumedResources(cq, 'nonexistent-flavor')).toEqual([]);
  });
});
