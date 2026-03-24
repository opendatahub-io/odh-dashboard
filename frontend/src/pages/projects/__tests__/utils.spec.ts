import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { getPvcPercentageUsed } from '#~/pages/projects/utils';

const GIB_IN_BYTES = 1024 ** 3;

describe('getPvcPercentageUsed', () => {
  it('should calculate the percentage when pvc capacity is reported in gibibytes', () => {
    const pvc = mockPVCK8sResource({ storage: '5Gi' });

    expect(getPvcPercentageUsed(pvc, GIB_IN_BYTES)).toBe(20);
  });

  it('should convert the pvc capacity to gibibytes before calculating the percentage', () => {
    const pvc = mockPVCK8sResource({ storage: '1Ti' });

    expect(getPvcPercentageUsed(pvc, 512 * GIB_IN_BYTES)).toBe(50);
  });

  it('should fall back to the requested size when the pvc capacity is unavailable', () => {
    const pvc = mockPVCK8sResource({
      storage: '2Gi',
      status: {
        phase: 'Pending',
      },
    });

    expect(getPvcPercentageUsed(pvc, GIB_IN_BYTES)).toBe(50);
  });

  it('should return NaN when the usage metric is unavailable', () => {
    const pvc = mockPVCK8sResource({ storage: '2Gi' });

    expect(getPvcPercentageUsed(pvc, NaN)).toBeNaN();
  });

  it('should return NaN when the pvc size is zero', () => {
    const pvc = mockPVCK8sResource({ storage: '0Gi' });

    expect(getPvcPercentageUsed(pvc, GIB_IN_BYTES)).toBeNaN();
  });
});
