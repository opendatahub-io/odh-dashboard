import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import { WorkloadKind } from '#~/k8sTypes';
import { listWorkloads } from '#~/api/k8s/workloads';
import { WorkloadModel } from '#~/api/models/kueue';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<WorkloadKind>);

const mockedWorkload = mockWorkloadK8sResource({
  k8sName: 'test-workload',
  namespace: 'test-project',
});

describe('listWorkloads', () => {
  it('should fetch and return workloads', async () => {
    k8sListResourceItemsMock.mockResolvedValue([mockedWorkload]);
    const result = await listWorkloads('test-project');
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: WorkloadModel,
      queryOptions: { ns: 'test-project' },
    });
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockedWorkload]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));
    await expect(listWorkloads('test-project')).rejects.toThrow('error1');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: WorkloadModel,
      queryOptions: { ns: 'test-project' },
    });
  });
});
