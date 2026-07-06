import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { getEffectiveCapacityGiB, getPvcPercentageUsed } from '#~/pages/projects/utils';
import { getFullStatusFromPercentage } from '#~/pages/projects/screens/detail/storage/utils';

const GIB_IN_BYTES = 1024 ** 3;
const TIB_IN_BYTES = 1024 ** 4;

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

  it('should use prometheus capacity for shared storage (NFS)', () => {
    const pvc = mockPVCK8sResource({
      storage: '20Gi',
      status: {
        phase: 'Bound',
        accessModes: ['ReadWriteOnce'],
        capacity: { storage: '100Gi' },
      },
    });
    const promCapacity = 1.2 * TIB_IN_BYTES;
    const usedBytes = 686 * GIB_IN_BYTES;

    const result = getPvcPercentageUsed(pvc, usedBytes, promCapacity);
    expect(result).toBeCloseTo(55.86, 0);
  });

  it('should use pvc capacity when prometheus capacity is not available', () => {
    const pvc = mockPVCK8sResource({ storage: '10Gi' });

    expect(getPvcPercentageUsed(pvc, 5 * GIB_IN_BYTES, NaN)).toBe(50);
  });

  it('should use pvc capacity when prometheus capacity matches pvc capacity', () => {
    const pvc = mockPVCK8sResource({ storage: '10Gi' });

    expect(getPvcPercentageUsed(pvc, 5 * GIB_IN_BYTES, 10 * GIB_IN_BYTES)).toBe(50);
  });
});

describe('getEffectiveCapacityGiB', () => {
  it('should return pvc capacity for block storage', () => {
    const pvc = mockPVCK8sResource({ storage: '20Gi' });

    expect(getEffectiveCapacityGiB(pvc, 20 * GIB_IN_BYTES)).toBe(20);
  });

  it('should return prometheus capacity when it exceeds pvc capacity (shared storage)', () => {
    const pvc = mockPVCK8sResource({
      storage: '20Gi',
      status: {
        phase: 'Bound',
        accessModes: ['ReadWriteOnce'],
        capacity: { storage: '100Gi' },
      },
    });

    const result = getEffectiveCapacityGiB(pvc, 1.2 * TIB_IN_BYTES);
    expect(result).toBeCloseTo(1228.8, 0);
  });

  it('should return pvc capacity when prometheus capacity is NaN', () => {
    const pvc = mockPVCK8sResource({ storage: '20Gi' });

    expect(getEffectiveCapacityGiB(pvc, NaN)).toBe(20);
  });
});

describe('getFullStatusFromPercentage', () => {
  it('should return null when percentage is below 90', () => {
    expect(getFullStatusFromPercentage(50)).toBeNull();
    expect(getFullStatusFromPercentage(89.99)).toBeNull();
  });

  it('should return info when percentage is between 90 and 95', () => {
    expect(getFullStatusFromPercentage(90)).toBe('info');
    expect(getFullStatusFromPercentage(94.99)).toBe('info');
  });

  it('should return warning when percentage is between 95 and 100', () => {
    expect(getFullStatusFromPercentage(95)).toBe('warning');
    expect(getFullStatusFromPercentage(99.99)).toBe('warning');
  });

  it('should return error when percentage is 100 or above', () => {
    expect(getFullStatusFromPercentage(100)).toBe('error');
    expect(getFullStatusFromPercentage(100.5)).toBe('error');
    expect(getFullStatusFromPercentage(10984)).toBe('error');
  });

  it('should return null for NaN', () => {
    expect(getFullStatusFromPercentage(NaN)).toBeNull();
  });
});
