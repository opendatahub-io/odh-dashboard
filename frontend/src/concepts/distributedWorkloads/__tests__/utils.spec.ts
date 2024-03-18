import { mockWorkloadK8sResource } from '~/__mocks__/mockWorkloadK8sResource';
import { getStatusInfo } from '~/concepts/distributedWorkloads/utils';

describe('getStatusInfo', () => {
  it('provides correct info for completed workload', () => {
    const wl = mockWorkloadK8sResource({ k8sName: 'test-workload' });
    const info = getStatusInfo(wl);
    expect(info?.color).toBe('green');
    expect(info?.message).toBe('Job finished successfully');
    expect(info?.status).toBe('Succeeded');
  });
});
