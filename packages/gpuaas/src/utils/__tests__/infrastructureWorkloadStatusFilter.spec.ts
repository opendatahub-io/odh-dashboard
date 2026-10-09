import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import type { ClusterQueueWorkloadRow } from '../../types';
import type { InfrastructureWorkloadRow } from '../../types/infrastructureWorkloads';
import {
  filterInfrastructureWorkloads,
  findKueueRowForResource,
  formatInfrastructureWorkloadKueueValue,
  getInfrastructureWorkbenchStatus,
  getInfrastructureWorkloadFilterValues,
  getInfrastructureWorkloadStatusOptions,
} from '../infrastructureWorkloads';

const workload = (
  status: string,
  kueueStatus?: KueueWorkloadStatus,
  overrides: Partial<InfrastructureWorkloadRow> = {},
): InfrastructureWorkloadRow =>
  ({
    name: `workload-${status}`,
    namespace: 'test-project',
    resource: {} as InfrastructureWorkloadRow['resource'],
    type: 'Train job',
    status: { label: status, variant: 'custom' },
    kueueStatus,
    ...overrides,
    isKueueEnabled: false,
    isKueueManaged: false,
    kueueState: 'non-kueue',
  } as InfrastructureWorkloadRow);

describe('getInfrastructureWorkloadStatusOptions', () => {
  it.each([
    {
      description: 'the complete status list when Kueue is disabled',
      workloads: [workload('Ready'), workload('Failed')],
      expectedStatuses: ['Ready', 'Failed', 'Queued', 'Admitted', 'Inadmissible', 'Complete'],
    },
    {
      description: 'workload statuses with Kueue statuses',
      workloads: [workload('Ready')],
      expectedStatuses: ['Ready', 'Queued', 'Admitted', 'Inadmissible', 'Preempted', 'Evicted'],
    },
  ])('should include $description', ({ workloads, expectedStatuses }) => {
    const options = getInfrastructureWorkloadStatusOptions(workloads);

    expect(options).toEqual(
      expect.arrayContaining(expectedStatuses.map((status) => ({ key: status, label: status }))),
    );
  });

  it('should deduplicate statuses from workloads and Kueue', () => {
    const options = getInfrastructureWorkloadStatusOptions([workload('Queued')]);

    expect(options.filter((option) => option.key === 'Queued')).toHaveLength(1);
  });

  it('should still return status options when there are no workloads', () => {
    expect(getInfrastructureWorkloadStatusOptions([])).not.toEqual([]);
  });
});

describe('formatInfrastructureWorkloadKueueValue', () => {
  it.each([
    ['managed', 'gpu-queue', 'gpu-queue'],
    ['managed', undefined, '--'],
    ['non-kueue', 'gpu-queue', 'Non-Kueue'],
    ['unavailable', 'gpu-queue', '--'],
  ] as const)('should format %s Kueue values', (state, value, expected) => {
    expect(formatInfrastructureWorkloadKueueValue(value, state)).toBe(expected);
  });
});

describe('getInfrastructureWorkbenchStatus', () => {
  it.each([
    [
      { isStopping: true, isStarting: true, isRunning: true },
      { label: 'Stopping', variant: 'custom' },
    ],
    [
      { isStopping: false, isStarting: true, isRunning: true },
      { label: 'Starting', variant: 'info' },
    ],
    [
      { isStopping: false, isStarting: false, isRunning: true },
      { label: 'Ready', variant: 'success' },
    ],
    [
      { isStopping: false, isStarting: false, isRunning: false },
      { label: 'Stopped', variant: 'custom' },
    ],
  ] as const)('should return the expected status for %j', (state, expected) => {
    expect(
      getInfrastructureWorkbenchStatus(
        state as Parameters<typeof getInfrastructureWorkbenchStatus>[0],
      ),
    ).toEqual(expected);
  });
});

describe('findKueueRowForResource', () => {
  const resource = {
    apiVersion: 'kubeflow.org/v1',
    kind: 'TrainJob',
    metadata: { name: 'train-job', namespace: 'test-project' },
  } as InfrastructureWorkloadRow['resource'];

  const kueueRow = {
    name: 'train-job',
  } as ClusterQueueWorkloadRow;

  it('should find a Kueue row by resource name', () => {
    expect(findKueueRowForResource(resource, [kueueRow])).toBe(kueueRow);
  });

  it('should return undefined when no Kueue row matches the resource', () => {
    expect(findKueueRowForResource(resource, [])).toBeUndefined();
  });
});

describe('filterInfrastructureWorkloads', () => {
  it('should match Kueue status separately from workload status', () => {
    const rows = [workload('Ready', KueueWorkloadStatus.Queued)];

    expect(filterInfrastructureWorkloads(rows, '', 'status', ['Queued'])).toEqual(rows);
  });

  it('should match workload names case-insensitively', () => {
    const rows = [workload('Ready', undefined, { name: 'GPU-Training-Job' })];

    expect(filterInfrastructureWorkloads(rows, 'training', 'type', [])).toEqual(rows);
    expect(filterInfrastructureWorkloads(rows, 'RAY', 'type', [])).toEqual([]);
  });

  it('should filter by workload type', () => {
    const rows = [
      workload('Ready', undefined, { name: 'train-job', type: 'Train job' }),
      workload('Ready', undefined, { name: 'ray-job', type: 'Ray job' }),
    ];

    expect(filterInfrastructureWorkloads(rows, '', 'type', ['Ray job'])).toEqual([rows[1]]);
  });

  it('should filter by hardware profile', () => {
    const rows = [
      workload('Ready', undefined, { name: 'a100-job', hardwareProfile: 'NVIDIA A100' }),
      workload('Ready', undefined, { name: 'h100-job', hardwareProfile: 'NVIDIA H100' }),
    ];

    expect(filterInfrastructureWorkloads(rows, '', 'hardwareProfile', ['NVIDIA H100'])).toEqual([
      rows[1],
    ]);
  });

  it('should expose distinct filter values for type and hardware profile', () => {
    const rows = [
      workload('Ready', undefined, {
        type: 'Train job',
        hardwareProfile: 'NVIDIA A100',
      }),
      workload('Ready', undefined, {
        type: 'Train job',
        hardwareProfile: 'NVIDIA A100',
      }),
      workload('Ready', undefined, {
        type: 'Ray job',
        hardwareProfile: 'NVIDIA H100',
      }),
    ];

    expect(getInfrastructureWorkloadFilterValues(rows, 'type')).toEqual(['Ray job', 'Train job']);
    expect(getInfrastructureWorkloadFilterValues(rows, 'hardwareProfile')).toEqual([
      'NVIDIA A100',
      'NVIDIA H100',
    ]);
  });
});
