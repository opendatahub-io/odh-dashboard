import {
  QuotaUsageWorkloadStatuses,
  QuotaUsageWorkloadTypes,
  type ClusterQueueWorkloadRow,
} from '../../types';
import {
  filterClusterQueueWorkloads,
  hasActiveWorkloadFilters,
} from '../clusterQueueWorkloadsTableUtils';

const baseRow = (overrides: Partial<ClusterQueueWorkloadRow> = {}): ClusterQueueWorkloadRow => ({
  name: 'wl-1',
  namespace: 'dsp-1',
  project: 'Project A',
  clusterQueue: 'gpu-cq',
  type: QuotaUsageWorkloadTypes.Train,
  status: QuotaUsageWorkloadStatuses.Pending,
  localQueue: 'user-queue',
  accelerators: 2,
  queuePosition: 1,
  ...overrides,
});

describe('clusterQueueWorkloadsTableUtils', () => {
  const workloads = [
    baseRow({
      name: 'llm-pretrain-run',
      project: 'Project D',
      status: QuotaUsageWorkloadStatuses.Pending,
    }),
    baseRow({
      name: 'multimodal-trial',
      project: 'Project D',
      status: QuotaUsageWorkloadStatuses.Inadmissible,
      queuePosition: undefined,
    }),
    baseRow({
      name: 'serving-deploy',
      project: 'Project E',
      status: QuotaUsageWorkloadStatuses.Admitted,
      queuePosition: undefined,
      type: QuotaUsageWorkloadTypes.Serve,
      priority: 'on demand (100)',
      hardwareProfile: 'Standard (H100 MIG - 20GB)',
    }),
    baseRow({ name: 'completed-training', status: QuotaUsageWorkloadStatuses.Complete }),
    baseRow({ name: 'failed-training', status: QuotaUsageWorkloadStatuses.Failed }),
  ];

  describe('filterClusterQueueWorkloads', () => {
    it('should return all workloads when no filters are active', () => {
      expect(filterClusterQueueWorkloads(workloads, {})).toHaveLength(5);
    });

    it('should filter workloads by name', () => {
      expect(filterClusterQueueWorkloads(workloads, { name: 'llm' })).toEqual([workloads[0]]);
    });

    it('should filter workloads by project name', () => {
      expect(filterClusterQueueWorkloads(workloads, { name: 'project e' })).toEqual([workloads[2]]);
    });

    it('should filter workloads by status', () => {
      expect(
        filterClusterQueueWorkloads(workloads, {
          status: { label: 'Admitted', value: QuotaUsageWorkloadStatuses.Admitted },
        }),
      ).toEqual([workloads[2]]);
    });

    it.each([
      [QuotaUsageWorkloadStatuses.Complete, workloads[3]],
      [QuotaUsageWorkloadStatuses.Failed, workloads[4]],
    ])('should filter workloads by %s status', (status, expectedWorkload) => {
      expect(filterClusterQueueWorkloads(workloads, { status })).toEqual([expectedWorkload]);
    });

    it('should apply name and status filters together', () => {
      expect(
        filterClusterQueueWorkloads(workloads, {
          name: 'multimodal',
          status: QuotaUsageWorkloadStatuses.Inadmissible,
        }),
      ).toEqual([workloads[1]]);
    });

    it('should filter workloads by priority', () => {
      expect(
        filterClusterQueueWorkloads(workloads, {
          priority: { label: 'on demand (100)', value: 'on demand (100)' },
        }),
      ).toEqual([workloads[2]]);
    });

    it('should filter workloads by hardware profile', () => {
      expect(
        filterClusterQueueWorkloads(workloads, {
          hardwareProfile: {
            label: 'Standard (H100 MIG - 20GB)',
            value: 'Standard (H100 MIG - 20GB)',
          },
        }),
      ).toEqual([workloads[2]]);
    });
  });

  describe('hasActiveWorkloadFilters', () => {
    it('should return false when filters are empty', () => {
      expect(hasActiveWorkloadFilters({})).toBe(false);
    });

    it('should return true when a name filter is set', () => {
      expect(hasActiveWorkloadFilters({ name: 'llm' })).toBe(true);
    });

    it('should return true when a status filter is set', () => {
      expect(
        hasActiveWorkloadFilters({
          status: QuotaUsageWorkloadStatuses.Queued,
        }),
      ).toBe(true);
    });

    it('should return true when a priority filter is set', () => {
      expect(hasActiveWorkloadFilters({ priority: 'on demand (100)' })).toBe(true);
    });
  });
});
