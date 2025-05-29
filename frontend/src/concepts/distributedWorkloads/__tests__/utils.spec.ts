import { mockClusterQueueK8sResource } from '#~/__mocks__/mockClusterQueueK8sResource';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import {
  getWorkloadOwner,
  WorkloadStatusColorAndIcon,
  WorkloadStatusType,
  getStatusCounts,
  getStatusInfo,
  getWorkloadRequestedResources,
  WorkloadRequestedResources,
  getQueueRequestedResources,
  getTotalSharedQuota,
  getWorkloadStatusMessage,
} from '#~/concepts/distributedWorkloads/utils';
import { WorkloadOwnerType, WorkloadPodSet } from '#~/k8sTypes';
import { PodContainer } from '#~/types';

describe('getStatusInfo', () => {
  const testWorkloadStatus = (statusType: WorkloadStatusType | null, expectedMessage: string) => {
    const wl = mockWorkloadK8sResource({ k8sName: 'test-workload', mockStatus: statusType });
    const info = getStatusInfo(wl);
    expect(info).toEqual({
      ...WorkloadStatusColorAndIcon[statusType || WorkloadStatusType.Pending],
      status: statusType || WorkloadStatusType.Pending,
      message: expectedMessage,
    });
  };

  it('provides correct info for workloads of each status', () => {
    testWorkloadStatus(WorkloadStatusType.Pending, 'Waiting for resources');
    testWorkloadStatus(WorkloadStatusType.Inadmissible, 'The workload is inadmissible');
    testWorkloadStatus(WorkloadStatusType.Admitted, 'The workload is admitted');
    testWorkloadStatus(WorkloadStatusType.Running, 'The workload is running');
    testWorkloadStatus(WorkloadStatusType.Evicted, 'The workload is evicted');
    testWorkloadStatus(WorkloadStatusType.Succeeded, 'Job finished successfully');
    testWorkloadStatus(WorkloadStatusType.Failed, 'There was an error');
    testWorkloadStatus(null, 'No message'); // Falls back to Pending with no conditions
  });

  it('provides correct info for completed workload', () => {
    const wl = mockWorkloadK8sResource({ k8sName: 'test-workload' });
    const info = getStatusInfo(wl);
    expect(info.color).toBe('green');
    expect(info.message).toBe('Job finished successfully');
    expect(info.status).toBe('Succeeded');
  });
  it('should return "Finished" when status is Succeeded and message is "No message"', () => {
    const wl = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      mockStatusEmptyWorkload: true,
      mockStatus: WorkloadStatusType.Succeeded,
    });
    const info = getStatusInfo(wl);
    expect(getWorkloadStatusMessage(info)).toEqual('Finished');
  });
});

describe('getStatusCounts', () => {
  it('correctly aggregates counts of distributed workload statuses', () => {
    const workloads = [
      mockWorkloadK8sResource({
        k8sName: 'test-workload',
        mockStatus: WorkloadStatusType.Succeeded,
      }),
      mockWorkloadK8sResource({
        k8sName: 'test-workload-2',
        mockStatus: WorkloadStatusType.Running,
      }),
      mockWorkloadK8sResource({
        k8sName: 'test-workload-3',
        mockStatus: WorkloadStatusType.Running,
      }),
      mockWorkloadK8sResource({
        k8sName: 'test-workload-4',
        mockStatus: WorkloadStatusType.Inadmissible,
      }),
      mockWorkloadK8sResource({
        k8sName: 'test-workload-4',
        mockStatus: WorkloadStatusType.Admitted,
      }),
      mockWorkloadK8sResource({
        k8sName: 'test-workload-5',
        mockStatus: WorkloadStatusType.Pending,
      }),
      mockWorkloadK8sResource({ k8sName: 'test-workload-6', mockStatus: null }),
      mockWorkloadK8sResource({
        k8sName: 'test-workload-7',
        mockStatus: WorkloadStatusType.Evicted,
      }),
      mockWorkloadK8sResource({
        k8sName: 'test-workload-7',
        mockStatus: WorkloadStatusType.Failed,
      }),
    ];
    const statusCounts = getStatusCounts(workloads);
    expect(statusCounts).toEqual({
      Inadmissible: 1,
      Admitted: 1,
      Pending: 2,
      Running: 2,
      Evicted: 1,
      Succeeded: 1,
      Failed: 1,
    });
  });
});

