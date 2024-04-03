import { mockWorkloadK8sResource } from '~/__mocks__/mockWorkloadK8sResource';
import {
  getWorkloadOwnerJobName,
  WorkloadStatusColorAndIcon,
  WorkloadStatusType,
  getStatusCounts,
  getStatusInfo,
  getWorkloadRequestedResources,
  WorkloadRequestedResources,
} from '~/concepts/distributedWorkloads/utils';
import { WorkloadPodSet } from '~/k8sTypes';
import { PodContainer } from '~/types';

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

describe('getWorkloadOwnerJobName', () => {
  it('returns the name of the job found in ownerReferences of a workload if present', () => {
    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-project',
      ownerJobName: 'test-job',
    });
    expect(getWorkloadOwnerJobName(mockWorkload)).toBe('test-job');
  });

  it('returns undefined if there is no job in ownerReferences', () => {
    const mockWorkload = mockWorkloadK8sResource({
      k8sName: 'test-workload',
      namespace: 'test-project',
    });
    expect(getWorkloadOwnerJobName(mockWorkload)).toBe(undefined);
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
