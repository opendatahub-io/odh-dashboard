import { deleteLegacyNIMDeployment } from '../delete';

describe('deleteLegacyNIMDeployment', () => {
  const pvc = { name: 'nim-cache', namespace: 'project' };

  it('should delete only the primary deployment when PVC deletion is not selected', async () => {
    const deletePrimaryDeployment = jest.fn().mockResolvedValue(undefined);
    const deletePVCResource = jest.fn();

    await deleteLegacyNIMDeployment({
      deletePrimaryDeployment,
      pvcToDelete: pvc,
      deletePVC: false,
      deletePVCResource,
    });

    expect(deletePrimaryDeployment).toHaveBeenCalledTimes(1);
    expect(deletePVCResource).not.toHaveBeenCalled();
  });

  it('should delete the PVC after the primary deployment succeeds', async () => {
    const calls: string[] = [];
    const deletePrimaryDeployment = jest.fn().mockImplementation(async () => {
      calls.push('primary');
    });
    const deletePVCResource = jest.fn().mockImplementation(async () => {
      calls.push('pvc');
      return { status: 'Success', message: '' };
    });

    await deleteLegacyNIMDeployment({
      deletePrimaryDeployment,
      pvcToDelete: pvc,
      deletePVC: true,
      deletePVCResource,
    });

    expect(calls).toEqual(['primary', 'pvc']);
    expect(deletePVCResource).toHaveBeenCalledWith('nim-cache', 'project');
  });

  it('should not delete the PVC when the primary deployment fails', async () => {
    const deletePrimaryDeployment = jest.fn().mockRejectedValue(new Error('primary failed'));
    const deletePVCResource = jest.fn();

    await expect(
      deleteLegacyNIMDeployment({
        deletePrimaryDeployment,
        pvcToDelete: pvc,
        deletePVC: true,
        deletePVCResource,
      }),
    ).rejects.toThrow('primary failed');

    expect(deletePVCResource).not.toHaveBeenCalled();
  });

  it('should surface a failed PVC deletion status', async () => {
    const deletePVCResource = jest.fn().mockResolvedValue({
      status: 'Failure',
      message: 'forbidden',
    });

    await expect(
      deleteLegacyNIMDeployment({
        deletePrimaryDeployment: jest.fn().mockResolvedValue(undefined),
        pvcToDelete: pvc,
        deletePVC: true,
        deletePVCResource,
      }),
    ).rejects.toThrow('forbidden');
  });
});