describe('getWorkloadOwner', () => {
  it('returns the name of a job found in ownerReferences of a workload if present', () => {
    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-project',
      ownerKind: WorkloadOwnerType.Job,
      ownerName: 'test-job',
    });
    expect(getWorkloadOwner(mockWorkload)).toStrictEqual({ kind: 'Job', name: 'test-job' });
  });

  it('returns the name of a raycluster found in ownerReferences of a workload if present', () => {
    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-project',
      ownerKind: WorkloadOwnerType.RayCluster,
      ownerName: 'test-raycluster',
    });
    expect(getWorkloadOwner(mockWorkload)).toStrictEqual({
      kind: 'RayCluster',
      name: 'test-raycluster',
    });
  });

  it('returns undefined if there is no job in ownerReferences', () => {
    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-project',
    });
    expect(getWorkloadOwner(mockWorkload)).toBe(undefined);
  });
});

describe('getWorkloadRequestedResources', () => {
  it('correctly parses and adds up requested resources from workload podSets', () => {
    const mockContainer: PodContainer = {
      env: [],
      image: 'perl:5.34.0',
      imagePullPolicy: 'IfNotPresent',
      name: 'pi',
      resources: {
        requests: {
          cpu: '2',
          memory: '200Mi',
        },
      },
      terminationMessagePath: '/dev/termination-log',
      terminationMessagePolicy: 'File',
    };
    const mockPodset: WorkloadPodSet = {
      count: 5,
      minCount: 4,
      name: 'main',
      template: {
        metadata: {},
        spec: {
          containers: [mockContainer, mockContainer],
          dnsPolicy: 'ClusterFirst',
          restartPolicy: 'Never',
          schedulerName: 'default-scheduler',
          securityContext: {},
          terminationGracePeriodSeconds: 30,
        },
      },
    };
    const mockWorkload = mockWorkloadK8sResource({
      podSets: [mockPodset, mockPodset],
    });

    // 2 podsets, each with 5 pods, each with 2 containers, each requesting 2 CPUs and 200Mi memory
    expect(getWorkloadRequestedResources(mockWorkload)).toEqual({
      cpuCoresRequested: 2 * 5 * 2 * 2,
      memoryBytesRequested: 2 * 5 * 2 * 200 * 1024 * 1024,
    } satisfies WorkloadRequestedResources);
  });
});

describe('getQueueRequestedResources', () => {
  it('correctly parses and adds up requested resources from localQueues flavorsReservation', () => {
    const mockLocalQueues = [
      mockLocalQueueK8sResource({ name: 'test-localqueue-1' }),
      mockLocalQueueK8sResource({ name: 'test-localqueue-2' }),
      mockLocalQueueK8sResource({ name: 'test-localqueue-3' }),
    ];
    expect(getQueueRequestedResources(mockLocalQueues)).toEqual({
      cpuCoresRequested: 60,
      memoryBytesRequested: 32212254720,
    } satisfies WorkloadRequestedResources);
  });

  it('correctly parses and adds up requested resources from clusterQueues flavorsReservation', () => {
    const mockClusterQueues = [
      mockClusterQueueK8sResource({ name: 'test-clusterqueue-1' }),
      mockClusterQueueK8sResource({ name: 'test-clusterqueue-2' }),
    ];
    expect(getQueueRequestedResources(mockClusterQueues)).toEqual({
      cpuCoresRequested: 80,
      memoryBytesRequested: 42949672960,
    } satisfies WorkloadRequestedResources);
  });
});

describe('getTotalSharedQuota', () => {
  it('correctly parses and adds up total resources from clusterQueue resourceGroups', () => {
    const mockClusterQueues = [mockClusterQueueK8sResource({})];
    expect(getTotalSharedQuota(mockClusterQueues)).toEqual({
      cpuCoresRequested: 100,
      memoryBytesRequested: 68719476736,
    } satisfies WorkloadRequestedResources);
  });
  it('correctley parses and adds up total resources from multiple clusterQueues', () => {
    const mockClusterQueues = [
      mockClusterQueueK8sResource({ name: 'test-clusterqueue-1' }),
      mockClusterQueueK8sResource({ name: 'test-clusterqueue-2' }),
    ];
    expect(getTotalSharedQuota(mockClusterQueues)).toEqual({
      cpuCoresRequested: 200,
      memoryBytesRequested: 137438953472,
    } satisfies WorkloadRequestedResources);
  });
});
